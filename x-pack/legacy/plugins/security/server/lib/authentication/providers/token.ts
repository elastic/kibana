/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';
import { canRedirectRequest } from '../../can_redirect_request';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { Tokens, TokenPair } from '../tokens';
import { BaseAuthenticationProvider, RequestWithLoginAttempt } from './base';

/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;

/**
 * Provider that supports token-based request authentication.
 */
export class TokenAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Performs token-based request authentication
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: RequestWithLoginAttempt, state?: ProviderState | null) {
    this.debug(`Trying to authenticate user request to ${request.url.path}.`);

    // first try from login payload
    let authenticationResult = await this.authenticateViaLoginAttempt(request);

    // if there isn't a payload, try header-based token auth
    if (authenticationResult.notHandled()) {
      const {
        authenticationResult: headerAuthResult,
        headerNotRecognized,
      } = await this.authenticateViaHeader(request);
      if (headerNotRecognized) {
        return headerAuthResult;
      }
      authenticationResult = headerAuthResult;
    }

    // if we still can't attempt auth, try authenticating via state (session token)
    if (authenticationResult.notHandled() && state) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (
        authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error)
      ) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }

    // finally, if authentication still can not be handled for this
    // request/state combination, redirect to the login page if appropriate
    if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      authenticationResult = AuthenticationResult.redirectTo(this.getLoginPageURL(request));
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async deauthenticate(request: Legacy.Request, state?: ProviderState | null) {
    this.debug(`Trying to deauthenticate user via ${request.url.path}.`);

    if (!state) {
      this.debug('There are no access and refresh tokens to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    this.debug('Token-based logout has been initiated by the user.');

    try {
      await this.options.tokens.invalidate(state);
    } catch (err) {
      this.debug(`Failed invalidating user's access token: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }

    const queryString = request.url.search || `?msg=LOGGED_OUT`;
    return DeauthenticationResult.redirectTo(`${this.options.basePath}/login${queryString}`);
  }

  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateViaHeader(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this.debug('Authorization header is not presented.');
      return { authenticationResult: AuthenticationResult.notHandled() };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return { authenticationResult: AuthenticationResult.notHandled(), headerNotRecognized: true };
    }

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via header.');

      // We intentionally do not store anything in session state because token
      // header auth can only be used on a request by request basis.
      return { authenticationResult: AuthenticationResult.succeeded(user) };
    } catch (err) {
      this.debug(`Failed to authenticate request via header: ${err.message}`);
      return { authenticationResult: AuthenticationResult.failed(err) };
    }
  }

  /**
   * Validates whether request contains a login payload and authenticates the
   * user if necessary.
   * @param request Request instance.
   */
  private async authenticateViaLoginAttempt(request: RequestWithLoginAttempt) {
    this.debug('Trying to authenticate via login attempt.');

    const credentials = request.loginAttempt().getCredentials();
    if (!credentials) {
      this.debug('Username and password not found in payload.');
      return AuthenticationResult.notHandled();
    }

    try {
      // First attempt to exchange login credentials for an access token
      const { username, password } = credentials;
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this.options.client.callWithInternalUser('shield.getAccessToken', {
        body: { grant_type: 'password', username, password },
      });

      this.debug('Get token API request to Elasticsearch successful');

      // Then attempt to query for the user details using the new token
      request.headers.authorization = `Bearer ${accessToken}`;
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('User has been authenticated with new access token');

      return AuthenticationResult.succeeded(user, { accessToken, refreshToken });
    } catch (err) {
      this.debug(`Failed to authenticate request via login attempt: ${err.message}`);

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
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(
    request: RequestWithLoginAttempt,
    { accessToken }: ProviderState
  ) {
    this.debug('Trying to authenticate via state.');

    try {
      request.headers.authorization = `Bearer ${accessToken}`;
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.debug(`Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to crash if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * This method is only called when authentication via access token stored in the state failed because of expired
   * token. So we should use refresh token, that is also stored in the state, to extend expired access token and
   * authenticate user with it.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaRefreshToken(
    request: RequestWithLoginAttempt,
    { refreshToken }: ProviderState
  ) {
    this.debug('Trying to refresh access token.');

    let refreshedTokenPair: TokenPair | null;
    try {
      refreshedTokenPair = await this.options.tokens.refresh(refreshToken);
    } catch (err) {
      return AuthenticationResult.failed(err);
    }

    // If refresh token is no longer valid, then we should clear session and redirect user to the
    // login page to re-authenticate, or fail if redirect isn't possible.
    if (refreshedTokenPair === null) {
      if (canRedirectRequest(request)) {
        this.debug('Clearing session since both access and refresh tokens are expired.');

        // Set state to `null` to let `Authenticator` know that we want to clear current session.
        return AuthenticationResult.redirectTo(this.getLoginPageURL(request), null);
      }

      return AuthenticationResult.failed(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    }

    try {
      request.headers.authorization = `Bearer ${refreshedTokenPair.accessToken}`;
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via refreshed token.');
      return AuthenticationResult.succeeded(user, refreshedTokenPair);
    } catch (err) {
      this.debug(`Failed to authenticate user using newly refreshed access token: ${err.message}`);

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
   * Constructs login page URL using current url path as `next` query string parameter.
   * @param request Request instance.
   */
  private getLoginPageURL(request: RequestWithLoginAttempt) {
    const nextURL = encodeURIComponent(`${request.getBasePath()}${request.url.path}`);
    return `${this.options.basePath}/login?next=${nextURL}`;
  }

  /**
   * Logs message with `debug` level and token/security related tags.
   * @param message Message to log.
   */
  private debug(message: string) {
    this.options.log(['debug', 'security', 'token'], message);
  }
}
