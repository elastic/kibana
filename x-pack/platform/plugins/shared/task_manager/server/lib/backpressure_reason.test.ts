/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getBackpressureReason } from './backpressure_reason';
import { BulkUpdateError, MsearchError } from './errors';

describe('getBackpressureReason()', () => {
  test('classifies cluster_block_exception before anything else', () => {
    expect(
      getBackpressureReason(
        new BulkUpdateError({
          statusCode: 403,
          message: 'blocked',
          type: 'cluster_block_exception',
        })
      )
    ).toBe('cluster_block');
  });

  test('classifies too many requests errors', () => {
    expect(
      getBackpressureReason(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'))
    ).toBe('too_many_requests');
    expect(getBackpressureReason(new MsearchError(429))).toBe('too_many_requests');
    expect(
      getBackpressureReason(new BulkUpdateError({ statusCode: 429, type: 'too_many_requests' }))
    ).toBe('too_many_requests');
  });

  test('classifies ES unavailable errors', () => {
    expect(
      getBackpressureReason(
        SavedObjectsErrorHelpers.decorateEsUnavailableError(new Error('unavailable'))
      )
    ).toBe('es_unavailable');
  });

  test('classifies "cannot execute [inline] scripts" errors', () => {
    const scriptError = new Error('cannot execute [inline] scripts error') as Error & {
      meta: unknown;
    };
    scriptError.meta = {
      body: { error: { caused_by: { reason: 'cannot execute [inline] scripts' } } },
    };
    expect(getBackpressureReason(scriptError)).toBe('script_error');
  });

  test('classifies msearch and bulk 5xx errors', () => {
    expect(getBackpressureReason(new MsearchError(503))).toBe('msearch_5xx');
    expect(
      getBackpressureReason(new BulkUpdateError({ statusCode: 500, type: 'server_error' }))
    ).toBe('bulk_5xx');
  });

  test('returns null for errors Task Manager does not back off on', () => {
    expect(getBackpressureReason(new Error('some unrelated error'))).toBeNull();
  });
});
