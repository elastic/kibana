/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { build401RetryFetch } from './get_mcp_client';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import type { FetchLike } from './build_custom_fetch';

import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';

jest.mock('./get_oauth_authorization_code_access_token', () => ({
  getOAuthAuthorizationCodeAccessToken: jest.fn(),
}));

const mockGetOAuthAuthorizationCodeAccessToken =
  getOAuthAuthorizationCodeAccessToken as jest.MockedFunction<
    typeof getOAuthAuthorizationCodeAccessToken
  >;

const logger = loggingSystemMock.createLogger();

const mockConfigurationUtilities = {
  getResponseSettings: jest.fn().mockReturnValue({ maxContentLength: 1000000, timeout: 360000 }),
  getSSLSettings: jest.fn().mockReturnValue({}),
  getProxySettings: jest.fn().mockReturnValue(undefined),
  getCustomHostSettings: jest.fn().mockReturnValue(undefined),
} as unknown as ActionsConfigurationUtilities;

const mockConnectorTokenClient = {
  get: jest.fn(),
  createWithRefreshToken: jest.fn(),
  updateWithRefreshToken: jest.fn(),
  deleteConnectorTokens: jest.fn(),
} as unknown as ConnectorTokenClientContract;

const oauthSecrets = {
  authType: 'oauth_authorization_code',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  tokenUrl: 'https://auth.example.com/token',
  scope: 'read write',
};

function createMockFetch(status: number): FetchLike {
  return jest.fn().mockResolvedValue(new Response('', { status }));
}

describe('build401RetryFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns baseFetch unchanged for non-OAuth auth types', () => {
    const baseFetch = createMockFetch(200);
    const result = build401RetryFetch({
      baseFetch,
      authTypeId: 'bearer',
      connectorId: 'c1',
      secrets: { authType: 'bearer', token: 'abc' },
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    expect(result).toBe(baseFetch);
  });

  test('returns baseFetch unchanged when connectorTokenClient is missing', () => {
    const baseFetch = createMockFetch(200);
    const result = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    expect(result).toBe(baseFetch);
  });

  test('passes through non-401 responses without retry', async () => {
    const baseFetch = createMockFetch(200);
    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const response = await wrappedFetch('https://mcp.example.com', {});
    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(mockGetOAuthAuthorizationCodeAccessToken).not.toHaveBeenCalled();
  });

  test('retries on 401 with force-refreshed token', async () => {
    const baseFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValueOnce('Bearer fresh-token');

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const response = await wrappedFetch('https://mcp.example.com', {
      headers: { Authorization: 'Bearer stale-token' },
    });

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
    expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ forceRefresh: true, connectorId: 'c1' })
    );

    const retryHeaders = baseFetch.mock.calls[1][1].headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token');
  });

  test('does not retry more than once (no infinite loops)', async () => {
    const baseFetch = jest.fn().mockResolvedValue(new Response('', { status: 401 }));
    mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer fresh-token');

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const response = await wrappedFetch('https://mcp.example.com', {});

    expect(baseFetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(401);
    expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledTimes(1);
  });

  test('returns original 401 when token refresh returns null', async () => {
    const baseFetch = createMockFetch(401);
    mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValueOnce(null);

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const response = await wrappedFetch('https://mcp.example.com', {});

    expect(response.status).toBe(401);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  test('returns original 401 when secrets lack required OAuth fields', async () => {
    const baseFetch = createMockFetch(401);

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: { authType: 'oauth_authorization_code' },
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const response = await wrappedFetch('https://mcp.example.com', {});

    expect(response.status).toBe(401);
    expect(mockGetOAuthAuthorizationCodeAccessToken).not.toHaveBeenCalled();
  });

  test('propagates error when token refresh throws', async () => {
    const baseFetch = createMockFetch(401);
    mockGetOAuthAuthorizationCodeAccessToken.mockRejectedValueOnce(
      new Error('Token endpoint unreachable')
    );

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    await expect(wrappedFetch('https://mcp.example.com', {})).rejects.toThrow(
      'Token endpoint unreachable'
    );
  });

  test('retries independently across separate calls', async () => {
    const baseFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer fresh-token');

    const wrappedFetch = build401RetryFetch({
      baseFetch,
      authTypeId: 'oauth_authorization_code',
      connectorId: 'c1',
      secrets: oauthSecrets,
      connectorTokenClient: mockConnectorTokenClient,
      logger,
      configurationUtilities: mockConfigurationUtilities,
    });

    const first = await wrappedFetch('https://mcp.example.com/call1', {});
    expect(first.status).toBe(200);

    const second = await wrappedFetch('https://mcp.example.com/call2', {});
    expect(second.status).toBe(200);

    expect(baseFetch).toHaveBeenCalledTimes(4);
    expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledTimes(2);
  });
});
