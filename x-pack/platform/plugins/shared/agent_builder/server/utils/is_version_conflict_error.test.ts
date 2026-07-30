/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isVersionConflictError } from './is_version_conflict_error';

describe('isVersionConflictError', () => {
  it('returns true for a 409 Elasticsearch response error', () => {
    const error = new errors.ResponseError({
      statusCode: 409,
      body: { error: { type: 'version_conflict_engine_exception' }, status: 409 },
      headers: {},
      warnings: [],
      meta: {} as never,
    });

    expect(isVersionConflictError(error)).toBe(true);
  });

  it('returns false for a response error with another status code', () => {
    const error = new errors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'not_found_exception' }, status: 404 },
      headers: {},
      warnings: [],
      meta: {} as never,
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
