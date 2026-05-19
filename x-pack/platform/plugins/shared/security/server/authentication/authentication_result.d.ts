import type { AuthHeaders, SessionStorageSetOptions } from '@kbn/core/server';
import type { AuthenticatedUser } from '../../common';
import type { UserProfileGrant } from '../user_profile';
/**
 * Represents status that `AuthenticationResult` can be in.
 */
declare enum AuthenticationResultStatus {
    /**
     * Authentication of the user can't be handled (e.g. supported credentials
     * are not provided).
     */
    NotHandled = "not-handled",
    /**
     * User has been successfully authenticated. Result should be complemented
     * with retrieved user information and optionally with state.
     */
    Succeeded = "succeeded",
    /**
     * User can't be authenticated with the provided credentials. Result should
     * include the error that describes the reason of failure.
     */
    Failed = "failed",
    /**
     * Authentication consists of multiple steps and user should be redirected to
     * a different location to complete it. Can be complemented with optional state.
     */
    Redirected = "redirected"
}
/**
 * Represents additional authentication options.
 */
interface AuthenticationOptions {
    error?: Error;
    challenges?: string[];
    redirectURL?: string;
    state?: unknown;
    stateCookieOptions?: SessionStorageSetOptions;
    user?: AuthenticatedUser;
    authHeaders?: AuthHeaders;
    authResponseHeaders?: AuthHeaders;
    userProfileGrant?: UserProfileGrant;
}
export interface SucceededAuthenticationResultOptions {
    state?: unknown;
    authHeaders?: AuthHeaders;
    authResponseHeaders?: AuthHeaders;
    userProfileGrant?: UserProfileGrant;
}
export interface RedirectedAuthenticationResultOptions {
    state?: unknown;
    stateCookieOptions?: SessionStorageSetOptions;
    user?: AuthenticatedUser;
    authResponseHeaders?: AuthHeaders;
    userProfileGrant?: UserProfileGrant;
}
export interface FailedAuthenticationResultOptions {
    authResponseHeaders?: AuthHeaders;
}
/**
 * Represents the result of an authentication attempt.
 */
export declare class AuthenticationResult {
    private readonly status;
    private readonly options;
    /**
     * Produces `AuthenticationResult` for the case when user can't be authenticated with the
     * provided credentials.
     */
    static notHandled(): AuthenticationResult;
    /**
     * Produces `AuthenticationResult` for the case when authentication succeeds.
     * @param user User information retrieved as a result of successful authentication attempt.
     * @param [userProfileGrant] Optional user profile grant that can be used to activate user profile.
     * @param [authHeaders] Optional dictionary of the HTTP headers with authentication information.
     * @param [authResponseHeaders] Optional dictionary of the HTTP headers with authentication
     * information that should be specified in the response we send to the client request.
     * @param [state] Optional state to be stored and reused for the next request.
     */
    static succeeded(user: AuthenticatedUser, { userProfileGrant, authHeaders, authResponseHeaders, state, }?: SucceededAuthenticationResultOptions): AuthenticationResult;
    /**
     * Produces `AuthenticationResult` for the case when authentication fails.
     * @param error Error that occurred during authentication attempt.
     * @param [authResponseHeaders] Optional dictionary of the HTTP headers with authentication related
     * information (e.g. `WWW-Authenticate` with the challenges) that should be specified in the
     * response we send to the client request.
     */
    static failed(error: Error, { authResponseHeaders }?: FailedAuthenticationResultOptions): AuthenticationResult;
    /**
     * Produces `AuthenticationResult` for the case when authentication needs user to be redirected.
     * @param redirectURL URL that should be used to redirect user to complete authentication.
     * @param [user] Optional user information retrieved as a result of successful authentication attempt.
     * @param [userProfileGrant] Optional user profile grant that can be used to activate user profile.
     * @param [authResponseHeaders] Optional dictionary of the HTTP headers with authentication
     * information that should be specified in the response we send to the client request.
     * @param [state] Optional state to be stored and reused for the next request.
     * @param [stateCookieOptions] Optional overrides for cookie attributes when setting state cookie.
     */
    static redirectTo(redirectURL: string, { user, userProfileGrant, authResponseHeaders, state, stateCookieOptions, }?: RedirectedAuthenticationResultOptions): AuthenticationResult;
    /**
     * Authenticated user instance (only available for `succeeded` or `redirected` result).
     */
    get user(): AuthenticatedUser | undefined;
    /**
     * User profile grant that can be used to activate user profile (only available for `succeeded` and `redirected` results).
     */
    get userProfileGrant(): UserProfileGrant | undefined;
    /**
     * Headers that include authentication information that should be used to authenticate user for any
     * future requests (only available for `succeeded` result).
     */
    get authHeaders(): AuthHeaders | undefined;
    /**
     * Optional dictionary of the HTTP headers with authentication related information (e.g.
     * `WWW-Authenticate` with the challenges) that should be specified in the response we send to
     * the client request (only available for `succeeded` and `failed` results). It's possible to define
     * header value as an array of strings since there are cases when it's necessary to send several
     * headers with the same name, but different values (e.g. in case of `WWW-Authenticate` multiple
     * challenges will result in multiple headers, one per challenge, as it's better supported by the
     * browsers than comma separated list within a single header string).
     */
    get authResponseHeaders(): AuthHeaders | undefined;
    /**
     * State associated with the authenticated user (only available for `succeeded` and `redirected` results).
     */
    get state(): unknown;
    /**
     * Optional overrides for cookie attributes when setting state cookie (only available for `redirected` result).
     */
    get stateCookieOptions(): SessionStorageSetOptions | undefined;
    /**
     * Error that occurred during authentication (only available for `failed` result).
     */
    get error(): Error | undefined;
    /**
     * URL that should be used to redirect user to complete authentication (only available for `redirected` result).
     */
    get redirectURL(): string | undefined;
    /**
     * Constructor is not supposed to be used directly, please use corresponding static factory methods instead.
     * @param status Indicates the status of the authentication result.
     * @param [options] Optional argument that includes additional authentication options.
     */
    constructor(status: AuthenticationResultStatus, options?: AuthenticationOptions);
    /**
     * Indicates that authentication couldn't be performed with the provided credentials.
     */
    notHandled(): boolean;
    /**
     * Indicates that authentication succeeded.
     */
    succeeded(): boolean;
    /**
     * Indicates that authentication failed.
     */
    failed(): boolean;
    /**
     * Indicates that authentication needs user to be redirected.
     */
    redirected(): boolean;
    /**
     * Checks whether authentication result implies state update.
     */
    shouldUpdateState(): boolean;
    /**
     * Checks whether authentication result implies state clearing.
     */
    shouldClearState(): boolean;
}
export {};
