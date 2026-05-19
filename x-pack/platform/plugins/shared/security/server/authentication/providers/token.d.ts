import type { KibanaRequest } from '@kbn/core/server';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { TokenPair } from '../tokens';
/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
interface ProviderLoginAttempt {
    username: string;
    password: string;
}
/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;
/**
 * Provider that supports token-based request authentication.
 */
export declare class TokenAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
    /**
     * Type of the provider.
     */
    static readonly type = "token";
    /**
     * Performs initial login request using username and password.
     * @param request Request instance.
     * @param attempt User credentials.
     */
    login(request: KibanaRequest, { username, password }: ProviderLoginAttempt): Promise<AuthenticationResult>;
    /**
     * Performs token-based request authentication
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Redirects user to the login page preserving query string parameters.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    logout(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<DeauthenticationResult>;
    /**
     * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
     * that provider attaches to all successfully authenticated requests to Elasticsearch.
     */
    getHTTPAuthenticationScheme(): string;
    /**
     * Tries to extract authorization header from the state and adds it to the request before
     * it's forwarded to Elasticsearch backend.
     * @param request Request instance.
     * @param session Session value previously stored by the provider.
     */
    private authenticateViaState;
    /**
     * This method is only called when authentication via access token stored in the state failed because of expired
     * token. So we should use refresh token, that is also stored in the state, to extend expired access token and
     * authenticate user with it.
     * @param request Request instance.
     * @param state State value previously stored by the provider.
     */
    private authenticateViaRefreshToken;
    /**
     * Constructs login page URL using current url path as `next` query string parameter.
     * @param request Request instance.
     */
    private getLoginPageURL;
}
export {};
