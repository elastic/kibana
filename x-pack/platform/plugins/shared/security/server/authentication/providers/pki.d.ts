import type { KibanaRequest } from '@kbn/core/server';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
/**
 * The state supported by the provider.
 */
interface ProviderState {
    /**
     * Access token we got in exchange to peer certificate chain.
     */
    accessToken: string;
    /**
     * The SHA-256 digest of the DER encoded peer leaf certificate. It is a `:` separated hexadecimal string.
     */
    peerCertificateFingerprint256: string;
}
/**
 * Provider that supports PKI request authentication.
 */
export declare class PKIAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
    /**
     * Type of the provider.
     */
    static readonly type = "pki";
    /**
     * Performs initial login request.
     * @param request Request instance.
     */
    login(request: KibanaRequest): Promise<AuthenticationResult>;
    /**
     * Performs PKI request authentication.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Invalidates access token retrieved in exchange for peer certificate chain if it exists.
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
     * Tries to extract access token from state and adds it to the request before it's
     * forwarded to Elasticsearch backend.
     * @param request Request instance.
     * @param session Session value previously stored by the provider.
     */
    private authenticateViaState;
    /**
     * Tries to exchange peer certificate chain to access/refresh token pair.
     * @param request Request instance.
     * @param [state] Optional state object associated with the provider.
     */
    private authenticateViaPeerCertificate;
    /**
     * Obtains the peer certificate chain as an ordered array of base64-encoded (Section 4 of RFC4648 - not base64url-encoded)
     * DER PKIX certificate values. Starts from the leaf peer certificate and iterates up to the top-most available certificate
     * authority using `issuerCertificate` certificate property. THe iteration is stopped only when we detect circular reference
     * (root/self-signed certificate) or when `issuerCertificate` isn't available (null or empty object). Automatically attempts to
     * renegotiate the TLS connection once if the peer certificate chain is incomplete.
     * @param request Request instance.
     * @param isRenegotiated Indicates whether connection has been already renegotiated.
     */
    private getCertificateChain;
}
export {};
