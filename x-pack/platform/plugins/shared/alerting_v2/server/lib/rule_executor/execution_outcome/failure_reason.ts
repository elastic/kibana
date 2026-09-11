/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleExecutionCancellationError } from '../../execution_context';
import { getFailedStep } from './failed_step';

/**
 * Codes written to `kibana.task.data.reason` that are not simply the name of
 * the step that failed.
 *
 * Everything else passes through as-is: a clean stop reports its `HaltReason`,
 * and a throw reports the name of the step that raised it. Keeping the
 * vocabulary derived from the pipeline rather than a hand-maintained mapping
 * means a new step or halt reason is reportable without touching this file.
 *
 * `reason` is unset on successful runs.
 */
export const RULE_EXECUTION_FAILURE_REASONS = {
  /** The recovery query threw - finer than the enclosing step. */
  RECOVERY_QUERY: 'recovery_query',
  /** The no-data query threw - finer than the enclosing step. */
  NO_DATA_QUERY: 'no_data_query',
  /** The task timeout fired, whatever was in flight at the time. */
  CANCELLED_TIMEOUT: 'cancelled_timeout',
} as const;

export type RuleExecutionFailureReason =
  (typeof RULE_EXECUTION_FAILURE_REASONS)[keyof typeof RULE_EXECUTION_FAILURE_REASONS];

const failureReason = Symbol('AlertingRuleExecutionFailureReason');

interface ReasonTaggedError extends Error {
  [failureReason]?: RuleExecutionFailureReason;
}

/**
 * Reason for a run that ended by throwing: the name of the step that raised
 * the error, unless something more specific applies.
 *
 * A timeout outranks whatever was in flight when the signal fired, so the
 * cancellation check comes first. A {@link tagFailureReason} tag then wins over
 * the step name, being the more precise of the two. Errors that reach the task
 * runner untagged report no reason.
 */
export const resolveReasonForError = (error: unknown): string | undefined => {
  if (isRuleExecutionCancellationError(error)) {
    return RULE_EXECUTION_FAILURE_REASONS.CANCELLED_TIMEOUT;
  }

  if (error instanceof Error && (error as ReasonTaggedError)[failureReason] !== undefined) {
    return (error as ReasonTaggedError)[failureReason];
  }

  return getFailedStep(error);
};

/**
 * When a rule execution fails, the error is tagged with the step that failed.
 * This is used to determine the reason code when logging the failure in the event log.
 * Sometimes the step name alone cannot pick the right code, because one step owns several codes.
 * For example, `classify_absent_groups` owns two reason codes, which `detectDataPresence` and
 * `executeRecoveryQuery` set themselves via {@link tagFailureReason}.
 *
 * For scenarios like this, the error can be tagged directly with the reason code for the failure.
 */
export const tagFailureReason = <T>(error: T, reason: RuleExecutionFailureReason): T => {
  if (error instanceof Error && (error as ReasonTaggedError)[failureReason] === undefined) {
    (error as ReasonTaggedError)[failureReason] = reason;
  }

  return error;
};
