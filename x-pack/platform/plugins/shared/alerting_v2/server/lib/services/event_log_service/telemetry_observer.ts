/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { isRuleExecutionCancellationError } from '../../execution_context';
import {
  isStepExecutionError,
  type StepExecutionError,
} from '../../rule_executor/middleware/step_execution_error';
import type { RuleExecutionEvent, RuleExecutionObserver } from '../../rule_executor/events';
import { ExecutionMetricsCollector } from '../../rule_executor/metrics';
import type { RulePipelineState } from '../../rule_executor/types';
import { EventLogServiceToken } from './tokens';
import type { EventLogServiceContract } from './event_log_service';
import type { RuleAttributesSnapshot, RuleExecuteLogInput } from './rule_executor_log_inputs';
import { mapOutcome } from './map_outcome';

interface RunState {
  readonly start: Date;
  readonly ruleId: string;
  readonly spaceId: string;
  readonly collector: ExecutionMetricsCollector;
}

/**
 * First concrete observer of the rule-execution event stream.
 *
 * Responsibilities:
 *  - On `execution_started`: write the `execute-start` beacon to event_log
 *    and start a per-execution {@link ExecutionMetricsCollector}.
 *  - On domain events (`batch_processed`, `query_executed`,
 *    `alert_event_stored`, `episode_transitioned`, etc.): tally into the
 *    matching collector.
 *  - On a terminal lifecycle event (`execution_completed`,
 *    `execution_failed`, `execution_cancelled`): map outcome → (status,
 *    reason), snapshot the collector, write the `execute` event-log
 *    document, and drop the per-execution state.
 *
 * Per-execution state lives in a `Map<executionUuid, RunState>`. The
 * pipeline guarantees exactly one terminal event per `execution_started`,
 * so the map cannot leak across executions.
 *
 * Errors thrown here are caught by the {@link RuleExecutionObserverHub}
 * and never propagate back to the rule execution.
 */
@injectable()
export class TelemetryObserver implements RuleExecutionObserver {
  public readonly name = 'telemetry_observer';

  private readonly runs = new Map<string, RunState>();

  constructor(@inject(EventLogServiceToken) private readonly eventLog: EventLogServiceContract) {}

  public onEvent(event: RuleExecutionEvent): void {
    switch (event.kind) {
      case 'execution_started':
        return this.handleExecutionStarted(event);

      case 'execution_completed':
      case 'execution_failed':
      case 'execution_cancelled':
        return this.handleTerminal(event);

      case 'step_cancelled':
        return this.handleStepCancelled(event);

      case 'batch_processed':
        return this.run(event.executionUuid)?.collector.recordBatch();

      case 'query_executed': {
        const run = this.run(event.executionUuid);
        run?.collector.recordSearch({
          esTookMs: event.esTookMs,
          durationMs: event.durationMs,
          rowCount: event.rowCount,
        });
        return;
      }

      case 'alert_event_stored':
        return this.run(event.executionUuid)?.collector.recordEventWritten(event.status);

      case 'episode_transitioned':
        return this.run(event.executionUuid)?.collector.recordEpisodeTransition(event.transition);

      case 'recovery_mode_selected':
        return this.run(event.executionUuid)?.collector.recordRecoveryMode(event.mode);

      case 'recovery_event_built':
        return this.run(event.executionUuid)?.collector.recordRecoveryEvent();

      case 'step_started':
      case 'step_completed':
        // No metrics derived from these today. Future per-step duration
        // metrics would land here.
        return;
    }
  }

  private handleExecutionStarted(
    event: Extract<RuleExecutionEvent, { kind: 'execution_started' }>
  ): void {
    const start = event.at;
    this.runs.set(event.executionUuid, {
      start,
      ruleId: event.ruleId,
      spaceId: event.spaceId,
      collector: new ExecutionMetricsCollector(),
    });

    this.eventLog.logRuleExecuteStart({
      executionUuid: event.executionUuid,
      ruleId: event.ruleId,
      spaceId: event.spaceId,
      start,
    });
  }

  private handleStepCancelled(
    event: Extract<RuleExecutionEvent, { kind: 'step_cancelled' }>
  ): void {
    const run = this.run(event.executionUuid);
    run?.collector.recordCancellation({ step: event.step, reason: event.reason });
  }

  private handleTerminal(
    event: Extract<
      RuleExecutionEvent,
      { kind: 'execution_completed' | 'execution_failed' | 'execution_cancelled' }
    >
  ): void {
    const run = this.runs.get(event.executionUuid);
    if (run == null) {
      return;
    }

    try {
      const finalState = 'finalState' in event ? event.finalState : undefined;
      const haltReason = event.kind === 'execution_completed' ? event.haltReason : undefined;
      const error = event.kind === 'execution_failed' ? event.error : undefined;
      const cancelled = event.kind === 'execution_cancelled';

      const { status, reason } = mapOutcome({ haltReason, error, cancelled });

      const summary: RuleExecuteLogInput = {
        executionUuid: event.executionUuid,
        ruleId: run.ruleId,
        spaceId: run.spaceId,
        start: run.start,
        end: event.at,
        status,
        reason,
        error: error != null ? toErrorPayload(error) : undefined,
        metrics: run.collector.snapshot(),
        rule: extractRuleAttributes(finalState),
      };

      this.eventLog.logRuleExecute(summary);
    } finally {
      this.runs.delete(event.executionUuid);
    }
  }

  private run(executionUuid: string): RunState | undefined {
    return this.runs.get(executionUuid);
  }
}

const extractRuleAttributes = (
  finalState: RulePipelineState | undefined
): RuleAttributesSnapshot | undefined => {
  if (finalState?.rule == null) {
    return undefined;
  }

  const { rule } = finalState;
  const queries = collectRuleQueries(rule);

  return {
    id: rule.id,
    name: rule.metadata?.name,
    kind: rule.kind,
    tags: rule.metadata?.tags,
    ...(queries.length > 0 ? { query: queries } : {}),
  };
};

const collectRuleQueries = (rule: {
  evaluation?: { query?: { base?: string } };
  recovery_policy?: { query?: { base?: string } };
}): string[] => {
  const queries: string[] = [];
  if (rule.evaluation?.query?.base) {
    queries.push(rule.evaluation.query.base);
  }
  if (rule.recovery_policy?.query?.base) {
    queries.push(rule.recovery_policy.query.base);
  }
  return queries;
};

const toErrorPayload = (error: unknown): { message: string; stackTrace?: string } => {
  if (isRuleExecutionCancellationError(error)) {
    return { message: error.message, stackTrace: error.stack };
  }
  if (isStepExecutionError(error)) {
    return unwrapStepError(error);
  }
  if (error instanceof Error) {
    return { message: error.message, stackTrace: error.stack };
  }
  return { message: String(error) };
};

const unwrapStepError = (error: StepExecutionError): { message: string; stackTrace?: string } => {
  const cause = error.cause;
  if (cause instanceof Error) {
    return { message: cause.message, stackTrace: cause.stack };
  }
  return { message: error.message, stackTrace: error.stack };
};
