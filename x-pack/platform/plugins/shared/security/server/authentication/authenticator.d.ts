import type { IBasePath, IClusterClient, KibanaRequest, LoggerFactory } from '@kbn/core/server';
import type { UserActivityServiceStart } from '@kbn/core-user-activity-server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { AuthenticationResult } from './authentication_result';
import { DeauthenticationResult } from './deauthentication_result';
import type { AuthenticatedUser, AuthenticationProvider, SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { type Session, type SessionValue } from '../session_management';
import type { UiamServicePublic } from '../uiam';
import type { UserProfileServiceStartInternal } from '../user_profile';
/**
 * The shape of the login attempt.
 */
export interface ProviderLoginAttempt {
    /**
     * Name or type of the provider this login attempt is targeted for.
     */
    provider: Pick<AuthenticationProvider, 'name'> | Pick<AuthenticationProvider, 'type'>;
    /**
     * Optional URL to redirect user to after successful login. This URL is ignored if provider
     * decides to redirect user to another URL after login.
     */
    redirectURL?: string;
    /**
     * Login attempt can have any form and defined by the specific provider.
     */
    value: unknown;
}
export interface AuthenticatorOptions {
    audit: AuditServiceSetup;
    featureUsageService: SecurityFeatureUsageServiceStart;
    userProfileService: UserProfileServiceStartInternal;
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
    config: Pick<ConfigType, 'authc' | 'accessAgreement' | 'uiam'>;
    basePath: IBasePath;
    license: SecurityLicense;
    loggers: LoggerFactory;
    clusterClient: IClusterClient;
    session: PublicMethodsOf<Session>;
    uiam?: UiamServicePublic;
    getServerBaseURL: () => string;
    isElasticCloudDeployment: () => boolean;
    customLogoutURL?: string;
    userActivity: UserActivityServiceStart;
}
/**
 * Authenticator is responsible for authentication of the request using chain of
 * authentication providers. The chain is essentially a prioritized list of configured
 * providers (typically of various types). The order of the list determines the order in
 * which the providers will be consulted. During the authentication process, Authenticator
 * will try to authenticate the request via one provider at a time. Once one of the
 * providers successfully authenticates the request, the authentication is considered
 * to be successful and the authenticated user will be associated with the request.
 * If provider cannot authenticate the request, the next in line provider in the chain
 * will be used. If all providers in the chain could not authenticate the request,
 * the authentication is then considered to be unsuccessful and an authentication error
 * will be returned.
 */
export declare class Authenticator {
    private readonly options;
    /**
     * List of configured and instantiated authentication providers.
     */
    private readonly providers;
    /**
     * Session instance.
     */
    private readonly session;
    /**
     * Internal authenticator logger.
     */
    private readonly logger;
    /**
     * Instantiates Authenticator and bootstrap configured providers.
     * @param options Authenticator options.
     */
    constructor(options: Readonly<AuthenticatorOptions>);
    /**
     * Performs the initial login request using the provider login attempt description.
     * @param request Request instance.
     * @param attempt Login attempt description.
     */
    login(request: KibanaRequest, attempt: ProviderLoginAttempt): Promise<AuthenticationResult>;
    /**
     * Performs request authentication using configured chain of authentication providers.
     * @param request Request instance.
     */
    authenticate(request: KibanaRequest): Promise<AuthenticationResult>;
    /**
     * Tries to reauthenticate request with the existing session.
     * @param request Request instance.
     */
    reauthenticate(request: KibanaRequest): Promise<AuthenticationResult>;
    /**
     * Deauthenticates current request.
     * @param request Request instance.
     */
    logout(request: KibanaRequest): Promise<DeauthenticationResult>;
    /**
     * Acknowledges access agreement on behalf of the currently authenticated user.
     * @param request Request instance.
     */
    acknowledgeAccessAgreement(request: KibanaRequest): Promise<void>;
    getRequestOriginalURL(request: KibanaRequest, additionalQueryStringParameters?: Array<[string, string]>): string;
    /**
     * Initializes HTTP Authentication provider and appends it to the end of the list of enabled
     * authentication providers.
     * @param options Common provider options.
     */
    private setupHTTPAuthenticationProvider;
    /**
     * Returns provider iterator starting from the suggested provider if any.
     * @param suggestedProviderName Optional name of the provider to return first.
     */
    private providerIterator;
    /**
     * Extracts session value for the specified request. Under the hood it can clear session if it
     * belongs to the provider that is not available.
     * @param request Request instance.
     */
    private getSessionValue;
    /**
     * Updates, creates, extends or clears session value based on the received authentication result.
     * @param request Request instance.
     * @param provider Provider that produced provided authentication result.
     * @param providerInstance Provider instance that produced provided authentication result.
     * @param authenticationResult Result of the authentication or login attempt.
     * @param existingSessionValue Value of the existing session if any.
     */
    private updateSessionValue;
    /**
     * Invalidates session value associated with the specified request.
     */
    private invalidateSessionValue;
    /**
     * Checks whether request should be redirected to the Login Selector UI.
     * @param request Request instance.
     * @param sessionValue Current session value if any.
     */
    private shouldRedirectToLoginSelector;
    /**
     * Checks whether request should be redirected to the Access Agreement UI.
     * @param sessionValue Current session value if any.
     */
    private shouldRedirectToAccessAgreement;
    /**
     * In some cases we'd like to redirect user to another page right after successful authentication
     * before they can access anything else in Kibana. This method makes sure we do a proper redirect
     * that would eventually lead user to a initially requested Kibana URL.
     * @param request Request instance.
     * @param authenticationResult Result of the authentication.
     * @param sessionUpdateResult Result of the session update.
     * @param redirectURL
     */
    private handlePreAccessRedirects;
    /**
     * Creates a logged out URL for the specified request and provider.
     * @param request Request that initiated logout.
     * @param providerType Type of the provider that handles logout. If not specified, then the first
     * provider in the chain (default) is assumed.
     */
    private getLoggedOutURL;
}
export declare function enrichWithUserProfileId(authenticationResult: AuthenticationResult, sessionValue: SessionValue | null): AuthenticationResult;
