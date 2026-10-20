/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors, type DiagnosticResult } from '@elastic/elasticsearch';

import type { CommonResponseStatusSchema } from '../api_schemas/common';
import type { ResetTransformsResponseSchema } from '../api_schemas/reset_transforms';

import { isRequestTimeout, fillResultsWithTimeouts, getErrorBody } from './error_utils';

describe('isRequestTimeout', () => {
  it('returns true for a request timeout error without a result object', () => {
    expect(isRequestTimeout(new EsErrors.TimeoutError('Request timed out'))).toBe(true);
  });

  it('returns true for a request timeout error carrying a result object', () => {
    const error = new EsErrors.TimeoutError('Request timed out', {} as DiagnosticResult);

    expect(isRequestTimeout(error)).toBe(true);
  });

  it('returns false for ES response errors', () => {
    const error = new EsErrors.ResponseError({} as DiagnosticResult);

    expect(isRequestTimeout(error)).toBe(false);
  });

  it('returns false for other client errors', () => {
    expect(isRequestTimeout(new EsErrors.ConnectionError('connection error'))).toBe(false);
  });

  it('returns false for plain errors', () => {
    expect(isRequestTimeout(new Error('boom'))).toBe(false);
  });
});

describe('getErrorBody', () => {
  it('returns the ES error body when present', () => {
    const esError = { type: 'resource_not_found_exception', reason: 'not found' };
    const error = { meta: { body: { error: esError } } };

    expect(getErrorBody(error)).toBe(esError);
  });

  it('builds a fallback body for errors without an ES error body', () => {
    expect(getErrorBody(new EsErrors.ConnectionError('connection reset'))).toEqual({
      type: 'error',
      reason: 'connection reset',
      root_cause: [],
      caused_by: {},
      response: {},
    });
  });

  it('builds a serializable fallback body for errors with circular fields', () => {
    const error = new Error('connection reset') as Error & { meta?: Record<string, unknown> };
    error.meta = {};
    error.meta.self = error.meta;

    expect(getErrorBody(error)).toEqual({
      type: 'error',
      reason: 'connection reset',
      root_cause: [],
      caused_by: {},
      response: {},
    });
    expect(() => JSON.stringify(getErrorBody(error))).not.toThrow();
  });
});

describe('fillResultsWithTimeouts', () => {
  it('fills unprocessed items with timeout errors and keeps existing results', () => {
    const results = fillResultsWithTimeouts({
      results: { 'transform-1': { success: true } },
      id: 'transform-2',
      items: [{ id: 'transform-1' }, { id: 'transform-2' }, { id: 'transform-3' }],
      action: 'start',
    }) as CommonResponseStatusSchema;

    expect(results['transform-1']).toEqual({ success: true });
    expect(results['transform-2'].success).toBe(false);
    expect(results['transform-2'].error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].success).toBe(false);
    expect(results['transform-3'].error?.reason).toMatch(/timed out/);
  });

  it('fills unprocessed items with nested timeout results when a result factory is provided', () => {
    const results = fillResultsWithTimeouts({
      results: {
        'transform-1': { transformReset: { success: true } },
      } as ResetTransformsResponseSchema,
      id: 'transform-2',
      items: [{ id: 'transform-1' }, { id: 'transform-2' }, { id: 'transform-3' }],
      action: 'reset',
      getResult: (error) => ({ transformReset: { success: false, error } }),
    });

    expect(results['transform-1']).toEqual({ transformReset: { success: true } });
    expect(results['transform-2'].transformReset.success).toBe(false);
    expect(results['transform-2'].transformReset.error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].transformReset.success).toBe(false);
    expect(results['transform-3'].transformReset.error?.reason).toMatch(/timed out/);
  });
});
