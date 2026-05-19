import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { AsApiContract } from '../../common';
export interface TokenResponseOptions {
    accessTokenPath?: string;
    tokenTypePath?: string;
    /** Literal token type for Authorization header; when set, bypasses `tokenTypePath` extraction. */
    tokenType?: string;
}
/**
 * Builds a TokenResponseOptions from a bag of optional fields.
 * Returns undefined when no custom options are set (all callers get default behavior).
 */
export declare const buildTokenResponseOptions: (opts: {
    accessTokenPath?: string;
    tokenTypePath?: string;
    tokenType?: string;
}) => TokenResponseOptions | undefined;
export interface OAuthTokenResponse {
    tokenType: string;
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string;
    refreshTokenExpiresIn?: number;
}
export declare function requestOAuthToken<T>(tokenUrl: string, grantType: string, configurationUtilities: ActionsConfigurationUtilities, logger: Logger, bodyRequest: AsApiContract<T>, useBasicAuth?: boolean, tokenResponseOptions?: TokenResponseOptions): Promise<OAuthTokenResponse>;
