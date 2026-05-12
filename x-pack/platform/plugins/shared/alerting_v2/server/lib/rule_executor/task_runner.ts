/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';

import type { HaltReason, RuleExecutorTaskParams } from './types';
import { RuleExecutionPipeline, type RuleExecutionPipelineResult } from './execution_pipeline';
import { RuleExecutionObserverHub } from './events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { isRuleExecutionCancellationError } from '../execution_context';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleExecutorTaskRunner {
  /**
   * The task runner owns the per-execution identity (`executionUuid`) and
   * the execution-boundary lifecycle events (`execution_started` plus one
   * of `execution_completed` / `execution_failed` / `execution_cancelled`).
   *
   * Per-step events are emitted by middlewares (`LifecycleEmitterMiddleware`,
   * `CancellationBoundaryMiddleware`) and by steps/services themselves;
   * observers — `TelemetryObserver` today, audit / tracing / debug-trace
   * tomorrow — register on the {@link RuleExecutionObserverHub} and consume
   * whichever event kinds they care about. The task runner itself is
   * unaware of any specific observer.
   */
  constructor(
    @inject(RuleExecutionPipeline) private readonly pipeline: RuleExecutionPipeline,
    @inject(RuleExecutionObserverHub) private readonly observerHub: RuleExecutionObserverHub,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const params = taskInstance.params as RuleExecutorTaskParams;
    const scheduledAt = this.getScheduledAtISOString(
      taskInstance.scheduledAt,
      taskInstance.startedAt
    );
    const executionUuid = uuidV4();
    const start = new Date();

    this.observerHub.emit({
      kind: 'execution_started',
      executionUuid,
      ruleId: params.ruleId,
      spaceId: params.spaceId,
      scheduledAt,
      at: start,
    });

    let result: RuleExecutionPipelineResult | undefined;
    let thrown: unknown;

    try {
      result = await this.pipeline.execute({
        ruleId: params.ruleId,
        spaceId: params.spaceId,
        scheduledAt,
        executionUuid,
        abortSignal: abortController.signal,
      });
      return this.buildRunResult(result, taskInstance);
    } catch (error) {
      thrown = error;
      throw error;
    } finally {
      this.emitTerminalEvent({ executionUuid, start, result, error: thrown });
    }
  }

  private emitTerminalEvent(args: {
    executionUuid: string;
    start: Date;
    result: RuleExecutionPipelineResult | undefined;
    error: unknown;
  }): void {
    const { executionUuid, start, result, error } = args;
    const end = new Date();
    const durationMs = Math.max(0, end.getTime() - start.getTime());
    const finalState = result?.finalState;

    if (error != null) {
      if (isRuleExecutionCancellationError(error)) {
        this.observerHub.emit({
          kind: 'execution_cancelled',
          executionUuid,
          at: end,
          reason: 'cancelled_timeout',
          durationMs,
          finalState,
        });
        return;
      }

      this.observerHub.emit({
        kind: 'execution_failed',
        executionUuid,
        at: end,
        error,
        durationMs,
        finalState,
      });
      return;
    }

    if (result == null) {
      // Defensive: try succeeded but result is undefined (would only happen
      // if buildRunResult threw before assigning). Treat as a failure with
      // no specific reason.
      this.observerHub.emit({
        kind: 'execution_failed',
        executionUuid,
        at: end,
        error: new Error('pipeline returned no result'),
        durationMs,
      });
      return;
    }

    this.observerHub.emit({
      kind: 'execution_completed',
      executionUuid,
      at: end,
      finalState: result.finalState,
      durationMs,
      haltReason: result.completed ? undefined : result.haltReason,
    });
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
}
