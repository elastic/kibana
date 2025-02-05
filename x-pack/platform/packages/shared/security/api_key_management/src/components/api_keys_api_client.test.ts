/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { APIKeysAPIClient } from './api_keys_api_client';
import type { QueryApiKeyParams } from './api_keys_api_client';

describe('APIKeysAPIClient', () => {
  it('invalidateApiKeys() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.post.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);
    const mockAPIKeys = [
      { id: 'one', name: 'name-one' },
      { id: 'two', name: 'name-two' },
    ];

    await expect(apiClient.invalidateApiKeys(mockAPIKeys)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: false }),
    });
    httpMock.post.mockClear();

    await expect(apiClient.invalidateApiKeys(mockAPIKeys, false)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: false }),
    });
    httpMock.post.mockClear();

    await expect(apiClient.invalidateApiKeys(mockAPIKeys, true)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: true }),
    });
  });

  it('createApiKey() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.post.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);
    const mockAPIKeys = { name: 'name', expiration: '7d' } as any;

    await expect(apiClient.createApiKey(mockAPIKeys)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key', {
      body: JSON.stringify(mockAPIKeys),
    });
  });

  it('updateApiKey() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.put.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);
    const mockApiKeyUpdate = { id: 'test_id', metadata: {}, roles_descriptor: {} } as any;

    await expect(apiClient.updateApiKey(mockApiKeyUpdate)).resolves.toBe(mockResponse);
    expect(httpMock.put).toHaveBeenCalledTimes(1);
    expect(httpMock.put).toHaveBeenCalledWith('/internal/security/api_key', {
      body: JSON.stringify(mockApiKeyUpdate),
    });
  });

  it('queryApiKeys() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.post.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);
    const mockQueryParams = {
      query: {},
      from: 0,
      size: 10,
      sort: { field: 'creation', direction: 'asc' },
    } as QueryApiKeyParams;

    await expect(apiClient.queryApiKeys(mockQueryParams)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/_query', {
      body: JSON.stringify(mockQueryParams),
    });
  });
});
