/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConnectorAuthorizationError } from '@kbn/connector-specs';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { getStoredTokenWithRefresh } from './get_stored_oauth_token_with_refresh';

const NOW = new Date('2024-01-15T12:00:00.000Z');

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const connectorTokenClient = connectorTokenClientMock.create();

// Access token expires 1h from now, refresh token expires in 7 days
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

// Same but access token expired 1h ago
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

const refreshFn = jest.fn();

const baseOpts = {
  connectorId: 'connector-1',
  logger,
  connectorTokenClient,
  authMethod: 'oauth_authorization_code',
  refreshFn,
};

let clock: sinon.SinonFakeTimers;

describe('getStoredTokenWithRefresh', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();
  });
  afterAll(() => clock.restore());

  describe('stored token retrieval', () => {
    it('returns null and warns when the token fetch reports errors', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: true, connectorToken: null });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Errors fetching connector token for connectorId: connector-1'
      );
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('throws ConnectorAuthorizationError with reason no_token when no token is stored', async () => {
      connectorTokenClient.get.mockResolvedValue({ hasErrors: false, connectorToken: null });

      const error = await getStoredTokenWithRefresh(baseOpts).catch((e) => e);
      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('no_token');
      expect(error.authMethod).toBe('oauth_authorization_code');
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('returns the stored token without calling refreshFn when it has not expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validToken,
      });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('treats a token with no expiresAt as never-expiring', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validToken, expiresAt: undefined },
      });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(refreshFn).not.toHaveBeenCalled();
    });
  });

  describe('token refresh', () => {
    it('throws ConnectorAuthorizationError with reason token_expired when the access token is expired but no refresh token is stored', async () => {
      connectorTokenClient.get.mockResolvedValue({
        hasErrors: false,
        connectorToken: { ...expiredToken, refreshToken: undefined },
      });

      const error = await getStoredTokenWithRefresh(baseOpts).catch((e) => e);
      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('token_expired');
      expect(error.authMethod).toBe('oauth_authorization_code');
    });

    it('throws ConnectorAuthorizationError with reason refresh_token_expired when the refresh token itself is expired', async () => {
      connectorTokenClient.get.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          ...expiredToken,
          refreshTokenExpiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
        },
      });

      const error = await getStoredTokenWithRefresh(baseOpts).catch((e) => e);
      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('refresh_token_expired');
      expect(error.authMethod).toBe('oauth_authorization_code');
    });

    it('calls refreshFn with the stored refresh token when the access token is expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockResolvedValueOnce(refreshResponse);

      await getStoredTokenWithRefresh(baseOpts);

      expect(refreshFn).toHaveBeenCalledWith('stored-refresh-token');
    });

    it('returns the refreshed token formatted as "tokenType accessToken"', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockResolvedValueOnce(refreshResponse);

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('Bearer new-access-token');
    });

    it('persists the refreshed token and the new refresh token from the response', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockResolvedValueOnce(refreshResponse);

      await getStoredTokenWithRefresh(baseOpts);

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
      refreshFn.mockResolvedValueOnce({ ...refreshResponse, refreshToken: undefined });

      await getStoredTokenWithRefresh(baseOpts);

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
      refreshFn.mockResolvedValueOnce(refreshResponse);

      const result = await getStoredTokenWithRefresh({ ...baseOpts, forceRefresh: true });

      expect(result).toBe('Bearer new-access-token');
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('returns null and logs an error when refreshFn throws a non-auth error', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockRejectedValueOnce(new Error('upstream auth failed'));

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: upstream auth failed'
      );
    });

    it('throws ConnectorAuthorizationError with reason token_revoked when the error contains invalid_grant', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockRejectedValueOnce(
        new Error('{"error":"invalid_grant","error_description":"Token has been revoked"}')
      );

      const error = await getStoredTokenWithRefresh(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('token_revoked');
      expect(error.authMethod).toBe('oauth_authorization_code');
    });

    it('throws ConnectorAuthorizationError with reason refresh_failed when treatRefreshFailureAsAuthError is true', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockRejectedValueOnce(new Error('opaque refresh error'));

      const error = await getStoredTokenWithRefresh({
        ...baseOpts,
        treatRefreshFailureAsAuthError: true,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('refresh_failed');
      expect(error.authMethod).toBe('oauth_authorization_code');
    });

    it('returns null and logs an error when persisting the refreshed token fails', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      refreshFn.mockResolvedValueOnce(refreshResponse);
      connectorTokenClient.updateWithRefreshToken.mockRejectedValueOnce(
        new Error('DB write failed')
      );

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: DB write failed'
      );
    });
  });

  describe('concurrency lock', () => {
    it('queues concurrent calls for the same connector so only one refresh runs', async () => {
      const lockedConnectorId = 'connector-lock-shared';
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
      refreshFn.mockResolvedValueOnce(refreshResponse);

      const [result1, result2] = await Promise.all([
        getStoredTokenWithRefresh({ ...baseOpts, connectorId: lockedConnectorId }),
        getStoredTokenWithRefresh({ ...baseOpts, connectorId: lockedConnectorId }),
      ]);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('Bearer new-access-token');
      expect(result2).toBe('stored-access-token');
    });

    it('queues concurrent per-user calls for the same connector+user so only one refresh runs', async () => {
      const lockedConnectorId = 'connector-lock-per-user-same';
      // Same profileUid => same lock key => serialized.
      // First call refreshes, second call re-fetches and sees the valid token.
      connectorTokenClient.get
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...expiredPerUserToken, connectorId: lockedConnectorId },
        })
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...validPerUserToken, connectorId: lockedConnectorId },
        });
      refreshFn.mockResolvedValueOnce(refreshResponse);

      const opts = {
        ...baseOpts,
        connectorId: lockedConnectorId,
        isPerUser: true as const,
        profileUid: 'profile-1',
      };
      const [result1, result2] = await Promise.all([
        getStoredTokenWithRefresh(opts),
        getStoredTokenWithRefresh(opts),
      ]);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('Bearer new-access-token');
      expect(result2).toBe('stored-per-user-access-token');
    });

    it.each([
      {
        label: 'shared mode (simple lock key)',
        extraOpts: {},
        connectorToken: validToken,
        expectedLockKey: (connectorId: string) => connectorId,
      },
      {
        label: 'per-user mode (composite lock key)',
        extraOpts: { isPerUser: true as const, profileUid: 'profile-cleanup-test' },
        connectorToken: validPerUserToken,
        expectedLockKey: (connectorId: string) => `${connectorId}:profile-cleanup-test`,
      },
    ])(
      'removes the lock entry after all queued calls complete to prevent memory leaks ($label)',
      async ({ extraOpts, connectorToken, expectedLockKey }) => {
        const deleteSpy = jest.spyOn(Map.prototype, 'delete');
        const connectorId = 'connector-cleanup-test';

        connectorTokenClient.get.mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...connectorToken, connectorId },
        });

        await getStoredTokenWithRefresh({ ...baseOpts, connectorId, ...extraOpts });

        expect(deleteSpy).toHaveBeenCalledWith(expectedLockKey(connectorId));
        deleteSpy.mockRestore();
      }
    );

    it('removes the lock entry even when the callback throws', async () => {
      const deleteSpy = jest.spyOn(Map.prototype, 'delete');
      const connectorId = 'connector-cleanup-on-throw';

      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });

      await getStoredTokenWithRefresh({ ...baseOpts, connectorId }).catch(() => {});

      expect(deleteSpy).toHaveBeenCalledWith(connectorId);
      deleteSpy.mockRestore();
    });

    it('allows concurrent per-user calls for different users on the same connector to refresh independently', async () => {
      const lockedConnectorId = 'connector-lock-per-user-diff';
      // Different profileUids => different lock keys => independent execution.
      // Both users see an expired token and each triggers its own refresh.
      const expiredUser1Token = { ...expiredPerUserToken, connectorId: lockedConnectorId };
      const expiredUser2Token = {
        ...expiredPerUserToken,
        id: 'token-2',
        profileUid: 'profile-2',
        connectorId: lockedConnectorId,
      };
      connectorTokenClient.get
        .mockResolvedValueOnce({ hasErrors: false, connectorToken: expiredUser1Token })
        .mockResolvedValueOnce({ hasErrors: false, connectorToken: expiredUser2Token });
      refreshFn
        .mockResolvedValueOnce(refreshResponse)
        .mockResolvedValueOnce({ ...refreshResponse, accessToken: 'new-access-token-user2' });

      const [result1, result2] = await Promise.all([
        getStoredTokenWithRefresh({
          ...baseOpts,
          connectorId: lockedConnectorId,
          isPerUser: true,
          profileUid: 'profile-1',
        }),
        getStoredTokenWithRefresh({
          ...baseOpts,
          connectorId: lockedConnectorId,
          isPerUser: true,
          profileUid: 'profile-2',
        }),
      ]);

      // Each user refreshed independently — no sharing of the lock
      expect(refreshFn).toHaveBeenCalledTimes(2);
      expect(result1).toBe('Bearer new-access-token');
      expect(result2).toBe('Bearer new-access-token-user2');
    });
  });
});
