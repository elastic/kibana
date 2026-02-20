/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildFlavor } from '@kbn/config';
import type {
  CustomBrandingSetup,
  ElasticsearchServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  IClusterClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
} from '@kbn/core/server';
import type { APIKeysType } from '@kbn/core-security-server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import { i18n as i18nLib } from '@kbn/i18n';
import type {
  AuditServiceSetup,
  AuthenticationServiceStart,
} from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { APIKeys } from './api_keys';
import { UiamAPIKeys } from './api_keys/uiam';
import type { AuthenticationResult } from './authentication_result';
import type { ProviderLoginAttempt } from './authenticator';
import { Authenticator } from './authenticator';
import { canRedirectRequest } from './can_redirect_request';
import type { DeauthenticationResult } from './deauthentication_result';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import { NEXT_URL_QUERY_STRING_PARAMETER } from '../../common/constants';
import { shouldProviderUseLoginForm } from '../../common/model';
import type { ConfigType } from '../config';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { createRedirectHtmlPage } from '../lib/html_page_utils';
import { ROUTE_TAG_AUTH_FLOW } from '../routes/tags';
import type { Session } from '../session_management';
import type { UiamServicePublic } from '../uiam';
import type { UserProfileServiceStartInternal } from '../user_profile';

interface AuthenticationServiceSetupParams {
  http: Pick<
    HttpServiceSetup,
    'basePath' | 'csp' | 'registerAuth' | 'registerOnPreResponse' | 'staticAssets'
  >;
  customBranding: CustomBrandingSetup;
  elasticsearch: Pick<ElasticsearchServiceSetup, 'setUnauthorizedErrorHandler'>;
  config: ConfigType;
  license: SecurityLicense;
}

interface AuthenticationServiceStartParams {
  http: Pick<HttpServiceStart, 'auth' | 'basePath' | 'getServerInfo'>;
  config: ConfigType;
  clusterClient: IClusterClient;
  audit: AuditServiceSetup;
  featureUsageService: SecurityFeatureUsageServiceStart;
  userProfileService: UserProfileServiceStartInternal;
  session: PublicMethodsOf<Session>;
  uiam?: UiamServicePublic;
  loggers: LoggerFactory;
  applicationName: string;
  kibanaFeatures: KibanaFeature[];
  isElasticCloudDeployment: () => boolean;
  customLogoutURL?: string;
  buildFlavor?: BuildFlavor;
}

export interface InternalAuthenticationServiceStart extends AuthenticationServiceStart {
  apiKeys: Pick<
    APIKeysType,
    | 'areAPIKeysEnabled'
    | 'areCrossClusterAPIKeysEnabled'
    | 'create'
    | 'update'
    | 'invalidate'
    | 'validate'
    | 'grantAsInternalUser'
    | 'invalidateAsInternalUser'
    | 'uiam'
  >;
  login: (request: KibanaRequest, attempt: ProviderLoginAttempt) => Promise<AuthenticationResult>;
  logout: (request: KibanaRequest) => Promise<DeauthenticationResult>;
  acknowledgeAccessAgreement: (request: KibanaRequest) => Promise<void>;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}

export class AuthenticationService {
  private license!: SecurityLicense;
  private authenticator?: Authenticator;
  private session?: PublicMethodsOf<Session>;

  constructor(private readonly logger: Logger) {}

  setup({
    config,
    http,
    license,
    elasticsearch,
    customBranding,
  }: AuthenticationServiceSetupParams) {
    this.license = license;

    // If we cannot automatically authenticate users we should redirect them straight to the login
    // page if possible, so that they can try other methods to log in. If not possible, we should
    // render a dedicated `Unauthenticated` page from which users can explicitly trigger a new
    // login attempt. There are two cases when we can redirect to the login page:
    // 1. Login selector is enabled
    // 2. Login selector is disabled, but the provider with the lowest `order` uses login form
    const isLoginPageAvailable =
      config.authc.selector.enabled ||
      (config.authc.sortedProviders.length > 0 &&
        shouldProviderUseLoginForm(config.authc.sortedProviders[0].type));

    http.registerAuth(async (request, response, t) => {
      if (!license.isLicenseAvailable()) {
        this.logger.error(
          `License information could not be obtained from Elasticsearch due to an error: ${
            license.getUnavailableReason() ?? 'unknown'
          }`
        );
        return response.customError({
          body: 'License information could not be obtained from Elasticsearch. Please check the logs for further details.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
      }

      // If security is disabled, then continue with no user credentials.
      if (!license.isEnabled()) {
        this.logger.debug(
          'Authentication is not required, as security features are disabled in Elasticsearch.'
        );
        return t.authenticated();
      }

      if (!this.authenticator) {
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return response.customError({
          body: 'Authentication sub-system is not fully initialized yet.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
      }

      const authenticationResult = await this.authenticator.authenticate(request);

      if (authenticationResult.succeeded()) {
        return t.authenticated({
          state: authenticationResult.user,
          requestHeaders: authenticationResult.authHeaders,
          responseHeaders: authenticationResult.authResponseHeaders,
        });
      }

      if (authenticationResult.redirected()) {
        // Some authentication mechanisms may require user to be redirected to another location to
        // initiate or complete authentication flow. It can be Kibana own login page for basic
        // authentication (username and password) or arbitrary external page managed by 3rd party
        // Identity Provider for SSO authentication mechanisms. Authentication provider is the one who
        // decides what location user should be redirected to.
        return t.redirected({
          location: authenticationResult.redirectURL!,
          ...(authenticationResult.authResponseHeaders || {}),
        });
      }

      if (authenticationResult.failed()) {
        const error = authenticationResult.error!;
        this.logger.error(`Authentication attempt failed: ${getDetailedErrorMessage(error)}`);

        // proxy Elasticsearch "native" errors
        const statusCode = getErrorStatusCode(error);
        if (typeof statusCode === 'number') {
          return response.customError({
            body: error,
            statusCode,
            headers: authenticationResult.authResponseHeaders,
          });
        }

        return response.unauthorized({
          headers: authenticationResult.authResponseHeaders,
        });
      }

      this.logger.debug('Could not handle authentication attempt');
      return t.notHandled();
    });

    http.registerOnPreResponse(async (request, preResponse, toolkit) => {
      if (!this.authenticator) {
        // Core doesn't allow returning error here.
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return toolkit.next();
      }

      const isAuthRoute = request.route.options.tags.includes(ROUTE_TAG_AUTH_FLOW);
      const isLogoutRoute = request.route.path === '/api/security/logout';

      // If users can eventually re-login we want to redirect them directly to the page they tried
      // to access initially, but we only want to do that for routes that aren't part of the various
      // authentication flows that wouldn't make any sense after successful authentication.
      const originalURL = isAuthRoute
        ? `${http.basePath.get(request)}/`
        : this.authenticator.getRequestOriginalURL(request);

      // Let API responses or <400 responses pass through as we can let their handlers deal with them.
      if (preResponse.statusCode < 400 || !canRedirectRequest(request)) {
        return toolkit.next();
      }

      if (preResponse.statusCode !== 401 && !isAuthRoute) {
        return toolkit.next();
      }

      const unauthenticatedTitle = i18nLib.translate(
        'xpack.security.authentication.unauthenticatedTitle',
        {
          defaultMessage: 'Unauthenticated',
        }
      );

      // Now we are only dealing with authentication flow errors or 401 errors in non-authentication routes.
      // Additionally, if logout fails for any reason, we also want to show an error page.
      // At this point we redirect users to the login page if it's available, or render a dedicated unauthenticated error page.
      if (!isLoginPageAvailable || isLogoutRoute) {
        const location = http.basePath.prepend(
          `/security/unauthenticated?next=${encodeURIComponent(originalURL)}`
        );
        const body = createRedirectHtmlPage(unauthenticatedTitle, location);
        return toolkit.render({
          body,
          headers: {
            'Content-Security-Policy': http.csp.header,
            'Content-Security-Policy-Report-Only': http.csp.reportOnlyHeader,
            Refresh: `0;url=${location}`,
          },
        });
      }

      const needsToLogout = (await this.session?.getSID(request)) !== undefined;
      if (needsToLogout) {
        this.logger.warn('Could not authenticate user with the existing session. Forcing logout.');
      }

      const location = http.basePath.prepend(
        `${
          needsToLogout ? '/logout' : '/login'
        }?msg=UNAUTHENTICATED&${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(originalURL)}`
      );
      const body = createRedirectHtmlPage(unauthenticatedTitle, location);
      return toolkit.render({
        body,
        headers: {
          Refresh: `0;url=${location}`,
          'Content-Security-Policy': http.csp.header,
          'Content-Security-Policy-Report-Only': http.csp.reportOnlyHeader,
        },
      });
    });

    elasticsearch.setUnauthorizedErrorHandler(async ({ error, request }, toolkit) => {
      if (!this.authenticator) {
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return toolkit.notHandled();
      }

      if (!license.isLicenseAvailable() || !license.isEnabled()) {
        this.logger.error(
          `License is not available or does not support security features, re-authentication is not possible (available: ${license.isLicenseAvailable()}, enabled: ${license.isEnabled()}, unavailable reason: ${license.getUnavailableReason()}).`
        );
        return toolkit.notHandled();
      }

      // In theory, this should never happen since Core calls this handler only for `401` ("unauthorized") errors.
      if (getErrorStatusCode(error) !== 401) {
        this.logger.error(
          `Re-authentication is not possible for the following error: ${getDetailedErrorMessage(
            error
          )}.`
        );
        return toolkit.notHandled();
      }

      this.logger.debug(
        `Re-authenticating request due to error: ${getDetailedErrorMessage(error)}`
      );

      let authenticationResult;
      const originalHeaders = request.headers;
      try {
        // WORKAROUND: Due to BWC reasons Core mutates headers of the original request with authentication
        // headers returned during authentication stage. We should remove these headers before re-authentication to not
        // conflict with the HTTP authentication logic. Performance impact is negligible since this is not a hot path.
        (request.headers as Record<string, unknown>) = Object.fromEntries(
          Object.entries(originalHeaders).filter(
            ([headerName]) => headerName.toLowerCase() !== 'authorization'
          )
        );
        authenticationResult = await this.authenticator.reauthenticate(request);
      } catch (err) {
        this.logger.error(
          `Re-authentication failed due to unexpected error: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      } finally {
        (request.headers as Record<string, unknown>) = originalHeaders;
      }

      if (authenticationResult.succeeded()) {
        if (authenticationResult.authHeaders) {
          this.logger.debug('Re-authentication succeeded');
          return toolkit.retry({ authHeaders: authenticationResult.authHeaders });
        }

        this.logger.error(
          'Re-authentication succeeded, but authentication headers are not available.'
        );
      } else if (authenticationResult.failed()) {
        this.logger.error(
          `Re-authentication failed due to: ${getDetailedErrorMessage(authenticationResult.error)}`
        );
      } else if (authenticationResult.redirected()) {
        this.logger.error('Re-authentication failed since redirect is required.');
      } else {
        this.logger.debug('Re-authentication cannot be handled.');
      }

      return toolkit.notHandled();
    });
  }

  start({
    audit,
    config,
    clusterClient,
    featureUsageService,
    userProfileService,
    http,
    loggers,
    session,
    applicationName,
    kibanaFeatures,
    isElasticCloudDeployment,
    customLogoutURL,
    buildFlavor = 'traditional',
    uiam,
  }: AuthenticationServiceStartParams): InternalAuthenticationServiceStart {
    const apiKeys = new APIKeys({
      clusterClient,
      logger: this.logger.get('api-key'),
      license: this.license,
      applicationName,
      kibanaFeatures,
      buildFlavor,
      uiam,
    });

    const uiamAPIKeys = uiam
      ? new UiamAPIKeys({
          logger: this.logger.get('api-key-uiam'),
          license: this.license,
          uiam,
        })
      : null;

    /**
     * Retrieves server protocol name/host name/port and merges it with `xpack.security.public` config
     * to construct a server base URL (deprecated, used by the SAML provider only).
     */
    const getServerBaseURL = () => {
      const { protocol, hostname, port } = http.getServerInfo();
      const serverConfig = { protocol, hostname, port, ...config.public };

      return `${serverConfig.protocol}://${serverConfig.hostname}:${serverConfig.port}`;
    };

    const getCurrentUser = (request: KibanaRequest) =>
      http.auth.get<AuthenticatedUser>(request).state ?? null;

    this.session = session;
    const authenticator = (this.authenticator = new Authenticator({
      audit,
      loggers,
      clusterClient,
      basePath: http.basePath,
      config: {
        authc: config.authc,
        accessAgreement: config.accessAgreement,
      },
      getCurrentUser,
      featureUsageService,
      userProfileService,
      getServerBaseURL,
      license: this.license,
      session,
      isElasticCloudDeployment,
      customLogoutURL,
      uiam,
    }));

    return {
      apiKeys: {
        areAPIKeysEnabled: apiKeys.areAPIKeysEnabled.bind(apiKeys),
        areCrossClusterAPIKeysEnabled: apiKeys.areCrossClusterAPIKeysEnabled.bind(apiKeys),
        create: apiKeys.create.bind(apiKeys),
        update: apiKeys.update.bind(apiKeys),
        grantAsInternalUser: apiKeys.grantAsInternalUser.bind(apiKeys),
        invalidate: apiKeys.invalidate.bind(apiKeys),
        validate: apiKeys.validate.bind(apiKeys),
        invalidateAsInternalUser: apiKeys.invalidateAsInternalUser.bind(apiKeys),
        uiam: uiamAPIKeys
          ? {
              grant: uiamAPIKeys.grant.bind(uiamAPIKeys),
              invalidate: uiamAPIKeys.invalidate.bind(uiamAPIKeys),
            }
          : null,
      },

      login: async (request: KibanaRequest, attempt: ProviderLoginAttempt) => {
        const providerIdentifier =
          'name' in attempt.provider ? attempt.provider.name : attempt.provider.type;
        this.logger.info(`Performing login attempt with "${providerIdentifier}" provider.`);

        let loginResult: AuthenticationResult;
        try {
          loginResult = await authenticator.login(request, attempt);
        } catch (err) {
          this.logger.error(
            `Login attempt with "${providerIdentifier}" provider failed due to unexpected error: ${getDetailedErrorMessage(
              err
            )}`,
            { error: { stack_trace: err.stack } }
          );
          throw err;
        }

        if (loginResult.succeeded() || loginResult.redirected()) {
          this.logger.info(
            `Login attempt with "${providerIdentifier}" provider succeeded (requires redirect: ${loginResult.redirected()}).`
          );
        } else if (loginResult.failed()) {
          this.logger.error(
            `Login attempt with "${providerIdentifier}" provider failed: ${
              loginResult.error ? getDetailedErrorMessage(loginResult.error) : 'unknown error'
            }`
          );
        } else if (loginResult.notHandled()) {
          this.logger.error(
            `Login attempt with "${providerIdentifier}" provider cannot be handled.`
          );
        }

        return loginResult;
      },
      logout: this.authenticator.logout.bind(this.authenticator),
      acknowledgeAccessAgreement: this.authenticator.acknowledgeAccessAgreement.bind(
        this.authenticator
      ),

      /**
       * Retrieves currently authenticated user associated with the specified request.
       * @param request
       */
      getCurrentUser,
    };
  }
}
