import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse } from './request_oauth_token';
export declare const OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE = "client_credentials";
export interface ClientCredentialsOAuthRequestParams {
    scope?: string;
    clientId?: string;
    clientSecret?: string;
    [key: string]: unknown;
}
export declare function requestOAuthClientCredentialsToken(tokenUrl: string, logger: Logger, params: ClientCredentialsOAuthRequestParams, configurationUtilities: ActionsConfigurationUtilities, tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic'): Promise<OAuthTokenResponse>;
