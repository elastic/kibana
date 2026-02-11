/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

// Per-connector locks to prevent concurrent token refreshes for the same connector
const tokenRefreshLocks = new Map<string, ReturnType<typeof pLimit>>();

function getOrCreateLock(connectorId: string): ReturnType<typeof pLimit> {
  if (!tokenRefreshLocks.has(connectorId)) {
    // Using p-limit with concurrency of 1 creates a mutex (only 1 operation at a time)
    tokenRefreshLocks.set(connectorId, pLimit(1));
  }
  return tokenRefreshLocks.get(connectorId)!;
}

export interface GetOAuthAuthorizationCodeConfig {
  clientId: string;
  tokenUrl: string;
  additionalFields?: Record<string, unknown>;
  useBasicAuth?: boolean;
}

export interface GetOAuthAuthorizationCodeSecrets {
  clientSecret: string;
}

interface GetOAuthAuthorizationCodeAccessTokenOpts {
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: {
    config: GetOAuthAuthorizationCodeConfig;
    secrets: GetOAuthAuthorizationCodeSecrets;
  };
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
 * Get an access token for OAuth2 Authorization Code flow
 * Automatically refreshes expired tokens using the refresh token
 */
export const getOAuthAuthorizationCodeAccessToken = async ({
  connectorId,
  logger,
  configurationUtilities,
  credentials,
  connectorTokenClient,
  scope,
  forceRefresh = false,
}: GetOAuthAuthorizationCodeAccessTokenOpts): Promise<string | null> => {
  const { clientId, tokenUrl, additionalFields, useBasicAuth } = credentials.config;
  const { clientSecret } = credentials.secrets;

  if (!clientId || !clientSecret) {
    logger.warn(`Missing required fields for requesting OAuth Authorization Code access token`);
    return null;
  }

  // Default to true (OAuth 2.0 recommended practice)
  const shouldUseBasicAuth = useBasicAuth ?? true;

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
      const tokenResult = await requestOAuthRefreshToken(
        tokenUrl,
        logger,
        {
          refreshToken,
          clientId,
          clientSecret,
          scope,
          ...additionalFields,
        },
        configurationUtilities,
        shouldUseBasicAuth
      );

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
