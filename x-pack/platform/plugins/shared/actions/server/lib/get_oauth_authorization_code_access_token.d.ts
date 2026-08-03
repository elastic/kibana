import type { Logger } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import type { TokenResponseOptions } from './request_oauth_token';
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
export declare const getOAuthAuthorizationCodeAccessToken: ({ connectorId, logger, configurationUtilities, credentials, connectorTokenClient, scope, authMode, profileUid, forceRefresh, tokenResponseOptions, }: GetOAuthAuthorizationCodeAccessTokenOpts) => Promise<string | null>;
export {};
