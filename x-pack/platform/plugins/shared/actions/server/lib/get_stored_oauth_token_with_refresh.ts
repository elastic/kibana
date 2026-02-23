/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { OAuthTokenResponse } from './request_oauth_token';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';

// Per-connector locks to prevent concurrent token refreshes for the same connector
const tokenRefreshLocks = new Map<string, ReturnType<typeof pLimit>>();

function getOrCreateLock(connectorId: string): ReturnType<typeof pLimit> {
  if (!tokenRefreshLocks.has(connectorId)) {
    tokenRefreshLocks.set(connectorId, pLimit(1));
  }
  return tokenRefreshLocks.get(connectorId)!;
}

export interface GetStoredTokenWithRefreshOpts {
  connectorId: string;
  logger: Logger;
  connectorTokenClient: ConnectorTokenClientContract;
  /**
   * When true, skip the expiration check and force a token refresh.
   * Use this when you've received a 401 and know the token is invalid
   * even if it hasn't "expired" according to the stored timestamp.
   */
  forceRefresh?: boolean;
  /**
   * Called when a refresh is needed. Receives the stored refresh token
   * and must return a new token response from the auth server.
   */
  doRefresh: (refreshToken: string) => Promise<OAuthTokenResponse>;
}

/**
 * Retrieves a stored OAuth access token, refreshing it automatically when expired.
 *
 * Handles the common lifecycle shared by all per-user OAuth flows:
 * - Fetching the stored token from the connector token client
 * - Validating expiry (access token and refresh token)
 * - Calling the provided `doRefresh` to obtain a new token from the auth server
 * - Persisting the refreshed token back to storage
 *
 * Concurrent refresh requests for the same connector are serialized via a
 * per-connector mutex to avoid redundant token requests.
 */
export const getStoredTokenWithRefresh = async ({
  connectorId,
  logger,
  connectorTokenClient,
  forceRefresh = false,
  doRefresh,
}: GetStoredTokenWithRefreshOpts): Promise<string | null> => {
  // Acquire lock for this connector to prevent concurrent token refreshes
  const lock = getOrCreateLock(connectorId);

  return await lock(async () => {
    // Re-fetch token inside lock - another request may have already refreshed it
    const { connectorToken, hasErrors } = await connectorTokenClient.get({
      connectorId,
      tokenType: 'access_token',
    });

    if (hasErrors) {
      logger.warn(`Errors fetching connector token for connectorId: ${connectorId}`);
      return null;
    }

    // No token found - user must authorize first
    if (!connectorToken) {
      logger.warn(
        `No access token found for connectorId: ${connectorId}. User must complete OAuth authorization flow.`
      );
      return null;
    }

    const token = connectorToken as ConnectorToken;

    // Check if access token is still valid (may have been refreshed by another request)
    const now = Date.now();
    const expiresAt = token.expiresAt ? Date.parse(token.expiresAt) : Infinity;

    if (!forceRefresh && expiresAt > now) {
      // Token still valid
      logger.debug(`Using stored access token for connectorId: ${connectorId}`);
      return token.token;
    }

    const refreshToken = typeof token.refreshToken === 'string' ? token.refreshToken : undefined;
    if (!refreshToken) {
      logger.warn(
        `Access token expired and no refresh token available for connectorId: ${connectorId}. User must re-authorize.`
      );
      return null;
    }

    // Check if the refresh token is expired
    if (token.refreshTokenExpiresAt && Date.parse(token.refreshTokenExpiresAt) <= now) {
      logger.warn(`Refresh token expired for connectorId: ${connectorId}. User must re-authorize.`);
      return null;
    }

    // Refresh the token
    logger.debug(`Refreshing access token for connectorId: ${connectorId}`);
    try {
      const tokenResult = await doRefresh(refreshToken);

      const newAccessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;

      const updatedRefreshToken: string | undefined = tokenResult.refreshToken ?? refreshToken;

      // Update stored token
      await connectorTokenClient.updateWithRefreshToken({
        id: token.id!,
        token: newAccessToken,
        refreshToken: updatedRefreshToken,
        expiresIn: tokenResult.expiresIn,
        refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn,
        tokenType: 'access_token',
      });

      return newAccessToken;
    } catch (err) {
      logger.error(
        `Failed to refresh access token for connectorId: ${connectorId}. Error: ${err.message}`
      );
      return null;
    }
  });
};
