/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../get_oauth_client_credentials_access_token');
jest.mock('../delete_token_axios_interceptor');

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, OAuthGetTokenOpts } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import { DefaultStrategy } from './default_strategy';
import type { AuthStrategyDeps } from './types';

const mockGetOAuthClientCredentialsAccessToken =
  getOAuthClientCredentialsAccessToken as jest.MockedFunction<
    typeof getOAuthClientCredentialsAccessToken
  >;
const mockGetDeleteTokenAxiosInterceptor = getDeleteTokenAxiosInterceptor as jest.MockedFunction<
  typeof getDeleteTokenAxiosInterceptor
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
  },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const createMockAxiosInstance = () =>
  ({
    interceptors: { response: { use: jest.fn() } },
  } as unknown as AxiosInstance);

describe('DefaultStrategy', () => {
  let strategy: DefaultStrategy;

  const mockOnFulfilled = jest.fn();
  const mockOnRejected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new DefaultStrategy();
    mockGetDeleteTokenAxiosInterceptor.mockReturnValue({
      onFulfilled: mockOnFulfilled,
      onRejected: mockOnRejected,
    });
  });

  describe('installResponseInterceptor', () => {
    it('installs the delete-token cleanup interceptor', () => {
      const instance = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);

      expect(mockGetDeleteTokenAxiosInterceptor).toHaveBeenCalledWith({
        connectorTokenClient,
        connectorId: 'connector-1',
      });
      expect(instance.interceptors.response.use).toHaveBeenCalledWith(
        mockOnFulfilled,
        mockOnRejected
      );
    });
  });

  describe('getToken', () => {
    it('throws when opts authType is not oauth', async () => {
      const opts: GetTokenOpts = { authType: 'ears', provider: 'google' };
      await expect(strategy.getToken(opts, baseDeps)).rejects.toThrow(
        'DefaultStrategy received non-oauth token opts'
      );
    });

    it('delegates to getOAuthClientCredentialsAccessToken with correct args', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer clientcred');

      const opts: OAuthGetTokenOpts = {
        authType: 'oauth',
        tokenUrl: 'https://provider.example.com/token',
        clientId: 'the-client-id',
        clientSecret: 'the-client-secret',
        scope: 'openid profile',
      };
      const result = await strategy.getToken(opts, baseDeps);

      expect(result).toBe('Bearer clientcred');
      expect(mockGetOAuthClientCredentialsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-1',
          tokenUrl: 'https://provider.example.com/token',
          oAuthScope: 'openid profile',
          credentials: {
            config: { clientId: 'the-client-id' },
            secrets: { clientSecret: 'the-client-secret' },
          },
          connectorTokenClient,
        })
      );
    });

    it('includes additionalFields when present in opts', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer token');

      const opts: OAuthGetTokenOpts = {
        authType: 'oauth',
        tokenUrl: 'https://provider.example.com/token',
        clientId: 'id',
        clientSecret: 'secret',
        additionalFields: { tenant: 'abc' },
      };
      await strategy.getToken(opts, baseDeps);

      expect(mockGetOAuthClientCredentialsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.objectContaining({
            config: expect.objectContaining({ additionalFields: { tenant: 'abc' } }),
          }),
        })
      );
    });
  });
});
