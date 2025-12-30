/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

export interface GetOAuthAuthorizationCodeConfig {
  clientId: string;
  tokenUrl: string;
  additionalFields?: Record<string, unknown>;
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
}: GetOAuthAuthorizationCodeAccessTokenOpts): Promise<string | null> => {
  const { clientId, tokenUrl, additionalFields } = credentials.config;
  const { clientSecret } = credentials.secrets;

  if (!clientId || !clientSecret) {
    logger.warn(`Missing required fields for requesting OAuth Authorization Code access token`);
    return null;
  }

  // Get stored token
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

  // Check if access token is still valid
  const now = Date.now();
  const expiresAt = connectorToken.expiresAt ? Date.parse(connectorToken.expiresAt) : Infinity;

  if (expiresAt > now) {
    // Token still valid
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

  // Check if refresh token is expired
  if (
    connectorToken.refreshTokenExpiresAt &&
    Date.parse(connectorToken.refreshTokenExpiresAt) <= now
  ) {
    logger.warn(`Refresh token expired for connectorId: ${connectorId}. User must re-authorize.`);
    return null;
  }

  // Refresh the token
  logger.debug(`Refreshing access token for connectorId: ${connectorId}`);
  const requestTokenStart = Date.now();

  try {
    const tokenResult = await requestOAuthRefreshToken(
      tokenUrl,
      logger,
      {
        refreshToken: connectorToken.refreshToken,
        clientId,
        clientSecret,
        scope,
        ...additionalFields,
      },
      configurationUtilities
    );

    const newAccessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;
    const newRefreshToken = tokenResult.refreshToken || connectorToken.refreshToken;

    // Calculate expiration times
    const accessTokenExpiresAt = tokenResult.expiresIn
      ? new Date(requestTokenStart + tokenResult.expiresIn * 1000).toISOString()
      : undefined;

    const refreshTokenExpiresAt = tokenResult.refreshTokenExpiresIn
      ? new Date(requestTokenStart + tokenResult.refreshTokenExpiresIn * 1000).toISOString()
      : connectorToken.refreshTokenExpiresAt;

    // Update stored token
    await connectorTokenClient.updateWithRefreshToken({
      id: connectorToken.id!,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAtMillis: accessTokenExpiresAt,
      refreshTokenExpiresAtMillis: refreshTokenExpiresAt,
      tokenType: 'access_token',
    });

    return newAccessToken;
  } catch (err) {
    logger.error(
      `Failed to refresh access token for connectorId: ${connectorId}. Error: ${err.message}`
    );
    return null;
  }
};
