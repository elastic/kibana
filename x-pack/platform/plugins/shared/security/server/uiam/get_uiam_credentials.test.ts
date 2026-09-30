/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { getUiamCredentialsFromRequest } from './get_uiam_credentials';

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
