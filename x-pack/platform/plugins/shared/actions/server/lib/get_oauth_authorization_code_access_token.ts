/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import type { TokenResponseOptions } from './request_oauth_token';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';
import { getStoredTokenWithRefresh } from './get_stored_oauth_token_with_refresh';

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
  authMode?: AuthMode;
  profileUid?: string;
  /**
   * When true, skip the expiration check and force a token refresh.
   * Use this when you've received a 401 and know the token is invalid
   * even if it hasn't "expired" according to the stored timestamp.
   */
  forceRefresh?: boolean;
  tokenResponseOptions?: TokenResponseOptions;
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
  authMode,
  profileUid,
  forceRefresh = false,
  tokenResponseOptions,
}: GetOAuthAuthorizationCodeAccessTokenOpts): Promise<string | null> => {
  const { clientId, tokenUrl, additionalFields, useBasicAuth } = credentials.config;
  const { clientSecret } = credentials.secrets;

  if (!clientId || !clientSecret) {
    logger.warn(`Missing required fields for requesting OAuth Authorization Code access token`);
    return null;
  }

  const isPerUser = authMode === 'per-user';

  if (isPerUser && !profileUid) {
    logger.warn(
      `Per-user authMode requires a profileUid for connectorId: ${connectorId}. Cannot retrieve token.`
    );
    return null;
  }

  // Default to true (OAuth 2.0 recommended practice)
  const shouldUseBasicAuth = useBasicAuth ?? true;

  return getStoredTokenWithRefresh({
    connectorId,
    logger,
    connectorTokenClient,
    forceRefresh,
    isPerUser,
    profileUid,
    authMode,
    refreshFn: (refreshToken) =>
      requestOAuthRefreshToken(
        tokenUrl,
        logger,
        { refreshToken, clientId, clientSecret, scope, ...additionalFields },
        configurationUtilities,
        shouldUseBasicAuth,
        tokenResponseOptions
      ),
  });
};
