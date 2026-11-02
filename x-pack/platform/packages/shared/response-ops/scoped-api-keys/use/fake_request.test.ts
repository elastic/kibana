/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import { buildApiKeyFakeRequest } from './fake_request';

describe('buildApiKeyFakeRequest', () => {
  test('authenticates with the API key and scopes the request to the space', () => {
    const request = buildApiKeyFakeRequest({ apiKey: 'abc', spaceId: 'team-a' });

    expect(request.headers).toEqual({ authorization: 'ApiKey abc' });
    expect(request.spaceId).toBe('team-a');
    expect(request.isFakeRequest).toBe(true);
    expect(isExternalUiamCredential(request)).toBe(false);
  });

  test('carries no authorization header without an API key', () => {
    const request = buildApiKeyFakeRequest({ spaceId: 'default' });

    expect(request.headers).toEqual({});
  });

  test('marks an external UIAM credential', () => {
    const request = buildApiKeyFakeRequest({
      apiKey: 'essu_key',
      spaceId: 'default',
      uiamApiKeyExternal: true,
    });

    expect(isExternalUiamCredential(request)).toBe(true);
  });

  test('does not mark an external credential without an API key', () => {
    const request = buildApiKeyFakeRequest({ spaceId: 'default', uiamApiKeyExternal: true });

    expect(isExternalUiamCredential(request)).toBe(false);
  });
});
