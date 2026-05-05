/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepNameFromError, identifyErrorWithStepName } from './step_error';

describe('step_error', () => {
  it('records a non-enumerable step name on an Error and exposes it via the getter', () => {
    const error = new Error('boom');

    identifyErrorWithStepName(error, 'execute_rule_query');

    expect(getStepNameFromError(error)).toBe('execute_rule_query');
    expect(Object.keys(error)).not.toContain('__alertingV2RuleExecutorStepName');
  });

  it('preserves the first step name when called twice', () => {
    const error = new Error('boom');

    identifyErrorWithStepName(error, 'execute_rule_query');
    identifyErrorWithStepName(error, 'store_alert_events');

    expect(getStepNameFromError(error)).toBe('execute_rule_query');
  });

  it('returns the error unchanged for non-object values', () => {
    expect(identifyErrorWithStepName(undefined, 'x')).toBeUndefined();
    expect(identifyErrorWithStepName(null, 'x')).toBeNull();
    expect(identifyErrorWithStepName('a string', 'x')).toBe('a string');
  });

  it('returns undefined when the error has no step name recorded', () => {
    expect(getStepNameFromError(new Error('plain'))).toBeUndefined();
    expect(getStepNameFromError(undefined)).toBeUndefined();
    expect(getStepNameFromError('string')).toBeUndefined();
  });
});
