/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { requestEarsRefreshToken } from './request_ears_refresh_token';

// Per-connector locks to prevent concurrent token refreshes for the same connector
const tokenRefreshLocks = new Map<string, ReturnType<typeof pLimit>>();

function getOrCreateLock(connectorId: string): ReturnType<typeof pLimit> {
  if (!tokenRefreshLocks.has(connectorId)) {
    tokenRefreshLocks.set(connectorId, pLimit(1));
  }
  return tokenRefreshLocks.get(connectorId)!;
}

interface GetEarsAccessTokenOpts {
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  tokenUrl: string;
  connectorTokenClient: ConnectorTokenClientContract;
  scope?: string;
  /**
   * When true, skip the expiration check and force a token refresh.
   * Use this when you've received a 401 and know the token is invalid
   * even if it hasn't "expired" according to the stored timestamp.
   */
  forceRefresh?: boolean;
}

/**
 * Get an access token for EARS OAuth flow.
 * Automatically refreshes expired tokens using the EARS refresh endpoint.
 *
 * Unlike the standard OAuth authorization code flow, EARS does not require
 * clientId/clientSecret — the refresh endpoint is derived from tokenUrl
 * by replacing `/token` with `/refresh`, and the body is JSON `{ refresh_token }`.
 */
export const getEarsAccessToken = async ({
  connectorId,
  logger,
  configurationUtilities,
  tokenUrl,
  connectorTokenClient,
  forceRefresh = false,
}: GetEarsAccessTokenOpts): Promise<string | null> => {
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

    // Check if access token is still valid (may have been refreshed by another request)
    const now = Date.now();
    const expiresAt = connectorToken.expiresAt ? Date.parse(connectorToken.expiresAt) : Infinity;

    if (!forceRefresh && expiresAt > now) {
      logger.debug(`Using stored access token for connectorId: ${connectorId}`);
      return connectorToken.token;
    }

    // Access token expired - attempt refresh
    if (!connectorToken.refreshToken) {
      logger.warn(
        `Access token expired and no refresh token available for connectorId: ${connectorId}. User must re-authorize.`
      );
      return null;
    }

    // Check if the refresh token is expired
    if (
      connectorToken.refreshTokenExpiresAt &&
      Date.parse(connectorToken.refreshTokenExpiresAt) <= now
    ) {
      logger.warn(`Refresh token expired for connectorId: ${connectorId}. User must re-authorize.`);
      return null;
    }

    // Refresh the token via EARS refresh endpoint
    logger.debug(`Refreshing access token for connectorId: ${connectorId} via EARS`);
    try {
      const tokenResult = await requestEarsRefreshToken(
        tokenUrl,
        logger,
        { refreshToken: connectorToken.refreshToken },
        configurationUtilities
      );

      const newAccessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;

      // Update stored token
      await connectorTokenClient.updateWithRefreshToken({
        id: connectorToken.id!,
        token: newAccessToken,
        refreshToken: tokenResult.refreshToken || connectorToken.refreshToken,
        expiresIn: tokenResult.expiresIn,
        refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn,
        tokenType: 'access_token',
      });

      return newAccessToken;
    } catch (err) {
      logger.error(
        `Failed to refresh access token for connectorId: ${connectorId} via EARS. Error: ${err.message}`
      );
      return null;
    }
  });
};
