/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConflictError, isNotFoundError } from './es_error_utils';

describe('isConflictError', () => {
  it('returns true when top-level statusCode is 409', () => {
    expect(isConflictError({ statusCode: 409 })).toBe(true);
  });

  it('returns true when meta statusCode is 409', () => {
    expect(isConflictError({ meta: { statusCode: 409 } })).toBe(true);
  });

  it('returns false when status codes are not 409', () => {
    expect(isConflictError({ statusCode: 400, meta: { statusCode: 500 } })).toBe(false);
  });

  it('returns false for unknown error shapes', () => {
    expect(isConflictError(new Error('boom'))).toBe(false);
    expect(isConflictError(undefined)).toBe(false);
    expect(isConflictError(null)).toBe(false);
  });
});

describe('isNotFoundError', () => {
  it('returns true when top-level statusCode is 404', () => {
    expect(isNotFoundError({ statusCode: 404 })).toBe(true);
  });

  it('returns true when meta statusCode is 404', () => {
    expect(isNotFoundError({ meta: { statusCode: 404 } })).toBe(true);
  });

  it('returns true when meta status is 404', () => {
    expect(isNotFoundError({ meta: { status: 404 } })).toBe(true);
  });

  it('returns false when status codes are not 404', () => {
    expect(isNotFoundError({ statusCode: 400, meta: { statusCode: 500 } })).toBe(false);
  });

  it('returns false for unknown error shapes', () => {
    expect(isNotFoundError(new Error('boom'))).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});
