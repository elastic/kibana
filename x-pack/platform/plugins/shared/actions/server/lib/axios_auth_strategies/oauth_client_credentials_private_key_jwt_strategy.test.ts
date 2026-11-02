/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../get_oauth_client_credentials_access_token');
jest.mock('../delete_token_axios_interceptor');
jest.mock('../build_client_assertion');

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, OAuthClientCredsPrivateKeyJWTGetTokenOpts } from '@kbn/connector-specs';
import { CLIENT_ASSERTION_TYPE } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { buildClientAssertion } from '../build_client_assertion';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import { OAuthClientCredentialsPrivateKeyJwtStrategy } from './oauth_client_credentials_private_key_jwt_strategy';
import type { AuthStrategyDeps } from './types';

const mockGetOAuthClientCredentialsAccessToken =
  getOAuthClientCredentialsAccessToken as jest.MockedFunction<
    typeof getOAuthClientCredentialsAccessToken
  >;
const mockGetDeleteTokenAxiosInterceptor = getDeleteTokenAxiosInterceptor as jest.MockedFunction<
  typeof getDeleteTokenAxiosInterceptor
>;
const mockBuildClientAssertion = buildClientAssertion as jest.MockedFunction<
  typeof buildClientAssertion
>;

const logger = loggerMock.create();
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const PEM_CERT = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----';
const PEM_KEY = '-----BEGIN ENCRYPTED PRIVATE KEY-----\nBBBB\n-----END ENCRYPTED PRIVATE KEY-----';
const CLIENT_ASSERTION = 'signed.jwt.assertion';

const baseDeps: AuthStrategyDeps = {
  connectorId: 'connector-1',
  secrets: {
    clientId: 'my-client-id',
    tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
    scope: 'https://graph.microsoft.com/.default',
    algorithm: 'PS256',
    certificateBinding: 'x5t#S256',
    certificate: PEM_CERT,
    privateKey: PEM_KEY,
    passphrase: 'passphrase',
  },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const baseOpts: OAuthClientCredsPrivateKeyJWTGetTokenOpts = {
  authType: 'oauth_client_credentials_private_key_jwt',
  tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
  clientId: 'the-client-id',
  scope: 'https://graph.microsoft.com/.default',
};

const createMockAxiosInstance = () =>
  ({
    interceptors: { response: { use: jest.fn() } },
  } as unknown as AxiosInstance);

describe('OAuthClientCredentialsPrivateKeyJwtStrategy', () => {
  let strategy: OAuthClientCredentialsPrivateKeyJwtStrategy;

  const mockOnFulfilled = jest.fn();
  const mockOnRejected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new OAuthClientCredentialsPrivateKeyJwtStrategy();
    mockGetDeleteTokenAxiosInterceptor.mockReturnValue({
      onFulfilled: mockOnFulfilled,
      onRejected: mockOnRejected,
    });
    mockBuildClientAssertion.mockReturnValue(CLIENT_ASSERTION);
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
    it('throws when opts authType is not oauth_client_credentials_private_key_jwt', async () => {
      const opts: GetTokenOpts = { authType: 'ears', provider: 'google' };
      await expect(strategy.getToken(opts, baseDeps)).rejects.toThrow(
        'OAuthClientCredentialsPrivateKeyJwtStrategy received non-oauth_client_credentials_private_key_jwt token opts'
      );
    });

    it('delegates to getOAuthClientCredentialsAccessToken with a buildAdditionalFields factory', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer entra');

      const result = await strategy.getToken(baseOpts, baseDeps);

      expect(result).toBe('Bearer entra');
      expect(mockGetOAuthClientCredentialsAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-1',
          tokenUrl: baseOpts.tokenUrl,
          oAuthScope: baseOpts.scope,
          credentials: {
            type: 'client_assertion',
            config: {
              clientId: baseOpts.clientId,
              buildAdditionalFields: expect.any(Function),
            },
          },
          connectorTokenClient,
        })
      );
    });

    it('does not build the assertion before the factory is invoked', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer entra');
      await strategy.getToken(baseOpts, baseDeps);

      // Token endpoint cache hits should never trigger the crypto path
      expect(mockBuildClientAssertion).not.toHaveBeenCalled();
    });

    it('factory builds the assertion using cert/key/passphrase from deps.secrets', async () => {
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer entra');
      await strategy.getToken(baseOpts, baseDeps);

      const credentials = mockGetOAuthClientCredentialsAccessToken.mock.calls[0][0].credentials;
      if (credentials.type !== 'client_assertion') {
        throw new Error('expected client_assertion credentials');
      }
      const { buildAdditionalFields } = credentials.config;
      const fields = buildAdditionalFields!();

      expect(mockBuildClientAssertion).toHaveBeenCalledWith({
        tokenUrl: baseOpts.tokenUrl,
        clientId: baseOpts.clientId,
        algorithm: 'PS256',
        certificateBinding: { kind: 'x5t#S256', certificate: PEM_CERT },
        privateKey: PEM_KEY,
        passphrase: 'passphrase',
      });
      expect(fields).toEqual({
        client_assertion: CLIENT_ASSERTION,
        client_assertion_type: CLIENT_ASSERTION_TYPE,
      });
    });

    it('factory wraps buildClientAssertion errors with cause preserved', async () => {
      const rootCause = new Error('Invalid PEM certificate');
      mockBuildClientAssertion.mockImplementation(() => {
        throw rootCause;
      });
      mockGetOAuthClientCredentialsAccessToken.mockResolvedValue('Bearer entra');
      await strategy.getToken(baseOpts, baseDeps);

      const credentials = mockGetOAuthClientCredentialsAccessToken.mock.calls[0][0].credentials;
      if (credentials.type !== 'client_assertion') {
        throw new Error('expected client_assertion credentials');
      }
      const { buildAdditionalFields } = credentials.config;

      expect(() => buildAdditionalFields!()).toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/Unable to build client assertion/),
          cause: rootCause,
        })
      );
    });
  });
});
