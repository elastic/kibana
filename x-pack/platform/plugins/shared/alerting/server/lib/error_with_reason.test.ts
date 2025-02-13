/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorWithReason, getReasonFromError, isErrorWithReason } from './error_with_reason';
import { RuleExecutionStatusErrorReasons } from '../types';

describe('ErrorWithReason', () => {
  const plainError = new Error('well, actually');
  const errorWithReason = new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, plainError);

  test('ErrorWithReason class', () => {
    expect(errorWithReason.message).toBe(plainError.message);
    expect(errorWithReason.error).toBe(plainError);
    expect(errorWithReason.reason).toBe(RuleExecutionStatusErrorReasons.Decrypt);
  });

  test('getReasonFromError()', () => {
    expect(getReasonFromError(plainError)).toBe('unknown');
    expect(getReasonFromError(errorWithReason)).toBe(RuleExecutionStatusErrorReasons.Decrypt);
  });

  test('isErrorWithReason()', () => {
    expect(isErrorWithReason(plainError)).toBe(false);
    expect(isErrorWithReason(errorWithReason)).toBe(true);
  });
});
