import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { OAuthTokenResponse } from '../request_oauth_token';
export interface EarsTokenRequestParams {
    code: string;
    pkceVerifier: string;
}
/**
 * Exchange an authorization code for tokens via the EARS token endpoint.
 *
 * EARS uses a JSON request body with `{ code, pkce_verifier }` — no grant_type,
 * no client credentials, and no redirect_uri.
 */
export declare function requestEarsToken(provider: string, logger: Logger, params: EarsTokenRequestParams, configurationUtilities: ActionsConfigurationUtilities): Promise<OAuthTokenResponse>;
