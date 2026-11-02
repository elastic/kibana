/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getApiKeyFromRequest } from './request_api_key';

describe('getApiKeyFromRequest', () => {
  test('should return the API key from a request', () => {
    const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');

    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: `ApiKey ${mockApiKey}`,
      },
    });

    const result = getApiKeyFromRequest(request);
    expect(result).toEqual({ id: 'apiKeyId', api_key: 'apiKey' });
  });

  test('should return null if request is missing the authorization header', () => {
    const request = httpServerMock.createKibanaRequest();
    const result = getApiKeyFromRequest(request);
    expect(result).toBeNull();
  });

  test.each(['Basic', 'Bearer'])('should return null for the %s scheme', (scheme) => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: `${scheme} ${Buffer.from('user:pass').toString('base64')}` },
    });

    expect(getApiKeyFromRequest(request)).toBeNull();
  });

  test('should keep a secret that contains a colon', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: `ApiKey ${Buffer.from('id:se:cret').toString('base64')}` },
    });

    expect(getApiKeyFromRequest(request)).toEqual({ id: 'id', api_key: 'se:cret' });
  });

  test('should return a raw user-created UIAM API key without an id', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: `ApiKey essu_user_created_key`,
      },
    });

    const result = getApiKeyFromRequest(request);
    expect(result).toEqual({ api_key: 'essu_user_created_key' });
  });
});
