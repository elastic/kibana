/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';

import type { HaltReason, RuleExecutorTaskParams } from './types';
import type {
  RuleExecutionPipelineContract,
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from './execution_pipeline';
import { RuleExecutionPipeline } from './execution_pipeline';
import {
  RuleExecutionStatusWriterToken,
  type RuleExecutionStatusWriterContract,
} from '../services/rule_execution_status_writer';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipelineContract,
    @inject(RuleExecutionStatusWriterToken)
    private readonly ruleExecutionStatusWriter: RuleExecutionStatusWriterContract
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const input = this.createRuleExecutionInput(taskInstance, abortController);

    const startMs = Date.now();
    let result: RuleExecutionPipelineResult | undefined;
    let executionError: Error | undefined;

    try {
      result = await this.pipeline.execute(input);
    } catch (err) {
      executionError = err instanceof Error ? err : new Error(String(err));
    }

    const endMs = Date.now();
    await this.recordExecution(input, result, endMs, endMs - startMs, executionError);

    if (executionError) {
      throw executionError;
    }

    return this.buildRunResult(result!, taskInstance);
  }

  /**
   * Persists `last_execution` on the rule SO so the rules list can show/sort/
   * filter by the latest run outcome.
   *
   * Best-effort: the writer swallows and logs its own errors, but we also
   * double-guard here so any unexpected throw cannot turn a successful rule
   * run into a failed task.
   */
  private async recordExecution(
    input: RuleExecutionPipelineInput,
    result: RuleExecutionPipelineResult | undefined,
    endMs: number,
    durationMs: number,
    error?: Error
  ): Promise<void> {
    const outcome: 'success' | 'failure' = !error && result?.completed ? 'success' : 'failure';
    const message = error
      ? `rule execution failed: ${error.message}`
      : `rule executed: ${input.ruleId}`;

    try {
      await this.ruleExecutionStatusWriter.writeExecutionStatus({
        ruleId: input.ruleId,
        outcome,
        timestamp: new Date(endMs).toISOString(),
        durationMs,
        message,
        errorMessage: error?.message ?? null,
      });
    } catch {
      // Writer already swallows + logs; belt-and-braces guard so execution
      // completion never depends on SO write success.
    }
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
