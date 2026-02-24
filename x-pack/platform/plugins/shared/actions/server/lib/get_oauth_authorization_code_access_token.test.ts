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

const NOW = new Date('2024-01-15T12:00:00.000Z');

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

// A valid stored token: access token expires 1h from now, refresh token expires in 7 days
const validToken = {
  id: 'token-1',
  connectorId: 'connector-1',
  tokenType: 'access_token',
  token: 'stored-access-token',
  createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
  expiresAt: new Date('2024-01-15T13:00:00.000Z').toISOString(),
  refreshToken: 'stored-refresh-token',
  refreshTokenExpiresAt: new Date('2024-01-22T12:00:00.000Z').toISOString(),
};

// Same token but with an access token that expired 1h ago
const expiredToken = {
  ...validToken,
  expiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
};

// Per-user token: access/refresh stored under credentials.accessToken / credentials.refreshToken
const validPerUserToken = {
  id: 'token-1',
  profileUid: 'profile-1',
  connectorId: 'connector-1',
  credentialType: 'oauth',
  credentials: {
    accessToken: 'stored-per-user-access-token',
    refreshToken: 'stored-per-user-refresh-token',
  },
  createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
  expiresAt: new Date('2024-01-15T13:00:00.000Z').toISOString(),
  refreshTokenExpiresAt: new Date('2024-01-22T12:00:00.000Z').toISOString(),
};

const expiredPerUserToken = {
  ...validPerUserToken,
  expiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
};

const refreshResponse = {
  tokenType: 'Bearer',
  accessToken: 'new-access-token',
  expiresIn: 3600,
  refreshToken: 'new-refresh-token',
  refreshTokenExpiresIn: 604800,
};

const baseOpts = {
  connectorId: 'connector-1',
  logger,
  configurationUtilities,
  credentials: {
    config: {
      clientId: 'my-client-id',
      tokenUrl: 'https://auth.example.com/oauth/token',
    },
    secrets: {
      clientSecret: 'my-client-secret',
    },
  },
  connectorTokenClient,
};

let clock: sinon.SinonFakeTimers;

describe('getOAuthAuthorizationCodeAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();
  });
  afterAll(() => clock.restore());

  describe('credential validation', () => {
    it('returns null and warns when clientId is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: { ...baseOpts.credentials.config, clientId: '' },
        },
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Missing required fields for requesting OAuth Authorization Code access token'
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });

    it('returns null and warns when clientSecret is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: { ...baseOpts.credentials, secrets: { clientSecret: '' } },
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Missing required fields for requesting OAuth Authorization Code access token'
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });
  });

  describe('stored token retrieval', () => {
    it('returns null and warns when the token fetch reports errors', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: true, connectorToken: null });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Errors fetching connector token for connectorId: connector-1'
      );
    });

    it('returns null and warns when no token is stored (user has not authorized yet)', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'No access token found for connectorId: connector-1. User must complete OAuth authorization flow.'
      );
    });

    it('returns the stored token without refreshing when it has not expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validToken,
      });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });

    it('treats a token with no expiresAt as never-expiring', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validToken, expiresAt: undefined },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('token refresh', () => {
    it('returns null and warns when access token is expired but no refresh token is stored', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...expiredToken, refreshToken: undefined },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Access token expired and no refresh token available for connectorId: connector-1. User must re-authorize.'
      );
    });

    it('returns null and warns when the refresh token itself is expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          ...expiredToken,
          refreshTokenExpiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
        },
      });

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Refresh token expired for connectorId: connector-1. User must re-authorize.'
      );
    });

    it('returns the refreshed token formatted as "tokenType accessToken"', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBe('Bearer new-access-token');
    });

    it('calls requestOAuthRefreshToken with correct arguments including scope', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getOAuthAuthorizationCodeAccessToken({ ...baseOpts, scope: 'openid profile' });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        logger,
        {
          refreshToken: 'stored-refresh-token',
          clientId: 'my-client-id',
          clientSecret: 'my-client-secret',
          scope: 'openid profile',
        },
        configurationUtilities,
        true // useBasicAuth defaults to true
      );
    });

    it('spreads additionalFields into the refresh request body', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: {
            ...baseOpts.credentials.config,
            additionalFields: { tenant_id: 'abc123', custom_flag: true },
          },
        },
      });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ tenant_id: 'abc123', custom_flag: true }),
        expect.any(Object),
        expect.any(Boolean)
      );
    });

    it('passes useBasicAuth: false when explicitly configured', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: { ...baseOpts.credentials.config, useBasicAuth: false },
        },
      });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        false
      );
    });

    it('persists the refreshed token and the new refresh token from the response', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(connectorTokenClient.updateWithRefreshToken).toHaveBeenCalledWith({
        id: 'token-1',
        token: 'Bearer new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 604800,
        tokenType: 'access_token',
      });
    });

    it('falls back to the existing refresh token when the response omits one', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
        ...refreshResponse,
        refreshToken: undefined,
      });

      await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(connectorTokenClient.updateWithRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'stored-refresh-token' })
      );
    });
  });

  describe('forceRefresh', () => {
    it('bypasses the expiry check and refreshes a still-valid token', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        forceRefresh: true,
      });

      expect(result).toBe('Bearer new-access-token');
      expect(requestOAuthRefreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('returns null and logs an error when requestOAuthRefreshToken throws', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockRejectedValueOnce(
        new Error('token endpoint unreachable')
      );

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: token endpoint unreachable'
      );
    });

    it('returns null and logs an error when persisting the refreshed token fails', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);
      connectorTokenClient.updateWithRefreshToken.mockRejectedValueOnce(
        new Error('DB write failed')
      );

      const result = await getOAuthAuthorizationCodeAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: DB write failed'
      );
    });
  });

  describe('per-user auth mode', () => {
    it('returns null and warns when authMode is per-user but profileUid is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        authMode: 'per-user',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Per-user authMode requires a profileUid for connectorId: connector-1. Cannot retrieve token.'
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });

    it('fetches the token using profileUid when authMode is per-user', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validPerUserToken,
      });

      await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(connectorTokenClient.get).toHaveBeenCalledWith({
        profileUid: 'profile-1',
        connectorId: 'connector-1',
        tokenType: 'access_token',
      });
    });

    it('returns the stored access token from credentials.accessToken for a valid per-user token', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validPerUserToken,
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(result).toBe('stored-per-user-access-token');
      expect(requestOAuthRefreshToken).not.toHaveBeenCalled();
    });

    it('refreshes using credentials.refreshToken for an expired per-user token', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredPerUserToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ refreshToken: 'stored-per-user-refresh-token' }),
        expect.any(Object),
        expect.any(Boolean)
      );
      expect(result).toBe('Bearer new-access-token');
    });

    it('warns and returns null when the per-user token exists but credentials.accessToken is absent', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validPerUserToken, credentials: {} },
      });

      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Stored token has unexpected shape for connectorId: connector-1 (authMode: per-user)'
        )
      );
    });
  });

  describe('concurrency lock', () => {
    it('queues concurrent calls for the same connector so only one refresh runs', async () => {
      const lockedConnectorId = 'connector-lock-test';
      // First call inside the lock sees an expired token and refreshes it.
      // Second call (queued behind the first) re-fetches and sees the valid token.
      connectorTokenClient.get
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...expiredToken, connectorId: lockedConnectorId },
        })
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...validToken, connectorId: lockedConnectorId },
        });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const [result1, result2] = await Promise.all([
        getOAuthAuthorizationCodeAccessToken({ ...baseOpts, connectorId: lockedConnectorId }),
        getOAuthAuthorizationCodeAccessToken({ ...baseOpts, connectorId: lockedConnectorId }),
      ]);

      expect(requestOAuthRefreshToken).toHaveBeenCalledTimes(1);
      expect(result1).toBe('Bearer new-access-token');
      expect(result2).toBe('stored-access-token');
    });
  });
});
