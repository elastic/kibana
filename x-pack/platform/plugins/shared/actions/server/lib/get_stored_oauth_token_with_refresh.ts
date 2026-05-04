/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import { ConnectorAuthorizationError } from '@kbn/connector-specs';
import type { OAuthTokenResponse } from './request_oauth_token';
import type { ConnectorToken, ConnectorTokenClientContract, UserConnectorToken } from '../types';

// Per-connector (or per-connector-per-user) locks to prevent concurrent token refreshes
const tokenRefreshLocks = new Map<string, ReturnType<typeof pLimit>>();

function getOrCreateLock(lockKey: string): ReturnType<typeof pLimit> {
  if (!tokenRefreshLocks.has(lockKey)) {
    tokenRefreshLocks.set(lockKey, pLimit(1));
  }
  return tokenRefreshLocks.get(lockKey)!;
}

export interface GetStoredTokenWithRefreshOpts {
  connectorId: string;
  logger: Logger;
  connectorTokenClient: ConnectorTokenClientContract;
  /**
   * Identifies the auth type that initiated the refresh (e.g. 'oauth_authorization_code',
   * 'ears'). Propagated onto any `ConnectorAuthorizationError` thrown from this function
   * so downstream consumers can report which auth flow needs re-authorization.
   */
  authMethod: string;
  /**
   * When true, skip the expiration check and force a token refresh.
   * Use this when you've received a 401 and know the token is invalid
   * even if it hasn't "expired" according to the stored timestamp.
   */
  forceRefresh?: boolean;
  isPerUser?: boolean;
  /** Required when `isPerUser` is true to look up the per-user stored token. */
  profileUid?: string;
  /** Used in log messages to identify the auth mode (e.g. 'per-user'). */
  authMode?: string;
  /**
   * Called when a refresh is needed. Receives the stored refresh token
   * and must return a new token response from the auth server.
   */
  refreshFn: (refreshToken: string) => Promise<OAuthTokenResponse>;
  /**
   * When true, treat any refresh failure as an authorization error requiring
   * user re-authorization. Use when the refresh endpoint does not return
   * structured error codes (e.g. EARS), so transient failures cannot be
   * distinguished from permanent authorization failures.
   *
   * When false (default), only `invalid_grant` errors from the OAuth server
   * are treated as authorization failures; other errors return null and let
   * the caller decide whether to retry.
   */
  treatRefreshFailureAsAuthError?: boolean;
}

interface ExtractedStoredOAuthTokens {
  accessToken: string | null;
  refreshToken: string | undefined;
}

const getStringField = (obj: unknown, path: string): string | undefined => {
  const value = get(obj, path);
  return typeof value === 'string' ? value : undefined;
};

const extractStoredOAuthTokens = ({
  connectorToken,
  isPerUser,
}: {
  connectorToken: ConnectorToken | UserConnectorToken;
  isPerUser: boolean;
}): ExtractedStoredOAuthTokens => {
  const accessToken = getStringField(
    connectorToken,
    isPerUser ? 'credentials.accessToken' : 'token'
  );
  const refreshToken = getStringField(
    connectorToken,
    isPerUser ? 'credentials.refreshToken' : 'refreshToken'
  );

  return { accessToken: accessToken ?? null, refreshToken };
};

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
  authMethod,
  forceRefresh = false,
  isPerUser = false,
  profileUid,
  authMode,
  refreshFn,
  treatRefreshFailureAsAuthError = false,
}: GetStoredTokenWithRefreshOpts): Promise<string | null> => {
  // Acquire lock scoped to the connector (shared mode) or to the connector + user (per-user mode),
  // so concurrent requests for different users don't block each other unnecessarily.
  const lockKey = isPerUser ? `${connectorId}:${profileUid}` : connectorId;
  const lock = getOrCreateLock(lockKey);

  try {
    const result = await lock(async () => {
      // Re-fetch token inside lock - another request may have already refreshed it
      const { connectorToken, hasErrors } = isPerUser
        ? await connectorTokenClient.get({
            profileUid: profileUid!,
            connectorId,
            tokenType: 'access_token',
          })
        : await connectorTokenClient.get({
            connectorId,
            tokenType: 'access_token',
          });

      if (hasErrors) {
        logger.warn(`Errors fetching connector token for connectorId: ${connectorId}`);
        return null;
      }

      // No token found - user must authorize first
      if (!connectorToken) {
        throw new ConnectorAuthorizationError({
          authMethod,
          reason: 'no_token',
          message: `No access token found for connectorId: ${connectorId}. User must complete OAuth authorization flow.`,
        });
      }

      // Check if access token is still valid (may have been refreshed by another request)
      const now = Date.now();
      const expiresAt = connectorToken.expiresAt ? Date.parse(connectorToken.expiresAt) : Infinity;

      const extractedTokens = extractStoredOAuthTokens({
        connectorToken: connectorToken as ConnectorToken | UserConnectorToken,
        isPerUser,
      });

      const { accessToken: storedAccessToken, refreshToken: storedRefreshToken } = extractedTokens;

      if (!forceRefresh && expiresAt > now) {
        // Token still valid
        logger.debug(`Using stored access token for connectorId: ${connectorId}`);
        if (storedAccessToken === null) {
          logger.warn(
            `Stored token has unexpected shape for connectorId: ${connectorId} (authMode: ${
              authMode ?? 'shared'
            }). User must re-authorize.`
          );
        }
        return storedAccessToken;
      }

      if (!storedRefreshToken) {
        throw new ConnectorAuthorizationError({
          authMethod,
          reason: 'token_expired',
          message: `Access token expired and no refresh token available for connectorId: ${connectorId}. User must re-authorize.`,
        });
      }

      // Check if the refresh token is expired
      if (
        connectorToken.refreshTokenExpiresAt &&
        Date.parse(connectorToken.refreshTokenExpiresAt) <= now
      ) {
        throw new ConnectorAuthorizationError({
          authMethod,
          reason: 'refresh_token_expired',
          message: `Refresh token expired for connectorId: ${connectorId}. User must re-authorize.`,
        });
      }

      // Refresh the token
      logger.debug(`Refreshing access token for connectorId: ${connectorId}`);
      try {
        const tokenResult = await refreshFn(storedRefreshToken);

        const newAccessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;

        const updatedRefreshToken: string | undefined =
          tokenResult.refreshToken ?? storedRefreshToken;

        // Update stored token
        await connectorTokenClient.updateWithRefreshToken({
          id: connectorToken.id!,
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

        const isTokenRevoked =
          typeof err.message === 'string' && err.message.includes('invalid_grant');

        if (isTokenRevoked) {
          throw new ConnectorAuthorizationError({
            authMethod,
            reason: 'token_revoked',
            message: `Failed to refresh access token for connectorId: ${connectorId}. User must re-authorize.`,
          });
        }

        if (treatRefreshFailureAsAuthError) {
          throw new ConnectorAuthorizationError({
            authMethod,
            reason: 'refresh_failed',
            message: `Failed to refresh access token for connectorId: ${connectorId}. User must re-authorize.`,
          });
        }

        return null;
      }
    });

    return result;
  } finally {
    if (lock.pendingCount === 0 && lock.activeCount === 0) {
      tokenRefreshLocks.delete(lockKey);
    }
  }
};
