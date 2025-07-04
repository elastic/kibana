/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, unauthorized } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { isAuthError, handleAuthError } from './auth_errors';

describe('Error handling for 401/403 errors', () => {
  it('ignores an unknown type', () => {
    const err = new Error();
    expect(isAuthError(err)).toBe(false);
  });

  describe('Boom errors', () => {
    it('handles Forbidden Error defined by Boom', () => {
      const err = forbidden();
      expect(isAuthError(err)).toBe(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).toBe('Insufficient user permissions for monitoring data');
      expect(wrappedErr.isBoom).toBe(true);
      expect(wrappedErr.isServer).toBe(false);
      expect(wrappedErr.data).toBe(null);
      expect(wrappedErr.output).toEqual({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient user permissions for monitoring data',
        },
        headers: {},
      });
    });

    it('handles Unauthorized Error defined by Boom', () => {
      const err = unauthorized();
      expect(isAuthError(err)).toBe(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).toBe('Invalid authentication for monitoring cluster');
      expect(wrappedErr.isBoom).toBe(true);
      expect(wrappedErr.isServer).toBe(false);
      expect(wrappedErr.data).toBe(null);
      expect(wrappedErr.output).toEqual({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid authentication for monitoring cluster',
        },
        headers: {},
      });
    });
  });

  describe('Elasticsearch errors', () => {
    it('handles Forbidden error defined by ElasticsearchJS', () => {
      const err = new errors.ResponseError({
        statusCode: 401,
        body: {
          error: {
            type: 'Forbidden',
          },
        },
        warnings: [],
        headers: {
          'WWW-Authenticate': 'content',
        },
        meta: {} as any,
      });
      expect(isAuthError(err)).toBe(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).toBe('Invalid authentication for monitoring cluster');
      expect(wrappedErr.isBoom).toBe(true);
      expect(wrappedErr.isServer).toBe(false);
      expect(wrappedErr.data).toBe(null);
      expect(wrappedErr.output).toEqual({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid authentication for monitoring cluster',
        },
        headers: {},
      });
    });

    it('handles Unauthorized error defined by ElasticsearchJS', () => {
      const err = new errors.ResponseError({
        statusCode: 403,
        body: {
          error: {
            type: 'Unauthorized',
          },
        },
        warnings: [],
        headers: {
          'WWW-Authenticate': 'content',
        },
        meta: {} as any,
      });
      expect(isAuthError(err)).toBe(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).toBe('Insufficient user permissions for monitoring data');
      expect(wrappedErr.isBoom).toBe(true);
      expect(wrappedErr.isServer).toBe(false);
      expect(wrappedErr.data).toBe(null);
      expect(wrappedErr.output).toEqual({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient user permissions for monitoring data',
        },
        headers: {},
      });
    });
  });
});
