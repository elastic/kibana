import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticationProviderOptions, AuthenticationProviderSpecificOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { TokenPair } from '../tokens';
/**
 * Describes possible OpenID Connect login flows.
 */
export declare enum OIDCLogin {
    LoginInitiatedByUser = "login-by-user",
    LoginWithImplicitFlow = "login-implicit",
    LoginWithAuthorizationCodeFlow = "login-authorization-code",
    LoginInitiatedBy3rdParty = "login-initiated-by-3rd-party"
}
/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
export type ProviderLoginAttempt = {
    type: OIDCLogin.LoginInitiatedByUser;
    redirectURL: string;
} | {
    type: OIDCLogin.LoginWithImplicitFlow | OIDCLogin.LoginWithAuthorizationCodeFlow;
    authenticationResponseURI: string;
} | {
    type: OIDCLogin.LoginInitiatedBy3rdParty;
    iss: string;
    loginHint?: string;
};
/**
 * The state supported by the provider (for the OpenID Connect handshake or established session).
 */
interface ProviderState extends Partial<TokenPair> {
    /**
     * Unique identifier of the OpenID Connect request initiated the handshake used to mitigate
     * replay attacks.
     */
    nonce?: string;
    /**
     * Unique identifier of the OpenID Connect request initiated the handshake used to mitigate
     * CSRF.
     */
    state?: string;
    /**
     * URL to redirect user to after successful OpenID Connect handshake.
     */
    redirectURL?: string;
    /**
     * The name of the OpenID Connect realm that was used to establish session.
     */
    realm: string;
}
/**
 * Provider that supports authentication using an OpenID Connect realm in Elasticsearch.
 */
export declare class OIDCAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
    protected readonly options: Readonly<AuthenticationProviderOptions>;
    /**
     * Type of the provider.
     */
    static readonly type = "oidc";
    /**
     * Specifies Elasticsearch OIDC realm name that Kibana should use.
     */
    private readonly realm;
    constructor(options: Readonly<AuthenticationProviderOptions>, oidcOptions?: Readonly<AuthenticationProviderSpecificOptions>);
    /**
     * Performs OpenID Connect request authentication.
     * @param request Request instance.
     * @param attempt Login attempt description.
     * @param [session] Optional session object associated with the provider.
     */
    login(request: KibanaRequest, attempt: ProviderLoginAttempt, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Performs OpenID Connect request authentication.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Attempts to handle a request that might be a third party initiated OpenID connect authentication attempt or the
     * OpenID Connect Provider redirecting back the UA after an authentication success/failure. In the former case which
     * is signified by the existence of an iss parameter (either in the query of a GET request or the body of a POST
     * request) it attempts to start the authentication flow by calling initiateOIDCAuthentication.
     *
     * In the latter case, it attempts to exchange the authentication response to an elasticsearch access token, passing
     * along to Elasticsearch the state and nonce parameters from the user's session.
     *
     * When login succeeds the elasticsearch access token and refresh token are stored in the state and user is redirected
     * to the URL that was requested before authentication flow started or to default Kibana location in case of a third
     * party initiated login
     * @param request Request instance.
     * @param authenticationResponseURI This URI contains the authentication response returned from the OP and may contain
     * authorization code that es will exchange for an ID Token in case of Authorization Code authentication flow. Or
     * id/access tokens in case of Implicit authentication flow. Elasticsearch will do all the required validation and
     * parsing for both successful and failed responses.
     * @param [sessionState] Optional state object associated with the provider.
     */
    private loginWithAuthenticationResponse;
    /**
     * Initiates an authentication attempt by either providing the realm name or the issuer to Elasticsearch
     *
     * @param request Request instance.
     * @param params OIDC authentication parameters.
     * @param redirectURL URL user is supposed to be redirected to after successful login.
     */
    private initiateOIDCAuthentication;
    /**
     * Tries to extract an elasticsearch access token from state and adds it to the request before it's
     * forwarded to Elasticsearch backend.
     * @param request Request instance.
     * @param session Session value previously stored by the provider.
     */
    private authenticateViaState;
    /**
     * This method is only called when authentication via an elasticsearch access token stored in the state failed because
     * of expired token. So we should use the elasticsearch refresh token, that is also stored in the state, to extend
     * expired elasticsearch access token and authenticate user with it.
     * @param request Request instance.
     * @param state State value previously stored by the provider.
     */
    private authenticateViaRefreshToken;
    /**
     * Invalidates an elasticsearch access token and refresh token that were originally created as a successful response
     * to an OpenID Connect based authentication. This does not handle OP initiated Single Logout
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
     * Tries to initiate OIDC authentication handshake. If the request already includes user URL hash fragment, we will
     * initiate handshake right away, otherwise we'll redirect user to a dedicated page where we capture URL hash fragment
     * first and only then initiate SAML handshake.
     * @param request Request instance.
     */
    private initiateAuthenticationHandshake;
}
export {};
