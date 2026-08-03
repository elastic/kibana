import type { KibanaRequest } from '@kbn/core/server';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { TokenPair } from '../tokens';
/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;
/**
 * Provider that supports Kerberos request authentication.
 */
export declare class KerberosAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
    /**
     * Type of the provider.
     */
    static readonly type = "kerberos";
    /**
     * Performs initial login request.
     * @param request Request instance.
     */
    login(request: KibanaRequest): Promise<AuthenticationResult>;
    /**
     * Performs Kerberos request authentication.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Invalidates access token retrieved in exchange for SPNEGO token if it exists.
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
     * Tries to authenticate request with `Negotiate ***` Authorization header by passing it to the Elasticsearch backend to
     * get an access token in exchange.
     * @param request Request instance.
     */
    private authenticateWithNegotiateScheme;
    /**
     * Tries to extract access token from state and adds it to the request before it's
     * forwarded to Elasticsearch backend.
     * @param request Request instance.
     * @param session Session object associated with the provider.
     */
    private authenticateViaState;
    /**
     * This method is only called when authentication via access token stored in the state failed because of expired
     * token. So we should use refresh token, that is also stored in the state, to extend expired access token and
     * authenticate user with it.
     * @param request Request instance.
     * @param session Session object associated with the provider.
     */
    private authenticateViaRefreshToken;
    /**
     * Tries to query Elasticsearch and see if we can rely on SPNEGO to authenticate user.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    private authenticateViaSPNEGO;
    /**
     * Extracts `Negotiate` challenge from the list of challenges returned with Elasticsearch error if any.
     * @param error Error to extract challenges from.
     */
    private getNegotiateChallenge;
}
export {};
