/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { assertUiamCredential, getUiamCredentialsFromRequest } from './get_uiam_credentials';

describe('getUiamCredentialsFromRequest', () => {
  it.each([
    ['Bearer essu_token', 'essu_token'],
    ['ApiKey essu_key', 'essu_key'],
  ])('extracts UIAM credentials from %s', (authorization, credentials) => {
    expect(
      getUiamCredentialsFromRequest(
        httpServerMock.createKibanaRequest({ headers: { authorization } })
      )
    ).toBe(credentials);
  });

  it('rejects a missing authorization header', () => {
    expect(() => getUiamCredentialsFromRequest(httpServerMock.createKibanaRequest())).toThrow(
      'Request does not contain an authorization header'
    );
  });

  it('rejects non-UIAM credentials', () => {
    expect(() =>
      getUiamCredentialsFromRequest(
        httpServerMock.createKibanaRequest({ headers: { authorization: 'Bearer other' } })
      )
    ).toThrow('Provided credential is not compatible with UIAM');
  });
});

describe('assertUiamCredential', () => {
  it('accepts a UIAM credential', () => {
    expect(() =>
      assertUiamCredential(new HTTPAuthorizationHeader('Bearer', 'essu_token'))
    ).not.toThrow();
  });

  it('rejects a missing authorization header with a 401', () => {
    expect(() => assertUiamCredential(null)).toThrow(
      expect.objectContaining({ output: expect.objectContaining({ statusCode: 401 }) })
    );
  });

  it('rejects a credential UIAM would not accept with a 400', () => {
    expect(() =>
      assertUiamCredential(new HTTPAuthorizationHeader('Basic', 'dXNlcjpwYXNz'))
    ).toThrow(expect.objectContaining({ output: expect.objectContaining({ statusCode: 400 }) }));
  });
});
