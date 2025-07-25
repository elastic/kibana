/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult, DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { kibanaResponseFactory, type KibanaResponseFactory } from '@kbn/core/server';
import { errorHandler } from './error_handler';

const createApiResponseError = ({
  statusCode = 200,
  headers = {},
  body = {},
}: {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: DiagnosticResult['body'];
} = {}): TransportResult => {
  return {
    body,
    statusCode,
    headers,
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  };
};

describe('errorHandler', () => {
  let response: KibanaResponseFactory;

  beforeEach(() => {
    response = kibanaResponseFactory;
  });

  describe('incoming error is KibanaServerError', () => {
    it('should return bad request response if it is bad request error', () => {
      const res = errorHandler(
        response,
        new errors.ResponseError(createApiResponseError({ statusCode: 400 }))
      );
      expect(res.status).toBe(400);
    });

    it('should return the cause for a bad request if available for bad request error', () => {
      const res = errorHandler(
        response,
        new errors.ResponseError(
          createApiResponseError({
            body: {
              message: 'Response Error',
              error: {
                root_cause: [
                  {
                    type: 'illegal_argument_exception',
                    reason: 'root cause',
                  },
                  {
                    type: 'illegal_argument_exception',
                    reason: 'deep root cause',
                  },
                ],
                caused_by: {
                  type: 'illegal_argument_exception',
                  reason: 'first caused by',
                  caused_by: {
                    type: 'illegal_argument_exception',
                    reason: 'second caused by',
                  },
                },
              },
            },
            statusCode: 400,
          })
        )
      );
      expect(res.status).toBe(400);
      expect(res.payload.message).toBe('deep root cause');
    });

    it('should return a forbidden response if it is unauthorized error', () => {
      const res = errorHandler(
        response,
        new errors.ResponseError(createApiResponseError({ statusCode: 401 }))
      );
      expect(res.status).toBe(403);
    });

    it('should return a not found response if it is not found error', () => {
      const res = errorHandler(
        response,
        new errors.ResponseError(createApiResponseError({ statusCode: 404 }))
      );
      expect(res.status).toBe(404);
    });

    it('should return a custom error if it is custom error', () => {
      const res = errorHandler(
        response,
        new errors.ResponseError(
          createApiResponseError({ statusCode: 500, body: { message: 'Custom error' } })
        )
      );
      expect(res.status).toBe(500);
      expect(res.payload.includes('Custom error')).toBe(true);
    });
  });

  describe('incoming error is not a KibanaServerError', () => {
    it('throws original error if it is not KibanaServerError', () => {
      try {
        errorHandler(response, new Error('This is not a KibanaServerError'));
      } catch (e) {
        expect(e.message).toBe('This is not a KibanaServerError');
      }
    });
  });
});
