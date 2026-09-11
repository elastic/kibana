/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleExecutionCancellationError } from '../../execution_context';
import {
  RULE_EXECUTION_REASONS,
  STEP_EXECUTION_REASONS,
  type RuleExecutionReason,
} from './execution_reason';
import { getFailedStep } from './failed_step';

const failureReason = Symbol('AlertingRuleExecutionFailureReason');

interface ReasonTaggedError extends Error {
  [failureReason]?: RuleExecutionReason;
}

/**
 * Reason published for a run that ended by throwing: the code owned by the
 * step that raised the error, unless something more specific applies.
 *
 * A timeout outranks whatever was in flight when the signal fired, so the
 * cancellation check comes first. A {@link tagFailureReason} tag then wins over
 * the step, being the more precise of the two. Errors that reach the task
 * runner untagged report no reason.
 *
 * A step missing from {@link STEP_EXECUTION_REASONS} falls back to
 * `unexpected_error` rather than reporting nothing, since the step did throw.
 * `execution_reason.test.ts` is what keeps that fallback unreachable.
 */
export const resolveReasonForError = (error: unknown): RuleExecutionReason | undefined => {
  if (isRuleExecutionCancellationError(error)) {
    return RULE_EXECUTION_REASONS.CANCELLED_TIMEOUT;
  }

  if (error instanceof Error && (error as ReasonTaggedError)[failureReason] !== undefined) {
    return (error as ReasonTaggedError)[failureReason];
  }

  const failedStep = getFailedStep(error);

  if (failedStep === undefined) {
    return undefined;
  }

  return STEP_EXECUTION_REASONS[failedStep] ?? RULE_EXECUTION_REASONS.UNEXPECTED_ERROR;
};

/**
 * When a rule execution fails, the error is tagged with the step that failed,
 * which is enough to pick a reason code for most failures.
 *
 * Some steps own several codes, so the step alone cannot pick the right one.
 * For example, `classify_absent_groups` covers both `no_data_failed` and
 * `recovery_query_failed`, which `detectDataPresence` and `executeRecoveryQuery`
 * set themselves via this function.
 *
 * Tagging with the published code rather than an internal name is deliberate:
 * these operations are finer than a step, so there is no entry in
 * {@link STEP_EXECUTION_REASONS} to translate them.
 */
export const tagFailureReason = <T>(error: T, reason: RuleExecutionReason): T => {
  if (error instanceof Error && (error as ReasonTaggedError)[failureReason] === undefined) {
    (error as ReasonTaggedError)[failureReason] = reason;
  }

  return error;
};
