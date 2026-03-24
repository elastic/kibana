/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHttpErrorBody, getHttpStatusCode } from './http_error_utils';

describe('http_error_utils', () => {
  describe('getHttpStatusCode', () => {
    it('returns top-level statusCode first', () => {
      expect(
        getHttpStatusCode({
          statusCode: 404,
          meta: { statusCode: 403 },
          response: { status: 401 },
        })
      ).toBe(404);
    });

    it('falls back to meta.statusCode', () => {
      expect(getHttpStatusCode({ meta: { statusCode: 409 } })).toBe(409);
    });

    it('falls back to response.status', () => {
      expect(getHttpStatusCode({ response: { status: 401 } })).toBe(401);
    });
  });

  describe('getHttpErrorBody', () => {
    it('returns top-level body first', () => {
      const body = { message: 'top' };
      expect(
        getHttpErrorBody({
          body,
          meta: { body: { message: 'meta' } },
          response: { body: { message: 'response' } },
        })
      ).toBe(body);
    });

    it('falls back to meta.body', () => {
      const body = { message: 'meta' };
      expect(getHttpErrorBody({ meta: { body } })).toBe(body);
    });

    it('falls back to response.body', () => {
      const body = { message: 'response' };
      expect(getHttpErrorBody({ response: { body } })).toBe(body);
    });
  });
});
