import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
interface HTTPAuthenticationProviderOptions {
    supportedSchemes: Set<string>;
    jwt?: {
        taggedRoutesOnly: boolean;
    };
}
/**
 * Provider that supports request authentication via forwarding `Authorization` HTTP header to Elasticsearch.
 */
export declare class HTTPAuthenticationProvider extends BaseAuthenticationProvider {
    protected readonly options: Readonly<AuthenticationProviderOptions>;
    /**
     * Type of the provider.
     */
    static readonly type = "http";
    /**
     * Set of the schemes (`Basic`, `Bearer` etc.) that provider expects to see within `Authorization`
     * HTTP header while authenticating request.
     */
    private readonly supportedSchemes;
    /**
     * Options relevant to the JWT authentication.
     */
    private readonly jwt;
    constructor(options: Readonly<AuthenticationProviderOptions>, httpOptions: Readonly<HTTPAuthenticationProviderOptions>);
    /**
     * NOT SUPPORTED.
     */
    login(): Promise<AuthenticationResult>;
    /**
     * Performs request authentication using provided `Authorization` HTTP headers.
     * @param request Request instance.
     */
    authenticate(request: KibanaRequest): Promise<AuthenticationResult>;
    /**
     * NOT SUPPORTED.
     */
    logout(): Promise<DeauthenticationResult>;
    /**
     * Returns `null` since provider doesn't attach any additional `Authorization` HTTP headers to
     * successfully authenticated requests to Elasticsearch.
     */
    getHTTPAuthenticationScheme(): null;
    /**
     * Exchanges a UIAM OAuth access token for an ephemeral token via the UIAM service, verifies
     * the audience, and resolves the user via Elasticsearch using the ephemeral token.
     */
    private authenticateViaUiamOAuth;
}
export {};
