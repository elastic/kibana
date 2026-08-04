import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { OAuthTokenResponse } from '../request_oauth_token';
export interface EarsRefreshTokenRequestParams {
    refreshToken: string;
}
/**
 * Refresh an access token via the EARS refresh endpoint.
 *
 * EARS uses a JSON request body with `{ refresh_token }` — no grant_type,
 * no client credentials. The refresh endpoint is derived from the token URL
 * by replacing `/token` with `/refresh`.
 */
export declare function requestEarsRefreshToken(provider: string, logger: Logger, params: EarsRefreshTokenRequestParams, configurationUtilities: ActionsConfigurationUtilities): Promise<OAuthTokenResponse>;
