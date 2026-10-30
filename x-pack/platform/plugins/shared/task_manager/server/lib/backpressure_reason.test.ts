/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getBackpressureReason } from './backpressure_reason';
import { BulkUpdateError, MsearchError } from './errors';
import { createEsResponseError } from '../test_utils';

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

  describe('raw Elasticsearch client errors', () => {
    test.each([
      [429, 'too_many_requests'],
      [503, 'es_unavailable'],
      [500, 'general_error'],
      [502, 'general_error'],
      [504, 'general_error'],
    ])('classifies a response error with status %s as %s', (statusCode, reason) => {
      expect(getBackpressureReason(createEsResponseError(statusCode))).toBe(reason);
    });

    test.each([400, 401, 403, 404, 409, 413])(
      'returns null for a response error with status %s',
      (statusCode) => {
        expect(getBackpressureReason(createEsResponseError(statusCode))).toBeNull();
      }
    );

    test.each([
      ['TimeoutError', new errors.TimeoutError('Request timed out')],
      ['ConnectionError', new errors.ConnectionError('connect ECONNREFUSED')],
      [
        'NoLivingConnectionsError',
        new errors.NoLivingConnectionsError(
          'There are no living connections',
          elasticsearchServiceMock.createApiResponse()
        ),
      ],
    ])('classifies a %s as es_unavailable', (_name, error) => {
      expect(getBackpressureReason(error)).toBe('es_unavailable');
    });

    test('returns null for an aborted request', () => {
      expect(getBackpressureReason(new errors.RequestAbortedError('Request aborted'))).toBeNull();
    });

    test('classifies a cluster_block_exception response as cluster_block', () => {
      expect(getBackpressureReason(createEsResponseError(403, 'cluster_block_exception'))).toBe(
        'cluster_block'
      );
    });

    test('classifies a "cannot execute [inline] scripts" response as script_error', () => {
      const scriptError = new errors.ResponseError(
        elasticsearchServiceMock.createApiResponse({
          statusCode: 400,
          body: {
            error: {
              type: 'illegal_argument_exception',
              caused_by: { reason: 'cannot execute [inline] scripts' },
            },
          },
        })
      );
      expect(getBackpressureReason(scriptError)).toBe('script_error');
    });
  });
});
