/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessage } from './get_error_message';

describe('getErrorMessage', () => {
  it('returns a string error as-is', () => {
    expect(getErrorMessage('something went wrong')).toBe('something went wrong');
  });

  it('returns an empty string as-is', () => {
    expect(getErrorMessage('')).toBe('');
  });

  it('extracts message from an Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('extracts message from an Error subclass', () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'CustomError';
      }
    }
    expect(getErrorMessage(new CustomError('custom'))).toBe('custom');
  });

  it('extracts message from a plain object with a string message property', () => {
    expect(getErrorMessage({ message: 'plain object error' })).toBe('plain object error');
  });

  it('falls back to String() for a plain object with a non-string message', () => {
    expect(getErrorMessage({ message: 123 })).toBe('[object Object]');
  });

  it('falls back to String() for a number', () => {
    expect(getErrorMessage(42)).toBe('42');
  });

  it('falls back to String() for null', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('falls back to String() for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('falls back to String() for a boolean', () => {
    expect(getErrorMessage(false)).toBe('false');
  });

  it('falls back to String() for an object without a message property', () => {
    expect(getErrorMessage({ code: 'ERR' })).toBe('[object Object]');
  });
});
