import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse, TokenResponseOptions } from './request_oauth_token';
export declare const OAUTH_AUTHORIZATION_CODE_GRANT_TYPE = "authorization_code";
export interface AuthorizationCodeOAuthRequestParams {
    code: string;
    redirectUri: string;
    codeVerifier: string;
    clientId: string;
    clientSecret: string;
    [key: string]: unknown;
}
export declare function requestOAuthAuthorizationCodeToken(tokenUrl: string, logger: Logger, params: AuthorizationCodeOAuthRequestParams, configurationUtilities: ActionsConfigurationUtilities, useBasicAuth?: boolean, // Default to true (OAuth 2.0 recommended practice)
tokenResponseOptions?: TokenResponseOptions): Promise<OAuthTokenResponse>;
