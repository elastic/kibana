/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

jest.mock('./request_oauth_refresh_token', () => ({
  requestOAuthRefreshToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

let clock: sinon.SinonFakeTimers;

const NOW = new Date('2024-01-01T12:00:00.000Z');
const FUTURE = new Date('2024-01-02T12:00:00.000Z').toISOString();
const PAST = new Date('2024-01-01T11:00:00.000Z').toISOString();

const BASE_OPTS = {
  connectorId: 'connector-123',
  logger,
  configurationUtilities,
  credentials: {
    config: {
      clientId: 'clientId',
      tokenUrl: 'https://auth.example.com/oauth2/token',
    },
    secrets: {
      clientSecret: 'clientSecret',
    },
  },
  connectorTokenClient,
};

describe('getOAuthAuthorizationCodeAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    clock.reset();
  });
  afterAll(() => clock.restore());

  describe('shared mode (authMode: "shared" or default)', () => {
    test('returns the shared token string from ConnectorToken.token when still valid', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer shared-access-token',
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBe('Bearer shared-access-token');
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });

    test('returns null when shared token shape is missing the .token field', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          // token field deliberately absent to simulate malformed document
          token: undefined as unknown as string,
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Stored token has unexpected shape')
      );
    });

    test('refreshes expired shared token using ConnectorToken.refreshToken', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-access-token',
          expiresAt: PAST,
          refreshToken: 'shared-refresh-token',
          createdAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'Bearer',
        accessToken: 'new-shared-access-token',
        expiresIn: 3600,
        refreshToken: 'new-shared-refresh-token',
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBe('Bearer new-shared-access-token');
      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        'https://auth.example.com/oauth2/token',
        logger,
        expect.objectContaining({ refreshToken: 'shared-refresh-token' }),
        configurationUtilities,
        true
      );
      expect(connectorTokenClient.updateWithRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'shared:token-id-1',
          token: 'Bearer new-shared-access-token',
          refreshToken: 'new-shared-refresh-token',
        })
      );
    });

    test('returns null when shared token is expired and has no refresh token', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-access-token',
          expiresAt: PAST,
          createdAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no refresh token available')
      );
    });

    test('keeps old refresh token when provider does not return a new one', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-access-token',
          expiresAt: PAST,
          refreshToken: 'original-refresh-token',
          createdAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'Bearer',
        accessToken: 'new-shared-access-token',
        expiresIn: 3600,
        // no refreshToken in response
      });

      await getOAuthAuthorizationCodeAccessToken({ ...BASE_OPTS, authMode: 'shared' });

      expect(connectorTokenClient.updateWithRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'original-refresh-token' })
      );
    });
  });

  describe('per-user mode (authMode: "per-user")', () => {
    const PER_USER_OPTS = {
      ...BASE_OPTS,
      authMode: 'per-user' as const,
      profileUid: 'user-profile-uid-abc',
    };

    test('returns credentials.accessToken from UserConnectorToken when still valid', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'Bearer per-user-access-token',
            refreshToken: 'per-user-refresh-token',
          },
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(PER_USER_OPTS);

      expect(result).toBe('Bearer per-user-access-token');
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });

    test('passes profileUid to connectorTokenClient.get', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: { accessToken: 'Bearer per-user-access-token' },
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      await getOAuthAuthorizationCodeAccessToken(PER_USER_OPTS);

      expect(connectorTokenClient.get).toHaveBeenCalledWith(
        expect.objectContaining({ profileUid: 'user-profile-uid-abc' })
      );
    });

    test('returns null when credentials.accessToken is not a string', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: { accessToken: 12345 }, // wrong type
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(PER_USER_OPTS);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Stored token has unexpected shape')
      );
    });

    test('refreshes expired per-user token using credentials.refreshToken', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'Bearer old-per-user-token',
            refreshToken: 'per-user-refresh-token',
          },
          expiresAt: PAST,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'Bearer',
        accessToken: 'new-per-user-access-token',
        expiresIn: 3600,
        refreshToken: 'new-per-user-refresh-token',
      });

      const result = await getOAuthAuthorizationCodeAccessToken(PER_USER_OPTS);

      expect(result).toBe('Bearer new-per-user-access-token');
      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        'https://auth.example.com/oauth2/token',
        logger,
        expect.objectContaining({ refreshToken: 'per-user-refresh-token' }),
        configurationUtilities,
        true
      );
      expect(connectorTokenClient.updateWithRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'per-user:token-id-2',
          token: 'Bearer new-per-user-access-token',
          refreshToken: 'new-per-user-refresh-token',
        })
      );
    });

    test('returns null when per-user token is expired and credentials has no refreshToken', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: { accessToken: 'Bearer old-per-user-token' },
          expiresAt: PAST,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(PER_USER_OPTS);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no refresh token available')
      );
    });

    test('returns null and warns when profileUid is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'per-user',
        profileUid: undefined,
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Per-user authMode requires a profileUid')
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });
  });

  describe('forceRefresh behavior', () => {
    test('bypasses expiry check and refreshes shared token even when still valid', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-valid-token',
          expiresAt: FUTURE,
          refreshToken: 'shared-refresh-token',
          createdAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'Bearer',
        accessToken: 'forced-new-token',
        expiresIn: 3600,
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
        forceRefresh: true,
      });

      expect(result).toBe('Bearer forced-new-token');
      expect(requestOAuthRefreshToken).toHaveBeenCalled();
    });

    test('bypasses expiry check and refreshes per-user token even when still valid', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-2',
          connectorId: 'connector-123',
          profileUid: 'user-profile-uid-abc',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'Bearer old-valid-per-user-token',
            refreshToken: 'per-user-refresh-token',
          },
          expiresAt: FUTURE,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'Bearer',
        accessToken: 'forced-new-per-user-token',
        expiresIn: 3600,
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'per-user',
        profileUid: 'user-profile-uid-abc',
        forceRefresh: true,
      });

      expect(result).toBe('Bearer forced-new-per-user-token');
      expect(requestOAuthRefreshToken).toHaveBeenCalled();
    });
  });

  describe('refresh token expiry check', () => {
    test('returns null when refresh token is expired', async () => {
      const expiredRefreshTokenExpiresAt = PAST;

      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-access-token',
          expiresAt: PAST,
          refreshToken: 'shared-refresh-token',
          refreshTokenExpiresAt: expiredRefreshTokenExpiresAt,
          createdAt: NOW.toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Refresh token expired'));
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('returns null when connectorTokenClient.get has errors', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: true,
        connectorToken: null,
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Errors fetching connector token')
      );
    });

    test('returns null when no token is stored (user must authorize)', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No access token found'));
    });

    test('returns null and logs error when requestOAuthRefreshToken throws', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'shared:token-id-1',
          connectorId: 'connector-123',
          tokenType: 'access_token',
          token: 'Bearer old-access-token',
          expiresAt: PAST,
          refreshToken: 'shared-refresh-token',
          createdAt: NOW.toISOString(),
        },
      });

      (requestOAuthRefreshToken as jest.Mock).mockRejectedValueOnce(
        new Error('Refresh request failed')
      );

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        authMode: 'shared',
      });

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh access token')
      );
    });

    test('returns null and warns when required credentials are missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...BASE_OPTS,
        credentials: {
          config: { clientId: '', tokenUrl: 'https://auth.example.com/oauth2/token' },
          secrets: { clientSecret: 'clientSecret' },
        },
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Missing required fields'));
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });
  });
});
