/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';

import type { HaltReason } from './types';
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

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'signal' | 'executionUuid'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({ taskInstance, signal, executionUuid }: TaskRunParams): Promise<RunResult> {
    const input = this.createRuleExecutionInput(taskInstance, signal, executionUuid);

    const result = await this.pipeline.execute(input);

    return this.buildRunResult(result, input.logger, taskInstance);
  }

  /**
   * Creates execution input for the pipeline.
   */
  private createRuleExecutionInput(
    taskInstance: TaskRunParams['taskInstance'],
    signal: AbortSignal,
    executionUuid: string
  ): RuleExecutionPipelineInput {
    const params = taskInstance.params as { ruleId: string; spaceId: string };
    const spaceId = brandSpaceId(params.spaceId);
    const scheduledAt = taskInstance.scheduledAt;
    const logger = this.logger.forSubsystem('ruleExecutor').withLabels({
      rule_id: params.ruleId,
      space_id: spaceId,
      task_id: taskInstance.id,
      execution_id: executionUuid,
    });

    return {
      ruleId: params.ruleId,
      spaceId,
      scheduledAt: this.getScheduledAtISOString(scheduledAt, taskInstance.startedAt),
      abortSignal: signal,
      executionUuid,
      logger,
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
    logger: LoggerServiceContract,
    taskInstance: TaskRunParams['taskInstance']
  ): RunResult {
    if (result.completed) {
      return { state: {} };
    }

    if (result.haltReason === 'rule_deleted') {
      logger.debug({ message: 'Rule no longer exists; task will be removed' });
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
