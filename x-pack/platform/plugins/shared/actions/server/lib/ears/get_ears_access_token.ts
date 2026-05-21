/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import { EARS_AUTH_ID } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { ConnectorTokenClientContract } from '../../types';
import { requestEarsRefreshToken } from './request_ears_refresh_token';
import { getStoredTokenWithRefresh } from '../get_stored_oauth_token_with_refresh';

interface GetEarsAccessTokenOpts {
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  provider: string;
  connectorTokenClient: ConnectorTokenClientContract;
  authMode?: AuthMode;
  profileUid?: string;
  /**
   * When true, skip the expiration check and force a token refresh.
   * Use this when you've received a 401 and know the token is invalid
   * even if it hasn't "expired" according to the stored timestamp.
   */
  forceRefresh?: boolean;
}

/**
 * Get an access token for EARS OAuth flow from storage.
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
  provider,
  connectorTokenClient,
  authMode,
  profileUid,
  forceRefresh = false,
}: GetEarsAccessTokenOpts): Promise<string | null> => {
  const isPerUser = authMode === 'per-user';

  if (isPerUser && !profileUid) {
    logger.warn(
      `Per-user authMode requires a profileUid for connectorId: ${connectorId}. Cannot retrieve token.`
    );
    return null;
  }

  return getStoredTokenWithRefresh({
    connectorId,
    logger,
    connectorTokenClient,
    authMethod: EARS_AUTH_ID,
    forceRefresh,
    isPerUser,
    profileUid,
    authMode,
    treatRefreshFailureAsAuthError: true,
    refreshFn: (refreshToken) =>
      requestEarsRefreshToken(provider, logger, { refreshToken }, configurationUtilities),
  });
};
