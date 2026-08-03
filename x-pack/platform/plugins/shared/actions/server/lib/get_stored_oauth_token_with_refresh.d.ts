import type { Logger } from '@kbn/core/server';
import type { OAuthTokenResponse } from './request_oauth_token';
import type { ConnectorTokenClientContract } from '../types';
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
export declare const getStoredTokenWithRefresh: ({ connectorId, logger, connectorTokenClient, authMethod, forceRefresh, isPerUser, profileUid, authMode, refreshFn, treatRefreshFailureAsAuthError, }: GetStoredTokenWithRefreshOpts) => Promise<string | null>;
