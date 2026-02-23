/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
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

const refreshResponse = {
  tokenType: 'Bearer',
  accessToken: 'new-access-token',
  expiresIn: 3600,
  refreshToken: 'new-refresh-token',
  refreshTokenExpiresIn: 604800,
};

const doRefresh = jest.fn();

const baseOpts = {
  connectorId: 'connector-1',
  logger,
  connectorTokenClient,
  doRefresh,
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
      expect(doRefresh).not.toHaveBeenCalled();
    });

    it('returns null and warns when no token is stored', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'No access token found for connectorId: connector-1. User must complete OAuth authorization flow.'
      );
      expect(doRefresh).not.toHaveBeenCalled();
    });

    it('returns the stored token without calling doRefresh when it has not expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: validToken,
      });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(doRefresh).not.toHaveBeenCalled();
    });

    it('treats a token with no expiresAt as never-expiring', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...validToken, expiresAt: undefined },
      });

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('stored-access-token');
      expect(doRefresh).not.toHaveBeenCalled();
    });
  });

  describe('token refresh', () => {
    it('returns null and warns when the access token is expired but no refresh token is stored', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: { ...expiredToken, refreshToken: undefined },
      });

      const result = await getStoredTokenWithRefresh(baseOpts);

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

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Refresh token expired for connectorId: connector-1. User must re-authorize.'
      );
    });

    it('calls doRefresh with the stored refresh token when the access token is expired', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      doRefresh.mockResolvedValueOnce(refreshResponse);

      await getStoredTokenWithRefresh(baseOpts);

      expect(doRefresh).toHaveBeenCalledWith('stored-refresh-token');
    });

    it('returns the refreshed token formatted as "tokenType accessToken"', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      doRefresh.mockResolvedValueOnce(refreshResponse);

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBe('Bearer new-access-token');
    });

    it('persists the refreshed token and the new refresh token from the response', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      doRefresh.mockResolvedValueOnce(refreshResponse);

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
      doRefresh.mockResolvedValueOnce({ ...refreshResponse, refreshToken: undefined });

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
      doRefresh.mockResolvedValueOnce(refreshResponse);

      const result = await getStoredTokenWithRefresh({ ...baseOpts, forceRefresh: true });

      expect(result).toBe('Bearer new-access-token');
      expect(doRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('returns null and logs an error when doRefresh throws', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      doRefresh.mockRejectedValueOnce(new Error('upstream auth failed'));

      const result = await getStoredTokenWithRefresh(baseOpts);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token for connectorId: connector-1. Error: upstream auth failed'
      );
    });

    it('returns null and logs an error when persisting the refreshed token fails', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      doRefresh.mockResolvedValueOnce(refreshResponse);
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
});
