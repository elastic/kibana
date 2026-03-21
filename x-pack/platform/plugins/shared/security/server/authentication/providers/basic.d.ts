import type { KibanaRequest } from '@kbn/core/server';
import { BaseAuthenticationProvider } from './base';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
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
interface ProviderState {
    /**
     * Content of the HTTP authorization header (`Basic base-64-of-username:password`) that is based
     * on user credentials used at login time and that should be provided with every request to the
     * Elasticsearch on behalf of the authenticated user.
     */
    authorization?: string;
}
/**
 * Provider that supports request authentication via Basic HTTP Authentication.
 */
export declare class BasicAuthenticationProvider extends BaseAuthenticationProvider {
    /**
     * Type of the provider.
     */
    static readonly type = "basic";
    /**
     * Performs initial login request using username and password.
     * @param request Request instance.
     * @param attempt User credentials.
     * @param [state] Optional state object associated with the provider.
     */
    login(request: KibanaRequest, { username, password }: ProviderLoginAttempt, state?: ProviderState | null): Promise<AuthenticationResult>;
    /**
     * Performs request authentication using Basic HTTP Authentication.
     * @param request Request instance.
     * @param [state] Optional state object associated with the provider.
     */
    authenticate(request: KibanaRequest, state?: ProviderState | null): Promise<AuthenticationResult>;
    /**
     * Redirects user to the login page preserving query string parameters.
     * @param request Request instance.
     * @param [state] Optional state object associated with the provider.
     */
    logout(request: KibanaRequest, state?: ProviderState | null): Promise<DeauthenticationResult>;
    /**
     * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
     * that provider attaches to all successfully authenticated requests to Elasticsearch.
     */
    getHTTPAuthenticationScheme(): string;
    /**
     * Tries to extract authorization header from the state and adds it to the request before
     * it's forwarded to Elasticsearch backend.
     * @param request Request instance.
     * @param state State value previously stored by the provider.
     */
    private authenticateViaState;
}
export {};
