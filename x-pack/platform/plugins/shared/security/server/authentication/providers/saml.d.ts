import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { TokenPair } from '../tokens';
type RequestId = string;
/**
 * The state supported by the provider (for the SAML handshake or established session).
 */
interface ProviderState extends Partial<TokenPair> {
    /**
     * Map of redirectURLs by requestId.
     */
    requestIdMap?: Record<RequestId, {
        redirectURL: string;
    }>;
    /**
     * The name of the SAML realm that was used to establish session (may not be known during URL
     * fragment capturing stage).
     */
    realm?: string;
}
/**
 * Describes possible SAML Login flows.
 */
export declare enum SAMLLogin {
    /**
     * The login flow when user initiates SAML handshake (SP Initiated Login).
     */
    LoginInitiatedByUser = "login-by-user",
    /**
     * The login flow when IdP responds with SAML Response payload (last step of the SP Initiated
     * Login or IdP initiated Login).
     */
    LoginWithSAMLResponse = "login-saml-response"
}
/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
type ProviderLoginAttempt = {
    type: SAMLLogin.LoginInitiatedByUser;
    redirectURL: string;
} | {
    type: SAMLLogin.LoginWithSAMLResponse;
    samlResponse: string;
    relayState?: string;
};
/**
 * Provider that supports SAML request authentication.
 */
export declare class SAMLAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
    protected readonly options: Readonly<AuthenticationProviderOptions>;
    /**
     * Type of the provider.
     */
    static readonly type = "saml";
    /**
     * Optionally specifies Elasticsearch SAML realm name that Kibana should use. If not specified
     * Kibana ACS URL is used for realm matching instead.
     */
    private readonly realm?;
    /**
     * Indicates if we should treat non-empty `RelayState` as a deep link in Kibana we should redirect
     * user to after successful IdP initiated login. `RelayState` is ignored for SP initiated login.
     */
    private readonly useRelayStateDeepLink;
    /**
     * Indicates if we should use UIAM service for this SAML provider.
     */
    private readonly useUiam;
    constructor(options: Readonly<AuthenticationProviderOptions>, samlOptions?: Readonly<{
        realm?: string;
        useRelayStateDeepLink?: boolean;
    }>);
    /**
     * Determines whether the intermediate session state should be invalidated after a successful login.
     *
     * For SAML authentication, multiple login attempts can occur concurrently (e.g., when a user opens
     * multiple tabs and each initiates a SAML handshake). Each login attempt generates a unique requestId
     * that is stored in the `requestIdMap` within the provider state. When a SAML response is received
     * and successfully processed, the corresponding requestId is removed from the map.
     *
     * If there are remaining requestIds in the state after a successful login, it indicates that other
     * pending SAML login attempts are still in progress. In this case, the intermediate session should
     * NOT be invalidated, as it needs to persist to handle the responses for those outstanding requests.
     *
     * Only when all requestIds have been processed and removed from the map (i.e., the map is empty or
     * doesn't exist) should the intermediate session be invalidated.
     *
     * @param state Optional state object associated with the provider.
     * @returns `true` if the intermediate session should be invalidated (no pending requests remain),
     *          `false` if there are remaining requestIds and the session must be preserved.
     */
    shouldInvalidateIntermediateSessionAfterLogin(state?: unknown): boolean;
    /**
     * Performs initial login request using SAMLResponse payload.
     * @param request Request instance.
     * @param attempt Login attempt description.
     * @param [session] Optional session object associated with the provider.
     */
    login(request: KibanaRequest, attempt: ProviderLoginAttempt, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Performs SAML request authentication.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    authenticate(request: KibanaRequest, session?: SessionValue<ProviderState> | null): Promise<AuthenticationResult>;
    /**
     * Invalidates SAML/UIAM access token if it exists.
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
     * Validates whether request payload contains `SAMLResponse` parameter that can be exchanged
     * to a proper access token. If state is presented and includes request id then it means
     * that login attempt has been initiated by Kibana itself and request id must be sent to
     * Elasticsearch together with corresponding `SAMLResponse`. Not having state at this stage is
     * indication of potential IdP initiated login, so we should send only `SAMLResponse` that
     * Elasticsearch will decrypt and figure out on its own if it's a legit response from IdP
     * initiated login.
     *
     * When login succeeds access token is stored in the state and user is redirected to the URL
     * that was requested before SAML handshake or to default Kibana location in case of IdP
     * initiated login.
     * @param request Request instance.
     * @param samlResponse SAMLResponse payload string.
     * @param relayState RelayState payload string.
     * @param [state] Optional state object associated with the provider.
     */
    private loginWithSAMLResponse;
    private updateRemainingRequestIds;
    /**
     * Validates whether user retrieved using session is the same as the user defined in the SAML payload.
     * If we can successfully exchange this SAML payload for access and refresh tokens, then we'll
     * invalidate tokens from the existing session and use the new ones instead.
     *
     * The tokens are stored in the state and user is redirected to the default Kibana location, unless
     * we detect that user from existing session isn't the same as defined in SAML payload. In this case
     * we'll forward user to a page with the respective warning.
     * @param request Request instance.
     * @param samlResponse SAMLResponse payload string.
     * @param relayState RelayState payload string.
     * @param existingState State existing user session is based on.
     */
    private loginWithNewSAMLResponse;
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
     * Tries to start SAML handshake and eventually receive a token.
     * @param request Request instance.
     * @param redirectURL URL to redirect user to after successful SAML handshake.
     * @param [session] Optional session object associated with the provider.
     */
    private authenticateViaHandshake;
    private updateRequestIdMap;
    /**
     * Calls `saml/logout` with access and refresh tokens and redirects user to the Identity Provider if needed.
     * @param accessToken Access token to invalidate.
     * @param refreshToken Refresh token to invalidate.
     */
    private performUserInitiatedSingleLogout;
    /**
     * Calls `saml/invalidate` with the `SAMLRequest` query string parameter received from the Identity
     * Provider and redirects user back to the Identity Provider if needed.
     * @param request Request instance.
     * @param realm Configured SAML realm name.
     */
    private performIdPInitiatedSingleLogout;
    /**
     * Returns true if the Kibana server is configured to be served over HTTPS.
     */
    private isHttps;
    /**
     * Constructs and returns Kibana's Assertion consumer service URL.
     */
    private getACS;
    /**
     * Tries to initiate SAML authentication handshake. If the request already includes user URL hash fragment, we will
     * initiate handshake right away, otherwise we'll redirect user to a dedicated page where we capture URL hash fragment
     * first and only then initiate SAML handshake.
     * @param request Request instance.
     * @param session Optional session object associated with the provider.
     */
    private initiateAuthenticationHandshake;
    /**
     * Determines whether the provided token is a UIAM token. Generally, we shouldn't rely on the
     * shape of the UIAM tokens to trigger UIAM-specific logic, but this is necessary for the
     * transition period while we support both SAML and UIAM tokens at the same time.
     * @param token ES native or UIAM access or refresh token.
     */
    private isUiamToken;
}
export {};
