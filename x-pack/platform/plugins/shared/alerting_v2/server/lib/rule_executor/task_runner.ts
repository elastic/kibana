/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';

import type { RuleExecutionInput, HaltReason, RuleExecutorTaskParams } from './types';
import { RuleExecutionPipeline, type PipelineResult } from './execution_pipeline';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  constructor(@inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipeline) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const input = this.createRuleExecutionInput(taskInstance, abortController);

    const result = await this.pipeline.execute(input);

    return this.buildRunResult(result, taskInstance);
  }

  /**
   * Creates execution input for the pipeline.
   */
  private createRuleExecutionInput(
    taskInstance: TaskRunParams['taskInstance'],
    abortController: AbortController
  ): RuleExecutionInput {
    const params = taskInstance.params as RuleExecutorTaskParams;
    const scheduledAt = taskInstance.scheduledAt;

    return {
      ruleId: params.ruleId,
      // TODO: Implement rule versioning. For now, use 1 as a placeholder.
      // The version should increment when the rule definition changes.
      ruleVersion: 1,
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
    result: PipelineResult,
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
