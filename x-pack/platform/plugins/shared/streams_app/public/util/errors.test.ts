/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedError, getTaskErrorMessage } from './errors';

describe('getFormattedError', () => {
  it('returns original error when body.message is not present', () => {
    const error = new Error('Original error');
    expect(getFormattedError(error)).toBe(error);
  });

  it('extracts message from body when present', () => {
    const error = Object.assign(new Error('Original'), {
      body: { message: 'Body message' },
    });
    const result = getFormattedError(error);
    expect(result.message).toBe('Body message');
  });

  it('returns original error when body is not an object', () => {
    const error = Object.assign(new Error('Original'), {
      body: 'not an object',
    });
    expect(getFormattedError(error)).toBe(error);
  });

  it('returns original error when body.message is not a string', () => {
    const error = Object.assign(new Error('Original'), {
      body: { message: 123 },
    });
    expect(getFormattedError(error)).toBe(error);
  });
});

describe('getTaskErrorMessage', () => {
  it('returns the string directly when error is a string', () => {
    expect(getTaskErrorMessage('Task failed due to timeout')).toBe('Task failed due to timeout');
  });

  it('returns empty string when error is an empty string', () => {
    expect(getTaskErrorMessage('')).toBe('');
  });

  it('extracts message from Error object', () => {
    const error = new Error('Something went wrong');
    expect(getTaskErrorMessage(error)).toBe('Something went wrong');
  });

  it('extracts message from Error subclass', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const error = new CustomError('Custom error message');
    expect(getTaskErrorMessage(error)).toBe('Custom error message');
  });

  it('converts null to string', () => {
    expect(getTaskErrorMessage(null)).toBe('null');
  });

  it('converts undefined to string', () => {
    expect(getTaskErrorMessage(undefined)).toBe('undefined');
  });

  it('converts number to string', () => {
    expect(getTaskErrorMessage(404)).toBe('404');
  });

  it('converts object to string', () => {
    expect(getTaskErrorMessage({ code: 'ERR_TIMEOUT' })).toBe('[object Object]');
  });

  it('converts boolean to string', () => {
    expect(getTaskErrorMessage(false)).toBe('false');
  });

  it('handles TypeError', () => {
    const error = new TypeError('Cannot read property');
    expect(getTaskErrorMessage(error)).toBe('Cannot read property');
  });

  it('handles Error with empty message', () => {
    const error = new Error('');
    expect(getTaskErrorMessage(error)).toBe('');
  });
});
