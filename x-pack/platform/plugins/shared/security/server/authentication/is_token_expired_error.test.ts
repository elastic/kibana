/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { isTokenExpiredError } from './is_token_expired_error';

describe('isTokenExpiredError', () => {
  it.each([{ error: { reason: 'token expired' } }])('recognizes scoped expiry: %j', (body) => {
    const error = new errors.ResponseError(
      elasticsearchServiceMock.createApiResponse({ statusCode: 401, body })
    );
    expect(isTokenExpiredError(error)).toBe(true);
  });

  it.each([{ type: 'security_exception', reason: 'token expired' }])(
    'unwraps a grant expiry only on the grant path: %j',
    (cause) => {
      const error = new errors.ResponseError(
        elasticsearchServiceMock.createApiResponse({
          statusCode: 403,
          body: { error: { reason: 'Failed to authenticate api key grant', caused_by: cause } },
        })
      );
      expect(isTokenExpiredError(error)).toBe(false);
      expect(isTokenExpiredError(error, true)).toBe(true);
    }
  );

  it.each([
    { statusCode: 401, body: { error: { reason: 'invalid token' } } },
    { statusCode: 403, body: { error: { reason: 'token expired' } } },
    {
      statusCode: 403,
      body: {
        error: {
          reason: 'Failed to authenticate api key grant',
          caused_by: { type: 'security_exception', reason: 'permission denied' },
        },
      },
    },
    { statusCode: 503, body: { error: { reason: 'token expired' } } },
  ])('rejects non-expiry error: %j', (response) => {
    const error = new errors.ResponseError(
      elasticsearchServiceMock.createApiResponse<typeof response.body>(response)
    );
    expect(isTokenExpiredError(error, true)).toBe(false);
  });

  it('rejects unrelated errors', () => {
    expect(isTokenExpiredError(new Error('token expired'))).toBe(false);
  });
});
