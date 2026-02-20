/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import { parseError, getErrorMessage } from './parse_error';

/**
 * Helper to create a mock ResponseError for testing.
 * Uses the same pattern as client.ts for creating ResponseError instances.
 */
const createResponseError = (
  statusCode: number,
  body: Record<string, unknown>
): errors.ResponseError => {
  return new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'test',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
  });
};

describe('parseError', () => {
  describe('with Elasticsearch ResponseError', () => {
    it('extracts message, statusCode, and type from ResponseError', () => {
      const responseError = createResponseError(404, {
        error: {
          type: 'index_not_found_exception',
          reason: 'no such index [test]',
        },
      });

      const result = parseError(responseError);

      expect(result.message).toBe(responseError.message);
      expect(result.statusCode).toBe(404);
      expect(result.type).toBe('index_not_found_exception');
      expect(result.cause).toBe(responseError);
    });

    it('handles security_exception type', () => {
      const responseError = createResponseError(403, {
        error: {
          type: 'security_exception',
          reason: 'action [indices:data/read/search] is unauthorized',
        },
      });

      const result = parseError(responseError);

      expect(result.statusCode).toBe(403);
      expect(result.type).toBe('security_exception');
    });

    it('handles resource_already_exists_exception type', () => {
      const responseError = createResponseError(400, {
        error: {
          type: 'resource_already_exists_exception',
          reason: 'data stream [logs] already exists',
        },
      });

      const result = parseError(responseError);

      expect(result.statusCode).toBe(400);
      expect(result.type).toBe('resource_already_exists_exception');
    });

    it('handles ResponseError without body.error.type', () => {
      const responseError = createResponseError(500, {});

      const result = parseError(responseError);

      expect(result.statusCode).toBe(500);
      expect(result.type).toBeUndefined();
    });

    it('handles ResponseError with non-string type', () => {
      const responseError = createResponseError(400, {
        error: {
          type: 123, // Non-string type
        },
      });

      const result = parseError(responseError);

      expect(result.type).toBeUndefined();
    });

    it('returns statusCode equivalent to error.meta.statusCode', () => {
      // This test verifies that parseError().statusCode is equivalent to the old pattern
      // of accessing error.meta?.statusCode directly on ResponseError.
      // The ResponseError class has a statusCode getter that returns meta.statusCode.
      const responseError = createResponseError(404, {
        error: {
          type: 'index_not_found_exception',
          reason: 'no such index [test]',
        },
      });

      const result = parseError(responseError);

      // Verify equivalence: parseError().statusCode should equal error.meta?.statusCode
      expect(result.statusCode).toBe(responseError.meta?.statusCode);
      expect(result.statusCode).toBe(404);
    });

    it('returns statusCode equivalent to error.meta.statusCode for various status codes', () => {
      // Test multiple status codes to ensure equivalence across different responses
      const statusCodes = [400, 401, 403, 404, 409, 500, 502, 503];

      for (const code of statusCodes) {
        const responseError = createResponseError(code, {});
        const result = parseError(responseError);

        // Verify equivalence for each status code
        expect(result.statusCode).toBe(responseError.meta?.statusCode);
        expect(result.statusCode).toBe(code);
      }
    });
  });

  describe('with standard Error', () => {
    it('extracts message from standard Error', () => {
      const error = new Error('Something went wrong');

      const result = parseError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.cause).toBe(error);
    });

    it('handles custom error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');

      const result = parseError(error);

      expect(result.message).toBe('Custom error message');
      expect(result.cause).toBe(error);
    });
  });

  describe('with non-Error values', () => {
    it('converts string to message', () => {
      const result = parseError('String error');

      expect(result.message).toBe('String error');
      expect(result.statusCode).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.cause).toBe('String error');
    });

    it('converts number to message', () => {
      const result = parseError(42);

      expect(result.message).toBe('42');
      expect(result.cause).toBe(42);
    });

    it('converts object to message', () => {
      const obj = { foo: 'bar' };
      const result = parseError(obj);

      expect(result.message).toBe('[object Object]');
      expect(result.cause).toBe(obj);
    });

    it('handles null', () => {
      const result = parseError(null);

      expect(result.message).toBe('null');
      expect(result.cause).toBeNull();
    });

    it('handles undefined', () => {
      const result = parseError(undefined);

      expect(result.message).toBe('undefined');
      expect(result.cause).toBeUndefined();
    });
  });
});

describe('getErrorMessage', () => {
  it('returns message from ResponseError', () => {
    const responseError = createResponseError(404, {
      error: {
        type: 'index_not_found_exception',
      },
    });

    expect(getErrorMessage(responseError)).toBe(responseError.message);
  });

  it('returns message from standard Error', () => {
    const error = new Error('Test error');

    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('returns string representation of non-Error values', () => {
    expect(getErrorMessage('String error')).toBe('String error');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(null)).toBe('null');
  });
});
