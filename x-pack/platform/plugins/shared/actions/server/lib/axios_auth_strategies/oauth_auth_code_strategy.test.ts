/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../get_oauth_authorization_code_access_token');

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, OAuthGetTokenOpts } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getOAuthAuthorizationCodeAccessToken } from '../get_oauth_authorization_code_access_token';
import { OAuthAuthCodeStrategy } from './oauth_auth_code_strategy';
import type { AuthStrategyDeps } from './types';

const mockGetOAuthAuthorizationCodeAccessToken =
  getOAuthAuthorizationCodeAccessToken as jest.MockedFunction<
    typeof getOAuthAuthorizationCodeAccessToken
  >;

const logger = loggerMock.create();
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const baseDeps: AuthStrategyDeps = {
  connectorId: 'connector-1',
  secrets: {
    clientId: 'my-client-id',
    clientSecret: 'my-client-secret',
    tokenUrl: 'https://provider.example.com/token',
    scope: 'openid',
    useBasicAuth: true,
  },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const createMockAxiosInstance = () => {
  const mockRequest = jest.fn();
  const instance = {
    interceptors: { response: { use: jest.fn() } },
    request: mockRequest,
    defaults: { headers: { common: {} as Record<string, string> } },
  } as unknown as AxiosInstance;
  return { instance, mockRequest };
};

const getOnRejected = (instance: AxiosInstance) => {
  const useMock = instance.interceptors.response.use as jest.Mock;
  expect(useMock).toHaveBeenCalledTimes(1);
  return useMock.mock.calls[0][1] as (error: unknown) => Promise<unknown>;
};

describe('OAuthAuthCodeStrategy', () => {
  let strategy: OAuthAuthCodeStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new OAuthAuthCodeStrategy();
  });

  describe('installResponseInterceptor', () => {
    it('throws synchronously when connectorTokenClient is absent', () => {
      const { instance } = createMockAxiosInstance();
      const { connectorTokenClient: _ctc, ...depsWithoutClient } = baseDeps;
      expect(() => strategy.installResponseInterceptor(instance, depsWithoutClient)).toThrow(
        'ConnectorTokenClient is required for OAuth authorization code flow'
      );
    });

    it('passes non-401 errors through unchanged', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 403 },
        message: 'Forbidden',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockGetOAuthAuthorizationCodeAccessToken).not.toHaveBeenCalled();
    });

    it('does not retry when _retry is already set', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: true, headers: {} },
        response: { status: 401 },
        message: 'Unauthorized',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockGetOAuthAuthorizationCodeAccessToken).not.toHaveBeenCalled();
    });

    it('rejects with message when clientId, clientSecret or tokenUrl are absent', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, { ...baseDeps, secrets: { scope: 'openid' } });
      const onRejected = getOnRejected(instance);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect((error as { message: string }).message).toContain(
        'Missing required OAuth configuration'
      );
      expect(mockGetOAuthAuthorizationCodeAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes token on 401 and retries the request', async () => {
      const { instance, mockRequest } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer refreshed');
      mockRequest.mockResolvedValue({ status: 200 });

      const error = {
        config: { _retry: false, headers: {} as Record<string, string> },
        response: { status: 401 },
        message: 'Unauthorized',
      };
      await onRejected(error);

      expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ forceRefresh: true, connectorId: 'connector-1' })
      );
      expect(error.config.headers.Authorization).toBe('Bearer refreshed');
      expect(mockRequest).toHaveBeenCalledWith(error.config);
    });

    it('rejects with message when token refresh returns null', async () => {
      const { instance } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue(null);

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await expect(onRejected(error)).rejects.toBe(error);
      expect((error as { message: string }).message).toContain(
        'Unable to refresh access token. Please re-authorize'
      );
    });

    it('passes credentials to getOAuthAuthorizationCodeAccessToken with correct shape', async () => {
      const { instance, mockRequest } = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);
      const onRejected = getOnRejected(instance);

      mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer token');
      mockRequest.mockResolvedValue({ status: 200 });

      const error = {
        config: { _retry: false, headers: {} },
        response: { status: 401 },
        message: '',
      };
      await onRejected(error);

      expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: {
            config: {
              clientId: 'my-client-id',
              tokenUrl: 'https://provider.example.com/token',
              useBasicAuth: true,
            },
            secrets: { clientSecret: 'my-client-secret' },
          },
          scope: 'openid',
        })
      );
    });
  });

  describe('getToken', () => {
    it('throws when opts authType is not oauth', async () => {
      const opts: GetTokenOpts = { authType: 'ears', provider: 'google' };
      await expect(strategy.getToken(opts, baseDeps)).rejects.toThrow(
        'OAuthAuthCodeStrategy received non-oauth token opts'
      );
    });

    it('throws when connectorTokenClient is absent', async () => {
      const { connectorTokenClient: _ctc, ...depsWithoutClient } = baseDeps;
      const opts: OAuthGetTokenOpts = {
        authType: 'oauth',
        tokenUrl: 'https://provider.example.com/token',
        clientId: 'id',
        clientSecret: 'secret',
      };
      await expect(strategy.getToken(opts, depsWithoutClient)).rejects.toThrow(
        'ConnectorTokenClient is required for OAuth authorization code flow'
      );
    });

    it('delegates to getOAuthAuthorizationCodeAccessToken with correct credentials', async () => {
      mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer token');

      const opts: OAuthGetTokenOpts = {
        authType: 'oauth',
        tokenUrl: 'https://provider.example.com/token',
        clientId: 'the-client-id',
        clientSecret: 'the-client-secret',
        scope: 'openid profile',
      };
      await strategy.getToken(opts, baseDeps);

      expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-1',
          credentials: {
            config: { clientId: 'the-client-id', tokenUrl: 'https://provider.example.com/token' },
            secrets: { clientSecret: 'the-client-secret' },
          },
          connectorTokenClient,
          scope: 'openid profile',
        })
      );
    });

    it('includes additionalFields when present in opts', async () => {
      mockGetOAuthAuthorizationCodeAccessToken.mockResolvedValue('Bearer token');

      const opts: OAuthGetTokenOpts = {
        authType: 'oauth',
        tokenUrl: 'https://provider.example.com/token',
        clientId: 'id',
        clientSecret: 'secret',
        additionalFields: { tenant: 'my-tenant' },
      };
      await strategy.getToken(opts, baseDeps);

      expect(mockGetOAuthAuthorizationCodeAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.objectContaining({
            config: expect.objectContaining({ additionalFields: { tenant: 'my-tenant' } }),
          }),
        })
      );
    });
  });
});
