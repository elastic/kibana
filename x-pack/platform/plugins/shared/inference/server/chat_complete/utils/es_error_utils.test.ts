/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConflictError } from './es_error_utils';

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
