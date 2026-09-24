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
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getEarsAccessToken } from './get_ears_access_token';
import { requestEarsRefreshToken } from './request_ears_refresh_token';

jest.mock('./request_ears_refresh_token', () => ({
  requestEarsRefreshToken: jest.fn(),
}));

const NOW = new Date('2024-01-15T12:00:00.000Z');

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const PROVIDER = 'my-provider';

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

// Per-user token stored under credentials.accessToken / credentials.refreshToken
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
  provider: PROVIDER,
  connectorTokenClient,
};

let clock: sinon.SinonFakeTimers;

describe('getEarsAccessToken', () => {
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

      const result = await getEarsAccessToken(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Errors fetching connector token for connectorId: connector-1'
      );
    });

    it('throws ConnectorAuthorizationError with reason no_token when no token is stored', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });

      const error = await getEarsAccessToken(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('no_token');
      expect(error.authMethod).toBe('ears');
    });

    it('returns the stored token without refreshing when it has not expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validToken,
      });

      const result = await getEarsAccessToken(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(requestEarsRefreshToken).not.toHaveBeenCalled();
    });

    it('treats a token with no expiresAt as never-expiring', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validToken, expiresAt: undefined },
      });

      const result = await getEarsAccessToken(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(requestEarsRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('token refresh', () => {
    it('throws ConnectorAuthorizationError with reason token_expired when access token is expired but no refresh token is stored', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...expiredToken, refreshToken: undefined },
      });

      const error = await getEarsAccessToken(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('token_expired');
      expect(error.authMethod).toBe('ears');
    });

    it('throws ConnectorAuthorizationError with reason refresh_token_expired when the refresh token itself is expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          ...expiredToken,
          refreshTokenExpiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
        },
      });

      const error = await getEarsAccessToken(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('refresh_token_expired');
      expect(error.authMethod).toBe('ears');
    });

    it('returns the refreshed token formatted as "tokenType accessToken"', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getEarsAccessToken(baseOpts);

      expect(result).toBe('Bearer new-access-token');
    });

    it('passes tokenUrl and refreshToken to requestEarsRefreshToken', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getEarsAccessToken(baseOpts);

      expect(requestEarsRefreshToken).toHaveBeenCalledWith(
        PROVIDER,
        logger,
        { refreshToken: 'stored-refresh-token' },
        configurationUtilities
      );
    });

    it('persists the refreshed token and the new refresh token from the response', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      await getEarsAccessToken(baseOpts);

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
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce({
        ...refreshResponse,
        refreshToken: undefined,
      });

      await getEarsAccessToken(baseOpts);

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
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getEarsAccessToken({ ...baseOpts, forceRefresh: true });

      expect(result).toBe('Bearer new-access-token');
      expect(requestEarsRefreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('throws ConnectorAuthorizationError with reason refresh_failed when requestEarsRefreshToken throws', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockRejectedValueOnce(
        new Error('EARS endpoint unreachable')
      );

      const error = await getEarsAccessToken(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('refresh_failed');
      expect(error.authMethod).toBe('ears');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: EARS endpoint unreachable'
      );
    });

    it('throws ConnectorAuthorizationError with reason refresh_failed when persisting the refreshed token fails', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);
      connectorTokenClient.updateWithRefreshToken.mockRejectedValueOnce(
        new Error('DB write failed')
      );

      const error = await getEarsAccessToken(baseOpts).catch((e) => e);

      expect(error).toBeInstanceOf(ConnectorAuthorizationError);
      expect(error.reason).toBe('refresh_failed');
      expect(error.authMethod).toBe('ears');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: DB write failed'
      );
    });
  });

  describe('per-user auth mode', () => {
    it('returns null and warns when authMode is per-user but profileUid is missing', async () => {
      const result = await getEarsAccessToken({
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

      await getEarsAccessToken({
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

      const result = await getEarsAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(result).toBe('stored-per-user-access-token');
      expect(requestEarsRefreshToken).not.toHaveBeenCalled();
    });

    it('refreshes using credentials.refreshToken for an expired per-user token', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredPerUserToken,
      });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const result = await getEarsAccessToken({
        ...baseOpts,
        authMode: 'per-user',
        profileUid: 'profile-1',
      });

      expect(requestEarsRefreshToken).toHaveBeenCalledWith(
        PROVIDER,
        logger,
        { refreshToken: 'stored-per-user-refresh-token' },
        configurationUtilities
      );
      expect(result).toBe('Bearer new-access-token');
    });

    it('warns and returns null when the per-user token exists but credentials.accessToken is absent', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validPerUserToken, credentials: {} },
      });

      const result = await getEarsAccessToken({
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
      connectorTokenClient.get
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...expiredToken, connectorId: lockedConnectorId },
        })
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: { ...validToken, connectorId: lockedConnectorId },
        });
      (requestEarsRefreshToken as jest.Mock).mockResolvedValueOnce(refreshResponse);

      const [result1, result2] = await Promise.all([
        getEarsAccessToken({ ...baseOpts, connectorId: lockedConnectorId }),
        getEarsAccessToken({ ...baseOpts, connectorId: lockedConnectorId }),
      ]);

      expect(requestEarsRefreshToken).toHaveBeenCalledTimes(1);
      expect(result1).toBe('Bearer new-access-token');
      expect(result2).toBe('stored-access-token');
    });
  });
});
