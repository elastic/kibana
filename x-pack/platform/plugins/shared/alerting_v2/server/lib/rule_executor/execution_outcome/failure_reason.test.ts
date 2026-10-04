/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EXECUTION_REASONS } from './execution_reason';
import { resolveReasonForError, tagFailureReason } from './failure_reason';
import { tagFailedStep } from './failed_step';
import { RuleExecutionCancellationError } from '../../execution_context';

describe('resolveReasonForError', () => {
  it.each([
    ['execute_rule_query', RULE_EXECUTION_REASONS.QUERY_FAILED],
    ['director', RULE_EXECUTION_REASONS.DIRECTOR_FAILED],
    ['store_alert_events', RULE_EXECUTION_REASONS.STORE_FAILED],
    ['fetch_rule', RULE_EXECUTION_REASONS.UNEXPECTED_ERROR],
  ])('publishes a failure in %s as %s', (step, reason) => {
    expect(resolveReasonForError(tagFailedStep(new Error('boom'), step))).toBe(reason);
  });

  it('publishes unexpected_error for a step that owns no code', () => {
    const error = tagFailedStep(new Error('boom'), 'step_added_without_a_reason');

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_REASONS.UNEXPECTED_ERROR);
  });

  it('returns undefined for an untagged error', () => {
    expect(resolveReasonForError(new Error('boom'))).toBeUndefined();
  });

  it('returns undefined for a non-Error throw', () => {
    expect(resolveReasonForError('boom')).toBeUndefined();
  });

  it('maps a cancellation to cancelled_timeout', () => {
    expect(resolveReasonForError(new RuleExecutionCancellationError())).toBe(
      RULE_EXECUTION_REASONS.CANCELLED_TIMEOUT
    );
  });

  it('prefers cancelled_timeout over the step that was in flight', () => {
    const error = tagFailedStep(new RuleExecutionCancellationError(), 'execute_rule_query');

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_REASONS.CANCELLED_TIMEOUT);
  });

  it('prefers a tagged reason over the code owned by the step', () => {
    const error = tagFailureReason(new Error('boom'), RULE_EXECUTION_REASONS.NO_DATA_FAILED);

    // The middleware tags the enclosing step after the failing operation tagged itself.
    tagFailedStep(error, 'classify_absent_groups');

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_REASONS.NO_DATA_FAILED);
  });
});

describe('tagFailureReason', () => {
  it('returns the original error instance', () => {
    const error = new Error('boom');

    expect(tagFailureReason(error, RULE_EXECUTION_REASONS.RECOVERY_QUERY_FAILED)).toBe(error);
    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_REASONS.RECOVERY_QUERY_FAILED);
  });

  it('keeps the first reason when tagged twice', () => {
    const error = tagFailureReason(new Error('boom'), RULE_EXECUTION_REASONS.NO_DATA_FAILED);
    tagFailureReason(error, RULE_EXECUTION_REASONS.RECOVERY_QUERY_FAILED);

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_REASONS.NO_DATA_FAILED);
  });

  it('passes through a non-Error throw', () => {
    expect(tagFailureReason('boom', RULE_EXECUTION_REASONS.NO_DATA_FAILED)).toBe('boom');
  });
});
