/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleExecutionCancellationError } from '../../execution_context';
import type {
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from '../execution_pipeline';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { resolveReasonForError } from './failure_reason';
import { getRunReport } from './run_report';
import { resolveStatusForResult, type TaskRunStatus } from './status';

/** The part of the pipeline input that is safe to report. */
type RunIdentity = Pick<RuleExecutionPipelineInput, 'ruleId' | 'spaceId'>;

/**
 * A run ends exactly one of two ways, so exactly one of `result` / `error` is
 * supplied. The union rejects both and neither at compile time; the throw in
 * {@link buildTaskRunEventFields} is the backstop for untyped callers.
 */
export type TaskRunEventFieldsParams = { input: RunIdentity } & (
  | { result: RuleExecutionPipelineResult; error?: never }
  | { error: unknown; result?: never }
);

/** What a finished run reports about itself, before it is given field names. */
interface RunOutcome {
  readonly status: TaskRunStatus;
  /**
   * Why a run did not simply succeed: its `HaltReason`, the step that threw,
   * or a `RULE_EXECUTION_FAILURE_REASONS` code. Unset on success.
   */
  readonly reason?: string;
  /** Absent when the run ended before `fetch_rule` populated state. */
  readonly ruleVersion?: number;
  readonly counters?: Readonly<Record<string, number>>;
}

/**
 * Mirrors the counter catalog onto `metrics.<counterName>` fields, using the
 * catalog names verbatim so there is one naming system rather than two.
 * Adding a counter to {@link RULE_EXECUTION_COUNTERS} surfaces it here with no
 * change to this function.
 *
 * Every catalog counter is written, defaulting to zero, so that all runs share
 * one document shape.
 */
const buildMetricFields = (counters: Readonly<Record<string, number>>): Record<string, number> =>
  Object.fromEntries(
    Object.values(RULE_EXECUTION_COUNTERS).map((counter) => [
      `metrics.${counter}`,
      counters[counter] ?? 0,
    ])
  );

/**
 * Presence is tested with `in` rather than against `undefined` so that a
 * `throw undefined` still reports as a failure instead of looking like a
 * caller that passed nothing.
 */
const resolveOutcome = (params: TaskRunEventFieldsParams): RunOutcome => {
  if ('result' in params && params.result !== undefined) {
    const { result } = params;

    return {
      status: resolveStatusForResult(result),
      reason: result.haltReason,
      ruleVersion: result.finalState.rule?.metadata.version,
      counters: result.metrics.counters,
    };
  }

  if ('error' in params) {
    const report = getRunReport(params.error);

    return {
      status: isRuleExecutionCancellationError(params.error) ? 'timeout' : 'failed',
      reason: resolveReasonForError(params.error),
      ruleVersion: report?.ruleVersion,
      counters: report?.counters,
    };
  }

  // This should never happen, but we need to satisfy the type checker.
  throw new Error('buildTaskRunEventFields requires either a result or an error');
};

/**
 * Projects a finished run onto the custom fields of Task Manager's `task-run`
 * event log document, and is the only place that knows how they are spelled.
 *
 * Callers hand over the run as it ended — `result` when the pipeline returned,
 * `error` when it threw — and the status and reason are derived here, so a
 * caller needs to know only which of the two happened.
 *
 * Metrics are appended last, after the fields that identify the run. Task
 * Manager drops the whole payload when it exceeds its size limit rather than
 * trimming it, so the tail is where a future cap can shed fields without
 * costing a run its status.
 *
 * Never include user-authored rule content (query, name, tags):
 * `kibana.task.data` is readable without rule-level privileges.
 */
export const buildTaskRunEventFields = (
  params: TaskRunEventFieldsParams
): Record<string, unknown> => {
  const { status, reason, ruleVersion, counters } = resolveOutcome(params);

  return {
    status,
    ...(reason != null ? { reason } : {}),
    'rule.id': params.input.ruleId,
    'rule.spaceId': params.input.spaceId,
    ...(ruleVersion != null ? { 'rule.version': ruleVersion } : {}),
    ...(counters != null ? buildMetricFields(counters) : {}),
  };
};
