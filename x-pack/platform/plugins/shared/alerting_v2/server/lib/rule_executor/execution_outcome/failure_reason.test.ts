/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EXECUTION_FAILURE_REASONS,
  resolveReasonForError,
  tagFailureReason,
} from './failure_reason';
import { tagFailedStep } from './failed_step';
import { RuleExecutionCancellationError } from '../../execution_context';

describe('resolveReasonForError', () => {
  it.each(['execute_rule_query', 'director', 'store_alert_events', 'fetch_rule'])(
    'reports a failure in %s as the step name',
    (step) => {
      expect(resolveReasonForError(tagFailedStep(new Error('boom'), step))).toBe(step);
    }
  );

  it('returns undefined for an untagged error', () => {
    expect(resolveReasonForError(new Error('boom'))).toBeUndefined();
  });

  it('returns undefined for a non-Error throw', () => {
    expect(resolveReasonForError('boom')).toBeUndefined();
  });

  it('maps a cancellation to cancelled_timeout', () => {
    expect(resolveReasonForError(new RuleExecutionCancellationError())).toBe(
      RULE_EXECUTION_FAILURE_REASONS.CANCELLED_TIMEOUT
    );
  });

  it('prefers cancelled_timeout over the step that was in flight', () => {
    const error = tagFailedStep(new RuleExecutionCancellationError(), 'execute_rule_query');

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_FAILURE_REASONS.CANCELLED_TIMEOUT);
  });

  it('prefers a tagged reason over the step name', () => {
    const error = tagFailureReason(new Error('boom'), RULE_EXECUTION_FAILURE_REASONS.NO_DATA_QUERY);

    // The middleware tags the enclosing step after the failing operation tagged itself.
    tagFailedStep(error, 'classify_absent_groups');

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_FAILURE_REASONS.NO_DATA_QUERY);
  });
});

describe('tagFailureReason', () => {
  it('returns the original error instance', () => {
    const error = new Error('boom');

    expect(tagFailureReason(error, RULE_EXECUTION_FAILURE_REASONS.RECOVERY_QUERY)).toBe(error);
    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_FAILURE_REASONS.RECOVERY_QUERY);
  });

  it('keeps the first reason when tagged twice', () => {
    const error = tagFailureReason(new Error('boom'), RULE_EXECUTION_FAILURE_REASONS.NO_DATA_QUERY);
    tagFailureReason(error, RULE_EXECUTION_FAILURE_REASONS.RECOVERY_QUERY);

    expect(resolveReasonForError(error)).toBe(RULE_EXECUTION_FAILURE_REASONS.NO_DATA_QUERY);
  });

  it('passes through a non-Error throw', () => {
    expect(tagFailureReason('boom', RULE_EXECUTION_FAILURE_REASONS.NO_DATA_QUERY)).toBe('boom');
  });
});
