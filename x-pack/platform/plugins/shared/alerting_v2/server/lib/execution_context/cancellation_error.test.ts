/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionCancellationError,
  isRuleExecutionCancellationError,
} from './cancellation_error';

describe('RuleExecutionCancellationError', () => {
  it('creates error with default message', () => {
    const error = new RuleExecutionCancellationError();

    expect(error.message).toBe('Rule execution aborted');
    expect(error.name).toBe('RuleExecutionCancellationError');
    expect(error.code).toBe('rule_execution_aborted');
  });

  it('creates error with custom message', () => {
    const error = new RuleExecutionCancellationError('Custom abort reason');

    expect(error.message).toBe('Custom abort reason');
  });

  it('creates error with cause', () => {
    const cause = new Error('underlying error');
    const error = new RuleExecutionCancellationError(undefined, { cause });

    expect(error.cause).toBe(cause);
  });

  it('is an instance of Error', () => {
    const error = new RuleExecutionCancellationError();

    expect(error).toBeInstanceOf(Error);
  });
});

describe('isRuleExecutionCancellationError', () => {
  it('returns true for RuleExecutionCancellationError instances', () => {
    const error = new RuleExecutionCancellationError();

    expect(isRuleExecutionCancellationError(error)).toBe(true);
  });

  it('returns true for objects with matching code', () => {
    const error = { code: 'rule_execution_aborted', message: 'aborted' };

    expect(isRuleExecutionCancellationError(error)).toBe(true);
  });

  it('returns false for regular errors', () => {
    const error = new Error('some error');

    expect(isRuleExecutionCancellationError(error)).toBe(false);
  });

  it('returns false for objects with different code', () => {
    const error = { code: 'some_other_code' };

    expect(isRuleExecutionCancellationError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRuleExecutionCancellationError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRuleExecutionCancellationError(undefined)).toBe(false);
  });

  it('returns false for primitive values', () => {
    expect(isRuleExecutionCancellationError('error')).toBe(false);
    expect(isRuleExecutionCancellationError(42)).toBe(false);
  });
});
