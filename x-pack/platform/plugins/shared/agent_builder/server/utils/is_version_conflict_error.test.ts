/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionConflictError } from './is_version_conflict_error';

describe('isVersionConflictError', () => {
  it('returns true for an error with a 409 status code', () => {
    const error = Object.assign(new Error('version_conflict_engine_exception'), {
      meta: { statusCode: 409 },
    });

    expect(isVersionConflictError(error)).toBe(true);
  });

  it('returns true for an error with a top-level 409 status code', () => {
    const error = Object.assign(new Error('version conflict'), { statusCode: 409 });

    expect(isVersionConflictError(error)).toBe(true);
  });

  it('returns false for an error with another status code', () => {
    const error = Object.assign(new Error('not found'), {
      meta: { statusCode: 404 },
    });

    expect(isVersionConflictError(error)).toBe(false);
  });

  it('returns false for an error without a status code', () => {
    expect(isVersionConflictError(new Error('boom'))).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isVersionConflictError(undefined)).toBe(false);
    expect(isVersionConflictError(null)).toBe(false);
    expect(isVersionConflictError('conflict')).toBe(false);
  });
});
