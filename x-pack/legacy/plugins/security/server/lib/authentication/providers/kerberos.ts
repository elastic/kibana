/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get } from 'lodash';
import { Legacy } from 'kibana';
import { getErrorStatusCode } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BaseAuthenticationProvider, RequestWithLoginAttempt } from './base';

/**
 * The state supported by the provider.
 */
interface ProviderState {
  /**
   * Access token users get in exchange for SPNEGO token and that should be provided with every
   * request to Elasticsearch on behalf of the authenticated user. This token will eventually expire.
   */
  accessToken: string;
}

/**
 * If request with access token fails with `401 Unauthorized` then this token is no
 * longer valid and we should try to refresh it. Another use case that we should
 * temporarily support (until elastic/elasticsearch#38866 is fixed) is when token
 * document has been removed and ES responds with `500 Internal Server Error`.
 * @param err Error returned from Elasticsearch.
 */
function isAccessTokenExpiredError(err?: any) {
  const errorStatusCode = getErrorStatusCode(err);
  return (
    errorStatusCode === 401 ||
    (errorStatusCode === 500 &&
      err &&
      err.body &&
      err.body.error &&
      err.body.error.reason === 'token document is missing and must be present')
  );
}

/**
 * Parses request's `Authorization` HTTP header if present and extracts authentication scheme.
 * @param request Request instance to extract authentication scheme for.
 */
function getRequestAuthenticationScheme(request: RequestWithLoginAttempt) {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return '';
  }

  return authorization.split(/\s+/)[0].toLowerCase();
}

/**
 * Provider that supports Kerberos request authentication.
 */
export class KerberosAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Performs Kerberos request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: RequestWithLoginAttempt, state?: ProviderState | null) {
    this.debug(`Trying to authenticate user request to ${request.url.path}.`);

    const authenticationScheme = getRequestAuthenticationScheme(request);
    if (
      authenticationScheme &&
      (authenticationScheme !== 'negotiate' && authenticationScheme !== 'bearer')
    ) {
      this.debug(`Unsupported authentication scheme: ${authenticationScheme}`);
      return AuthenticationResult.notHandled();
    }

    if (request.loginAttempt().getCredentials() != null) {
      this.debug('Login attempt is detected, but it is not supported by the provider');
      return AuthenticationResult.notHandled();
    }

    let authenticationResult = AuthenticationResult.notHandled();
    if (authenticationScheme) {
      // We should get rid of `Bearer` scheme support as soon as Reporting doesn't need it anymore.
      authenticationResult =
        authenticationScheme === 'bearer'
          ? await this.authenticateWithBearerScheme(request)
          : await this.authenticateWithNegotiateScheme(request);
    }

    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = AuthenticationResult.notHandled();
      }
    }

    // If we couldn't authenticate by means of all methods above, let's try to check if Elasticsearch can
    // start authentication mechanism negotiation, otherwise just return authentication result we have.
    return authenticationResult.notHandled()
      ? await this.authenticateViaSPNEGO(request, state)
      : authenticationResult;
  }

  /**
   * Invalidates access token retrieved in exchange for SPNEGO token if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async deauthenticate(request: Legacy.Request, state?: ProviderState) {
    this.debug(`Trying to deauthenticate user via ${request.url.path}.`);

    if (!state || !state.accessToken) {
      this.debug('There is no access token invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      const {
        invalidated_tokens: invalidatedAccessTokensCount,
      } = await this.options.client.callWithInternalUser('shield.deleteAccessToken', {
        body: { token: state.accessToken },
      });

      if (invalidatedAccessTokensCount === 0) {
        this.debug('User access token was already invalidated.');
      } else if (invalidatedAccessTokensCount === 1) {
        this.debug('User access token has been successfully invalidated.');
      } else {
        this.debug(
          `${invalidatedAccessTokensCount} user access tokens were invalidated, this is unexpected.`
        );
      }
    } catch (err) {
      this.debug(`Failed invalidating user's access token: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }

    return DeauthenticationResult.redirectTo('/logged_out');
  }

  /**
   * Tries to authenticate request with `Negotiate ***` Authorization header by passing it to the Elasticsearch backend to
   * get an access token in exchange.
   * @param request Request instance.
   */
  private async authenticateWithNegotiateScheme(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate request using "Negotiate" authentication scheme.');

    // First attempt to exchange SPNEGO token for an access token.
    let accessToken: string;
    try {
      accessToken = (await this.options.client.callWithRequest(request, 'shield.getAccessToken', {
        body: { grant_type: 'client_credentials' },
      })).access_token;
    } catch (err) {
      this.debug(`Failed to exchange SPNEGO token for an access token: ${err.message}`);
      return AuthenticationResult.failed(err);
    }

    this.debug('Get token API request to Elasticsearch successful');

    // Then attempt to query for the user details using the new token
    const originalAuthorizationHeader = request.headers.authorization;
    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('User has been authenticated with new access token');

      return AuthenticationResult.succeeded(user, { accessToken });
    } catch (err) {
      this.debug(`Failed to authenticate request via access token: ${err.message}`);

      // Restore `Authorization` header we've just set. We can end up here only if newly generated
      // access token was rejected by Elasticsearch for some reason and it doesn't make any sense to
      // keep it in the request object since it can confuse other consumers of the request down the
      // line (e.g. in the next authentication provider).
      request.headers.authorization = originalAuthorizationHeader;

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to authenticate request with `Bearer ***` Authorization header by passing it to the Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateWithBearerScheme(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate request using "Bearer" authentication scheme.');

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated using "Bearer" authentication scheme.');

      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.debug(
        `Failed to authenticate request using "Bearer" authentication scheme: ${err.message}`
      );

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to extract access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(
    request: RequestWithLoginAttempt,
    { accessToken }: ProviderState
  ) {
    this.debug('Trying to authenticate via state.');

    if (!accessToken) {
      this.debug('Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.debug(`Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to query Elasticsearch and see if we can rely on SPNEGO to authenticate user.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  private async authenticateViaSPNEGO(
    request: RequestWithLoginAttempt,
    state?: ProviderState | null
  ) {
    this.debug('Trying to authenticate request via SPNEGO.');

    // Try to authenticate current request with Elasticsearch to see whether it supports SPNEGO.
    let authenticationError: Error;
    try {
      await this.options.client.callWithRequest(request, 'shield.authenticate');
      this.debug('Request was not supposed to be authenticated, ignoring result.');
      return AuthenticationResult.notHandled();
    } catch (err) {
      // Fail immediately if we get unexpected error (e.g. ES isn't available). We should not touch
      // session cookie in this case.
      if (getErrorStatusCode(err) !== 401) {
        return AuthenticationResult.failed(err);
      }

      authenticationError = err;
    }

    const challenges = ([] as string[]).concat(
      get<string | string[]>(authenticationError, 'output.headers[WWW-Authenticate]') || ''
    );

    if (challenges.some(challenge => challenge.toLowerCase() === 'negotiate')) {
      this.debug(`SPNEGO is supported by the backend, challenges are: [${challenges}].`);
      return AuthenticationResult.failed(Boom.unauthorized(), ['Negotiate']);
    }

    this.debug(`SPNEGO is not supported by the backend, challenges are: [${challenges}].`);

    // If we failed to do SPNEGO and have a session with expired token that belongs to Kerberos
    // authentication provider then it means Elasticsearch isn't configured to use Kerberos anymore.
    // In this case we should reply with the `401` error and allow Authenticator to clear the cookie.
    // Otherwise give a chance to the next authentication provider to authenticate request.
    return state
      ? AuthenticationResult.failed(Boom.unauthorized())
      : AuthenticationResult.notHandled();
  }

  /**
   * Logs message with `debug` level and kerberos/security related tags.
   * @param message Message to log.
   */
  private debug(message: string) {
    this.options.log(['debug', 'security', 'kerberos'], message);
  }
}
