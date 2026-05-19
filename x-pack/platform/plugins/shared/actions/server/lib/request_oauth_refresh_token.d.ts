import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse, TokenResponseOptions } from './request_oauth_token';
export declare const OAUTH_REFRESH_TOKEN_GRANT_TYPE = "refresh_token";
export interface RefreshTokenOAuthRequestParams {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
    [key: string]: unknown;
}
export declare function requestOAuthRefreshToken(tokenUrl: string, logger: Logger, params: RefreshTokenOAuthRequestParams, configurationUtilities: ActionsConfigurationUtilities, useBasicAuth?: boolean, tokenResponseOptions?: TokenResponseOptions): Promise<OAuthTokenResponse>;
