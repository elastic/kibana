/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';

import type { HaltReason, RuleExecutorTaskParams } from './types';
import type {
  RuleExecutionPipelineContract,
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from './execution_pipeline';
import { RuleExecutionPipeline } from './execution_pipeline';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import {
  RuleExecutorEventLogger,
  type ExecuteSummaryInput,
  type RuleExecutionRuleAttributes,
} from './execution_event_logger';
import {
  RULE_EXECUTION_REASONS_THROWN,
  RULE_EXECUTION_STATUSES,
  type RuleExecutionReason,
  type RuleExecutionStatus,
} from './constants';
import { getStepNameFromError } from './step_error';
import {
  RuleExecutionMetricsCollector,
  type RuleExecutionMetricsSnapshot,
} from './metrics_collector';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

const HALT_REASON_TO_STATUS: Record<HaltReason, RuleExecutionStatus> = {
  rule_deleted: RULE_EXECUTION_STATUSES.FAILED,
  rule_disabled: RULE_EXECUTION_STATUSES.FAILED,
  state_not_ready: RULE_EXECUTION_STATUSES.FAILED,
};

const STEP_NAME_TO_REASON: Record<string, RuleExecutionReason> = {
  execute_rule_query: RULE_EXECUTION_REASONS_THROWN.QUERY_FAILED,
  create_recovery_events: RULE_EXECUTION_REASONS_THROWN.RECOVERY_QUERY_FAILED,
  store_alert_events: RULE_EXECUTION_REASONS_THROWN.STORE_FAILED,
  director: RULE_EXECUTION_REASONS_THROWN.DIRECTOR_FAILED,
};

@injectable()
export class RuleExecutorTaskRunner {
  private readonly eventLogger: RuleExecutorEventLogger;

  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipelineContract,
    @inject(EventLogServiceToken) eventLogService: EventLogServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {
    this.eventLogger = new RuleExecutorEventLogger(eventLogService);
  }

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const params = taskInstance.params as RuleExecutorTaskParams;
    const executionUuid = uuidV4();
    const startedAt = new Date();
    const task = this.buildTaskAttributes(taskInstance);
    const metrics = new RuleExecutionMetricsCollector();

    this.eventLogger.logExecuteStart({
      executionUuid,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      startedAt,
      task,
    });

    const input = this.createRuleExecutionInput(
      taskInstance,
      abortController,
      executionUuid,
      metrics
    );

    let result: RuleExecutionPipelineResult;
    try {
      result = await this.pipeline.execute(input);
    } catch (error) {
      this.emitExecuteOnError({
        executionUuid,
        params,
        startedAt,
        task,
        error,
        aborted: abortController.signal.aborted,
        metrics: metrics.snapshot(),
      });
      throw error;
    }

    this.emitExecuteOnComplete({
      executionUuid,
      params,
      startedAt,
      task,
      result,
      metrics: metrics.snapshot(),
    });

    return this.buildRunResult(result, taskInstance);
  }

  private buildTaskAttributes(taskInstance: TaskRunParams['taskInstance']): {
    id: string;
    scheduled: Date;
  } {
    return {
      id: taskInstance.id,
      scheduled: this.getScheduledAtDate(taskInstance.scheduledAt, taskInstance.startedAt),
    };
  }

  private emitExecuteOnComplete({
    executionUuid,
    params,
    startedAt,
    task,
    result,
    metrics,
  }: {
    executionUuid: string;
    params: RuleExecutorTaskParams;
    startedAt: Date;
    task: { id: string; scheduled: Date };
    result: RuleExecutionPipelineResult;
    metrics: RuleExecutionMetricsSnapshot;
  }): void {
    const endedAt = new Date();
    const ruleAttrs = extractRuleAttributes(result, params.ruleId);

    if (result.completed) {
      this.eventLogger.logExecute({
        executionUuid,
        ruleId: params.ruleId,
        spaceId: params.spaceId,
        startedAt,
        endedAt,
        task,
        status: 'success',
        rule: ruleAttrs,
        metrics,
      });
      return;
    }

    const haltReason = result.haltReason;
    const status: RuleExecutionStatus = haltReason
      ? HALT_REASON_TO_STATUS[haltReason]
      : RULE_EXECUTION_STATUSES.FAILED;
    const reason: RuleExecutionReason | undefined = haltReason ?? undefined;

    this.eventLogger.logExecute({
      executionUuid,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      startedAt,
      endedAt,
      task,
      status,
      reason,
      rule: ruleAttrs,
      metrics,
    });
  }

  private emitExecuteOnError({
    executionUuid,
    params,
    startedAt,
    task,
    error,
    aborted,
    metrics,
  }: {
    executionUuid: string;
    params: RuleExecutorTaskParams;
    startedAt: Date;
    task: { id: string; scheduled: Date };
    error: unknown;
    aborted: boolean;
    metrics: RuleExecutionMetricsSnapshot;
  }): void {
    const endedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const stepName = getStepNameFromError(error);
    const stepReason = stepName ? STEP_NAME_TO_REASON[stepName] : undefined;

    const summary: ExecuteSummaryInput = {
      executionUuid,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      startedAt,
      endedAt,
      task,
      metrics,
      ...(aborted
        ? {
            status: RULE_EXECUTION_STATUSES.TIMEOUT,
            reason: RULE_EXECUTION_REASONS_THROWN.CANCELLED_TIMEOUT,
            cancelled: stepName ? { step: stepName, reason: 'timeout' } : { reason: 'timeout' },
          }
        : {
            status: RULE_EXECUTION_STATUSES.FAILED,
            ...(stepReason ? { reason: stepReason } : {}),
          }),
      error: { message, stackTrace },
    };

    this.eventLogger.logExecute(summary);
  }

  /**
   * Creates execution input for the pipeline.
   */
  private createRuleExecutionInput(
    taskInstance: TaskRunParams['taskInstance'],
    abortController: AbortController,
    executionUuid: string,
    metrics: RuleExecutionMetricsCollector
  ): RuleExecutionPipelineInput {
    const params = taskInstance.params as RuleExecutorTaskParams;
    const scheduledAt = taskInstance.scheduledAt;

    return {
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      scheduledAt: this.getScheduledAtISOString(scheduledAt, taskInstance.startedAt),
      abortSignal: abortController.signal,
      executionUuid,
      metrics,
    };
  }

  private getScheduledAtISOString(scheduledAt?: Date | string, startedAt?: Date | null): string {
    return this.getScheduledAtDate(scheduledAt, startedAt).toISOString();
  }

  private getScheduledAtDate(scheduledAt?: Date | string, startedAt?: Date | null): Date {
    if (scheduledAt instanceof Date) {
      return scheduledAt;
    }

    if (typeof scheduledAt === 'string') {
      return new Date(scheduledAt);
    }

    if (startedAt instanceof Date) {
      return startedAt;
    }

    return new Date();
  }

  /**
   * Translate pipeline result to task manager state.
   */
  private buildRunResult(
    result: RuleExecutionPipelineResult,
    taskInstance: TaskRunParams['taskInstance']
  ): RunResult {
    if (result.completed) {
      return { state: {} };
    }

    if (result.haltReason === 'rule_deleted') {
      const params = taskInstance.params as RuleExecutorTaskParams;
      this.logger.debug({
        message: `Rule "${params.ruleId}" in the "${params.spaceId}" space no longer exists. Its corresponding task will be removed by Task Manager.`,
      });
      throwUnrecoverableError(new Error('Rule no longer exists'));
    }

    return { state: this.getStateForHaltReason(taskInstance, result.haltReason) };
  }

  /**
   * Map domain halt reasons to task manager state.
   */
  private getStateForHaltReason(
    taskInstance: TaskRunParams['taskInstance'],
    reason?: HaltReason
  ): Record<string, unknown> {
    switch (reason) {
      case 'rule_disabled':
        return taskInstance.state ?? {};
      default:
        return {};
    }
  }
}

function extractRuleAttributes(
  result: RuleExecutionPipelineResult,
  ruleId: string
): RuleExecutionRuleAttributes | undefined {
  const rule = result.finalState.rule;
  if (!rule) {
    return undefined;
  }

  const queries: string[] = [];
  const evaluationQuery = rule.evaluation?.query?.base?.trim();
  if (evaluationQuery) {
    queries.push(evaluationQuery);
  }
  if (rule.recovery_policy?.type === 'query') {
    const recoveryQuery = rule.recovery_policy.query?.base?.trim();
    if (recoveryQuery) {
      queries.push(recoveryQuery);
    }
  }

  return {
    id: ruleId,
    name: rule.metadata.name,
    kind: rule.kind,
    tags: rule.metadata.tags,
    ...(queries.length > 0 ? { query: queries } : {}),
  };
}
