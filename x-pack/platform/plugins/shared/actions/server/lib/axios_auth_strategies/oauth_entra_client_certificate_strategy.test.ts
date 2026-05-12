/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../get_oauth_client_credentials_access_token');
jest.mock('../delete_token_axios_interceptor');

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, OAuthWithCertificateGetTokenOpts } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import { OAuthEntraClientCertificateStrategy } from './oauth_entra_client_certificate_strategy';
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
    tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
    scope: 'https://graph.microsoft.com/.default',
  },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const createMockAxiosInstance = () =>
  ({
    interceptors: { response: { use: jest.fn() } },
  } as unknown as AxiosInstance);

describe('OAuthEntraClientCertificateStrategy', () => {
  let strategy: OAuthEntraClientCertificateStrategy;

  const mockOnFulfilled = jest.fn();
  const mockOnRejected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new OAuthEntraClientCertificateStrategy();
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

    it('throws when connectorTokenClient is absent', () => {
      const instance = createMockAxiosInstance();
      const { connectorTokenClient: _ctc, ...depsWithoutClient } = baseDeps;
      expect(() => strategy.installResponseInterceptor(instance, depsWithoutClient)).toThrow(
        'Failed to delete invalid tokens: missing required ConnectorTokenClient.'
      );
    });
  });

  describe('getToken', () => {
    it('throws when opts authType is not oauth_entra_client_certificate', async () => {
      const opts: GetTokenOpts = { authType: 'ears', provider: 'google' };
      await expect(strategy.getToken(opts, baseDeps)).rejects.toThrow(
        'OAuthEntraClientCertificateStrategy received non-oauth_entra_client_certificate token opts'
      );
    });

    it('delegates to getOAuthClientCredentialsAccessToken with empty secrets', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer entra');

      const opts: OAuthWithCertificateGetTokenOpts = {
        authType: 'oauth_entra_client_certificate',
        tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
        clientId: 'the-client-id',
        scope: 'https://graph.microsoft.com/.default',
        additionalFields: {
          client_assertion: 'signed.jwt.assertion',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        },
      };
      const result = await strategy.getToken(opts, baseDeps);

      expect(result).toBe('Bearer entra');
      expect(mockGetOAuthClientCredentialsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-1',
          tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
          oAuthScope: 'https://graph.microsoft.com/.default',
          credentials: {
            config: {
              clientId: 'the-client-id',
              additionalFields: {
                client_assertion: 'signed.jwt.assertion',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
              },
            },
            secrets: {},
          },
          connectorTokenClient,
        })
      );
    });

    it('omits additionalFields when not present in opts', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer token');

      const opts: OAuthWithCertificateGetTokenOpts = {
        authType: 'oauth_entra_client_certificate',
        tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
        clientId: 'id',
      };
      await strategy.getToken(opts, baseDeps);

      expect(mockGetOAuthClientCredentialsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: {
            config: { clientId: 'id' },
            secrets: {},
          },
        })
      );
    });
  });
});
