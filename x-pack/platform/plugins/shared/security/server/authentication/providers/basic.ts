/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import type { AuthenticationOptions } from './base';
import { BaseAuthenticationProvider } from './base';
import { NEXT_URL_QUERY_STRING_PARAMETER } from '../../../common/constants';
import { getDetailedErrorMessage } from '../../errors';
import type { SessionValue } from '../../session_management';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import { BasicHTTPAuthorizationHeaderCredentials } from '../http_authentication';

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
 * Checks whether current request can initiate new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and client
  // can be redirected to the login page where they can enter username and password.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

/**
 * Provider that supports request authentication via Basic HTTP Authentication.
 */
export class BasicAuthenticationProvider extends BaseAuthenticationProvider<ProviderState> {
  /**
   * Type of the provider.
   */
  static readonly type = 'basic';

  /**
   * Performs initial login request using username and password.
   * @param request Request instance.
   * @param attempt User credentials.
   */
  public async login(request: KibanaRequest, { username, password }: ProviderLoginAttempt) {
    this.logger.debug('Trying to perform a login.');

    const authHeaders = {
      authorization: new HTTPAuthorizationHeader(
        'Basic',
        new BasicHTTPAuthorizationHeaderCredentials(username, password).toString()
      ).toString(),
    };

    try {
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Login has been successfully performed.');
      return AuthenticationResult.succeeded(user, {
        userProfileGrant: { type: 'password', username, password },
        authHeaders,
        state: authHeaders,
      });
    } catch (err) {
      this.logger.debug(() => `Failed to perform a login: ${getDetailedErrorMessage(err)}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Authenticates the request with the Basic credentials stored in its session.
   * During session renewal, ignore the expired token that Core put in the Authorization header.
   * Use the supplied session and contact Elasticsearch, even on minimal-authentication routes.
   * The request headers stay unchanged.
   * @param request Request instance.
   * @param [session] Optional session object associated with the provider.
   * @param [options] Explicit session reauthentication controls.
   */
  public async authenticate(
    request: KibanaRequest,
    session?: SessionValue<ProviderState> | null,
    options?: AuthenticationOptions
  ) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}.`
    );

    if (!options?.reauthenticate && HTTPAuthorizationHeader.parseFromRequest(request) != null) {
      this.logger.debug('Cannot authenticate requests with `Authorization` header.');
      return AuthenticationResult.notHandled();
    }

    if (session) {
      return await this.authenticateViaState(request, session, options);
    }

    // If session isn't present let's redirect user to the login page.
    if (canStartNewSession(request)) {
      this.logger.debug('Redirecting request to Login page.');
      const basePath = this.options.basePath.get(request);
      return AuthenticationResult.redirectTo(
        `${basePath}/login?${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
          `${basePath}${request.url.pathname}${request.url.search}`
        )}`
      );
    }

    return AuthenticationResult.notHandled();
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param request Request instance.
   * @param [session] Optional session object associated with the provider.
   */
  public async logout(request: KibanaRequest, session?: SessionValue<ProviderState> | null) {
    this.logger.debug(`Trying to log user out via ${request.url.pathname}${request.url.search}.`);

    // Having a `null` session means that provider was specifically called to do a logout, but when
    // session isn't defined then provider is just being probed whether or not it can perform logout.
    if (session === undefined) {
      return DeauthenticationResult.notHandled();
    }

    return DeauthenticationResult.redirectTo(this.options.urls.loggedOut(request));
  }

  /**
   * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
   * that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return 'basic';
  }

  /**
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param session Session value previously created by the provider.
   * @param [options] Reauthentication options forwarded to full backend credential validation.
   */
  private async authenticateViaState(
    request: KibanaRequest,
    session: SessionValue<ProviderState>,
    options?: AuthenticationOptions
  ) {
    this.logger.debug('Trying to authenticate via state.');

    if (!session.state.authorization) {
      this.logger.debug('Authorization header is not found in state.');
      return AuthenticationResult.notHandled();
    }

    const authHeaders = { authorization: session.state.authorization };
    try {
      const user = await this.getUser(request, authHeaders, session, options);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(
        () => `Failed to authenticate request via state: ${getDetailedErrorMessage(err)}`
      );
      return AuthenticationResult.failed(err);
    }
  }
}
