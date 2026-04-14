/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';

import type { HaltReason, RuleExecutorTaskParams, RuleExecutionInput } from './types';
import type {
  RuleExecutionPipelineContract,
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from './execution_pipeline';
import { RuleExecutionPipeline } from './execution_pipeline';
import {
  ExecutionEventLoggerToken,
  type ExecutionEventLoggerContract,
} from '../services/execution_event_logger';
import { createExecutionContext } from '../execution_context';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipelineContract,
    @inject(ExecutionEventLoggerToken)
    private readonly executionEventLogger: ExecutionEventLoggerContract
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const pipelineInput = this.createRuleExecutionInput(taskInstance, abortController);
    const executionInput: RuleExecutionInput = {
      ...pipelineInput,
      executionContext: createExecutionContext(pipelineInput.abortSignal),
    };
    const startTime = Date.now();

    let result: RuleExecutionPipelineResult;
    let executionError: Error | undefined;

    try {
      result = await this.pipeline.execute(pipelineInput);
    } catch (error) {
      executionError = error;
      result = {
        completed: false,
        finalState: { input: executionInput },
      };
    }

    const durationMs = Date.now() - startTime;

    this.logExecutionEvent(pipelineInput, result, durationMs, executionError);

    if (executionError) {
      throw executionError;
    }

    return this.buildRunResult(result, taskInstance);
  }

  private logExecutionEvent(
    input: RuleExecutionPipelineInput,
    result: RuleExecutionPipelineResult,
    durationMs: number,
    error?: Error
  ): void {
    const { activeEpisodeCount } = result.finalState;
    const outcome = result.completed ? 'success' : 'failure';

    this.executionEventLogger.logExecution({
      ruleId: input.ruleId,
      spaceId: input.spaceId,
      scheduledAt: input.scheduledAt,
      outcome,
      durationMs,
      message: error ? `rule execution failed: ${error.message}` : `rule executed: ${input.ruleId}`,
      errorMessage: error?.message,
      metrics: result.completed && activeEpisodeCount != null ? { activeEpisodeCount } : null,
    });
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
      case 'rule_deleted':
      case 'rule_disabled':
        return taskInstance.state ?? {};
      default:
        return {};
    }
  }
}
