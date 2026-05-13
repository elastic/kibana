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
import type { IEvent } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';

import type { HaltReason, RuleExecutorTaskParams } from './types';
import type {
  RuleExecutionPipelineContract,
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from './execution_pipeline';
import { RuleExecutionPipeline } from './execution_pipeline';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RULE_EXECUTOR_EVENT_ACTIONS } from './constants';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EventLogServiceToken) private readonly eventLogService: EventLogServiceContract
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const input = this.createRuleExecutionInput(taskInstance, abortController);
    const params = taskInstance.params as RuleExecutorTaskParams;
    const executionUuid = uuidV4();
    const startTime = Date.now();
    const startTimeIso = new Date(startTime).toISOString();
    const scheduleDelay = taskInstance.startedAt
      ? startTime - new Date(taskInstance.scheduledAt ?? taskInstance.startedAt).getTime()
      : 0;

    this.emitExecuteStart({
      executionUuid,
      timestamp: startTimeIso,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
    });

    let result: RuleExecutionPipelineResult;
    let executionError: Error | undefined;

    try {
      result = await this.pipeline.execute(input);
    } catch (err) {
      executionError = err instanceof Error ? err : new Error(String(err));
      result = {
        completed: false,
        finalState: { input: { ...input, executionContext: undefined as never } },
      };
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    this.emitExecute({
      executionUuid,
      startTimeIso,
      endTimeIso: new Date(endTime).toISOString(),
      durationNs: durationMs * 1_000_000,
      scheduleDelayNs: scheduleDelay * 1_000_000,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      result,
      error: executionError,
    });

    if (executionError) {
      throw executionError;
    }

    return this.buildRunResult(result, taskInstance);
  }

  /**
   * Creates execution input for the pipeline.
   */
  private createRuleExecutionInput(
    taskInstance: TaskRunParams['taskInstance'],
    abortController: AbortController
  ): RuleExecutionPipelineInput {
    const params = taskInstance.params as RuleExecutorTaskParams;
    const scheduledAt = taskInstance.scheduledAt;

    return {
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      scheduledAt: this.getScheduledAtISOString(scheduledAt, taskInstance.startedAt),
      abortSignal: abortController.signal,
    };
  }

  private getScheduledAtISOString(scheduledAt?: Date | string, startedAt?: Date | null): string {
    if (typeof scheduledAt === 'string') {
      return scheduledAt;
    }

    if (startedAt instanceof Date) {
      return startedAt.toISOString();
    }

    return new Date().toISOString();
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

  private emitExecuteStart({
    executionUuid,
    timestamp,
    ruleId,
    spaceId,
  }: {
    executionUuid: string;
    timestamp: string;
    ruleId: string;
    spaceId: string;
  }): void {
    const event: IEvent = {
      '@timestamp': timestamp,
      event: {
        action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE_START,
        kind: 'event',
      },
      kibana: {
        saved_objects: [
          {
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            rel: SAVED_OBJECT_REL_PRIMARY,
            namespace: spaceId === 'default' ? undefined : spaceId,
          },
        ],
        space_ids: [spaceId],
        alerting_v2: {
          rule_executor: {
            execution: {
              uuid: executionUuid,
            },
          },
        },
      },
    };

    this.eventLogService.logEvent(event);
  }

  private emitExecute({
    executionUuid,
    startTimeIso,
    endTimeIso,
    durationNs,
    scheduleDelayNs,
    ruleId,
    spaceId,
    result,
    error,
  }: {
    executionUuid: string;
    startTimeIso: string;
    endTimeIso: string;
    durationNs: number;
    scheduleDelayNs: number;
    ruleId: string;
    spaceId: string;
    result: RuleExecutionPipelineResult;
    error?: Error;
  }): void {
    const status = this.deriveExecutionStatus(result, error);
    const outcome = status === 'success' ? 'success' : 'failure';
    const alertEvents = result.finalState.alertEventsBatch ?? [];
    const breachedCount = alertEvents.filter((e) => e.status === 'breached').length;
    const recoveredCount = alertEvents.filter((e) => e.status === 'recovered').length;
    const rowCount = result.finalState.esqlRowBatch?.length ?? 0;

    const event: IEvent = {
      '@timestamp': endTimeIso,
      event: {
        action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE,
        kind: 'event',
        start: startTimeIso,
        end: endTimeIso,
        duration: String(durationNs),
        outcome,
        ...(result.haltReason ? { reason: result.haltReason } : {}),
      },
      ...(error ? { error: { message: error.message } } : {}),
      ...(status !== 'success'
        ? { message: error?.message ?? `Rule execution ${status}` }
        : { message: 'Rule executed successfully' }),
      kibana: {
        saved_objects: [
          {
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            rel: SAVED_OBJECT_REL_PRIMARY,
            namespace: spaceId === 'default' ? undefined : spaceId,
          },
        ],
        space_ids: [spaceId],
        task: {
          schedule_delay: scheduleDelayNs,
        },
        alerting_v2: {
          rule_executor: {
            execution: {
              uuid: executionUuid,
              status,
              metrics: {
                query: {
                  total_search_duration_ms: 0,
                  number_of_rows_returned: rowCount,
                },
                events_written: {
                  breached: breachedCount,
                  recovered: recoveredCount,
                },
              },
            },
          },
        },
      },
    };

    this.eventLogService.logEvent(event);
  }

  private deriveExecutionStatus(
    result: RuleExecutionPipelineResult,
    error?: Error
  ): 'success' | 'warning' | 'failed' | 'timeout' | 'skipped' {
    if (error) {
      return 'failed';
    }
    if (result.completed) {
      return 'success';
    }
    switch (result.haltReason) {
      case 'rule_deleted':
      case 'rule_disabled':
        return 'skipped';
      case 'state_not_ready':
        return 'warning';
      default:
        return 'failed';
    }
  }
}
