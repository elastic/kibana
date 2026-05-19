import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
/**
 * Credentials that are based on the username and password.
 */
interface UsernameAndPasswordCredentials {
    username: string;
    password: string;
}
/**
 * Credentials that are based on the Elasticsearch API key.
 */
interface APIKeyCredentials {
    apiKey: {
        id: string;
        key: string;
    } | string;
}
/**
 * Credentials that imply authentication based on the Elasticsearch native anonymous user.
 */
type ElasticsearchAnonymousUserCredentials = 'elasticsearch_anonymous_user';
/**
 * Provider that supports anonymous request authentication.
 */
export declare class AnonymousAuthenticationProvider extends BaseAuthenticationProvider {
    protected readonly options: Readonly<AuthenticationProviderOptions>;
    /**
     * Type of the provider.
     */
    static readonly type = "anonymous";
    /**
     * Defines HTTP authorization header that should be used to authenticate request. It isn't defined
     * if provider should rely on Elasticsearch native anonymous access.
     */
    private readonly httpAuthorizationHeader;
    /**
     * Create authorization header for the specified credentials. Returns `null` if credentials imply
     * Elasticsearch anonymous user.
     * @param credentials Credentials to create HTTP authorization header for.
     */
    static createHTTPAuthorizationHeader(credentials: Readonly<ElasticsearchAnonymousUserCredentials | UsernameAndPasswordCredentials | APIKeyCredentials>): HTTPAuthorizationHeader | null;
    constructor(options: Readonly<AuthenticationProviderOptions>, anonymousOptions?: Readonly<{
        credentials?: Readonly<ElasticsearchAnonymousUserCredentials | UsernameAndPasswordCredentials | APIKeyCredentials>;
    }>);
    /**
     * Performs initial login request.
     * @param request Request instance.
     * @param session Optional session object associated with the provider.
     */
    login(request: KibanaRequest, session?: SessionValue | null): Promise<AuthenticationResult>;
    /**
     * Performs request authentication.
     * @param request Request instance.
     * @param session Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue | null): Promise<AuthenticationResult>;
    /**
     * Redirects user to the logged out page.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    logout(request: KibanaRequest, session?: SessionValue | null): Promise<DeauthenticationResult>;
    /**
     * Returns HTTP authentication scheme (`Basic` or `ApiKey`) that's used within `Authorization`
     * HTTP header that provider attaches to all successfully authenticated requests to Elasticsearch.
     */
    getHTTPAuthenticationScheme(): string | null;
    /**
     * Tries to authenticate user request via configured credentials encoded into `Authorization` header.
     * @param request Request instance.
     * @param session Session previously stored by the provider.
     */
    private authenticateViaAuthorizationHeader;
}
export {};
