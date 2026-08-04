import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse } from './request_oauth_token';
export declare const OAUTH_JWT_BEARER_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
export interface JWTOAuthRequestParams {
    assertion: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
}
export declare function requestOAuthJWTToken(tokenUrl: string, params: JWTOAuthRequestParams, logger: Logger, configurationUtilities: ActionsConfigurationUtilities): Promise<OAuthTokenResponse>;
