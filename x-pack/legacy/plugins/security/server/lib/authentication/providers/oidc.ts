/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import type from 'type-detect';
import { Legacy } from 'kibana';
import { canRedirectRequest } from '../../can_redirect_request';
import { getErrorStatusCode } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import {
  AuthenticationProviderOptions,
  BaseAuthenticationProvider,
  AuthenticationProviderSpecificOptions,
  RequestWithLoginAttempt,
} from './base';

/**
 * The state supported by the provider (for the OpenID Connect handshake or established session).
 */
interface ProviderState {
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
  nextURL?: string;

  /**
   * Elasticsearch access token issued as the result of successful OpenID Connect handshake and that should be provided
   * with every request to Elasticsearch on behalf of the authenticated user. This token will eventually expire.
   */
  accessToken?: string;

  /**
   * Once the elasticsearch access token expires the refresh token is used to get a new pair of access/refresh tokens
   * without any user involvement. If not used this token will eventually expire as well.
   */
  refreshToken?: string;
}

/**
 * Defines the shape of an incoming OpenID Connect Request
 */
type OIDCIncomingRequest = RequestWithLoginAttempt & {
  payload: {
    iss?: string;
    login_hint?: string;
  };
  query: {
    iss?: string;
    code?: string;
    state?: string;
    login_hint?: string;
    error?: string;
    error_description?: string;
  };
};

/**
 * Checks if the Request object represents an HTTP request regarding authentication with OpenID
 * Connect. This can be
 * - An HTTP GET request with a query parameter named `iss` as part of a 3rd party initiated authentication
 * - An HTTP POST request with a parameter named `iss` as part of a 3rd party initiated authentication
 * - An HTTP GET request with a query parameter named `code` as the response to a successful authentication from
 *   an OpenID Connect Provider
 * - An HTTP GET request with a query parameter named `error` as the response to a failed authentication from
 *   an OpenID Connect Provider
 * @param request Request instance.
 */
function isOIDCIncomingRequest(request: RequestWithLoginAttempt): request is OIDCIncomingRequest {
  return (
    (request.payload != null && !!(request.payload as Record<string, unknown>).iss) ||
    (request.query != null &&
      (!!(request.query as any).iss ||
        !!(request.query as any).code ||
        !!(request.query as any).error))
  );
}

/**
 * Checks the error returned by Elasticsearch as the result of `authenticate` call and returns `true` if request
 * has been rejected because of expired token, otherwise returns `false`.
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
 * Provider that supports authentication using an OpenID Connect realm in Elasticsearch.
 */
export class OIDCAuthenticationProvider extends BaseAuthenticationProvider {
  private readonly realm: string;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    oidcOptions?: Readonly<AuthenticationProviderSpecificOptions>
  ) {
    super(options);
    if (!oidcOptions || !oidcOptions.realm) {
      throw new Error('Realm name must be specified');
    }

    if (type(oidcOptions.realm) !== 'string') {
      throw new Error('Realm must be a string');
    }

    this.realm = oidcOptions.realm as string;
  }

  /**
   * Performs OpenID Connect request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: RequestWithLoginAttempt, state?: ProviderState | null) {
    this.debug(`Trying to authenticate user request to ${request.url.path}.`);

    // We should get rid of `Bearer` scheme support as soon as Reporting doesn't need it anymore.
    let {
      authenticationResult,
      headerNotRecognized, // eslint-disable-line prefer-const
    } = await this.authenticateViaHeader(request);
    if (headerNotRecognized) {
      return authenticationResult;
    }

    if (request.loginAttempt().getCredentials() != null) {
      this.debug('Login attempt is detected, but it is not supported by the provider');
      return AuthenticationResult.notHandled();
    }

    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }

    if (isOIDCIncomingRequest(request) && authenticationResult.notHandled()) {
      // This might be the OpenID Connect Provider redirecting the user to `redirect_uri` after authentication or
      // a third party initiating an authentication
      authenticationResult = await this.authenticateViaResponseUrl(request, state);
    }

    // If we couldn't authenticate by means of all methods above, let's try to
    // initiate an OpenID Connect based authentication, otherwise just return the authentication result we have.
    // We might already have a state and nonce generated by Elasticsearch (from an unfinished authentication in
    // another tab)
    return authenticationResult.notHandled()
      ? await this.initiateOIDCAuthentication(request, { realm: this.realm })
      : authenticationResult;
  }

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
   * @param [sessionState] Optional state object associated with the provider.
   */
  private async authenticateViaResponseUrl(
    request: OIDCIncomingRequest,
    sessionState?: ProviderState | null
  ) {
    this.debug('Trying to authenticate via OpenID Connect response query.');
    // First check to see if this is a Third Party initiated authentication (which can happen via POST or GET)
    const iss = (request.query && request.query.iss) || (request.payload && request.payload.iss);
    const loginHint =
      (request.query && request.query.login_hint) ||
      (request.payload && request.payload.login_hint);
    if (iss) {
      this.debug('Authentication has been initiated by a Third Party.');
      // We might already have a state and nonce generated by Elasticsearch (from an unfinished authentication in
      // another tab)
      const oidcPrepareParams = loginHint ? { iss, login_hint: loginHint } : { iss };
      return this.initiateOIDCAuthentication(request, oidcPrepareParams);
    }

    if (!request.query || !request.query.code) {
      this.debug('OpenID Connect Authentication response is not found.');
      return AuthenticationResult.notHandled();
    }
    // If it is an authentication response and the users' session state doesn't contain all the necessary information,
    // then something unexpected happened and we should fail because Elasticsearch won't be able to validate the
    // response.
    const { nonce: stateNonce = '', state: stateOIDCState = '', nextURL: stateRedirectURL = '' } =
      sessionState || {};
    if (!stateNonce || !stateOIDCState || !stateRedirectURL) {
      const message =
        'Response session state does not have corresponding state or nonce parameters or redirect URL.';
      this.debug(message);
      return AuthenticationResult.failed(Boom.badRequest(message));
    }

    // We have all the necessary parameters, so attempt to complete the OpenID Connect Authentication
    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/authenticate`.
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this.options.client.callWithInternalUser('shield.oidcAuthenticate', {
        body: {
          state: stateOIDCState,
          nonce: stateNonce,
          // redirect_uri contains the code that es will exchange for an ID Token. Elasticserach
          // will do all the required validation and parsing. We pass the path only as we can't be
          // sure of the full URL and Elasticsearch doesn't need it anyway
          redirect_uri: request.url.path,
        },
      });

      this.debug('Request has been authenticated via OpenID Connect.');

      return AuthenticationResult.redirectTo(stateRedirectURL, {
        accessToken,
        refreshToken,
      });
    } catch (err) {
      this.debug(`Failed to authenticate request via OpenID Connect: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Initiates an authentication attempt by either providing the realm name or the issuer to Elasticsearch
   *
   * @param request Request instance.
   * @param params OIDC authentication parameters.
   * @param [sessionState] Optional state object associated with the provider.
   */
  private async initiateOIDCAuthentication(
    request: RequestWithLoginAttempt,
    params: { realm: string } | { iss: string; login_hint?: string },
    sessionState?: ProviderState | null
  ) {
    this.debug('Trying to initiate OpenID Connect authentication.');

    // If client can't handle redirect response, we shouldn't initiate OpenID Connect authentication.
    if (!canRedirectRequest(request)) {
      this.debug('OpenID Connect authentication can not be initiated by AJAX requests.');
      return AuthenticationResult.notHandled();
    }

    try {
      /*
       * Possibly adds the state and nonce parameter that was saved in the user's session state to
       * the params. There is no use case where we would have only a state parameter or only a nonce
       * parameter in the session state so we only enrich the params object if we have both
       */
      const oidcPrepareParams =
        sessionState && sessionState.nonce && sessionState.state
          ? { ...params, nonce: sessionState.nonce, state: sessionState.state }
          : params;
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/prepare`.
      const { state, nonce, redirect } = await this.options.client.callWithInternalUser(
        'shield.oidcPrepare',
        {
          body: oidcPrepareParams,
        }
      );

      this.debug('Redirecting to OpenID Connect Provider with authentication request.');
      // If this is a third party initiated login, redirect to the base path
      const redirectAfterLogin = `${request.getBasePath()}${
        'iss' in params ? '/' : request.url.path
      }`;
      return AuthenticationResult.redirectTo(
        redirect,
        // Store the state and nonce parameters in the session state of the user
        { state, nonce, nextURL: redirectAfterLogin }
      );
    } catch (err) {
      this.debug(`Failed to initiate OpenID Connect authentication: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
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
      return {
        authenticationResult: AuthenticationResult.notHandled(),
      };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true,
      };
    }

    try {
      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via header.');

      return {
        authenticationResult: AuthenticationResult.succeeded(user),
      };
    } catch (err) {
      this.debug(`Failed to authenticate request via header: ${err.message}`);
      return {
        authenticationResult: AuthenticationResult.failed(err),
      };
    }
  }

  /**
   * Tries to extract an elasticsearch access token from state and adds it to the request before it's
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
      this.debug('Elasticsearch access token is not found in state.');
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
   * This method is only called when authentication via an elasticsearch access token stored in the state failed because
   * of expired token. So we should use the elasticsearch refresh token, that is also stored in the state, to extend
   * expired elasticsearch access token and authenticate user with it.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaRefreshToken(
    request: RequestWithLoginAttempt,
    { refreshToken }: ProviderState
  ) {
    this.debug('Trying to refresh elasticsearch access token.');

    if (!refreshToken) {
      this.debug('Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      // Token should be refreshed by the same user that obtained that token.
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      } = await this.options.client.callWithInternalUser('shield.getAccessToken', {
        body: { grant_type: 'refresh_token', refresh_token: refreshToken },
      });

      this.debug('Elasticsearch access token has been successfully refreshed.');

      request.headers.authorization = `Bearer ${newAccessToken}`;

      const user = await this.options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via refreshed token.');

      return AuthenticationResult.succeeded(user, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      this.debug(`Failed to refresh elasticsearch access token: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      // There are at least two common cases when refresh token request can fail:
      // 1. Refresh token is valid only for 24 hours and if it hasn't been used it expires.
      //
      // 2. Refresh token is one-time use token and if it has been used already, it is treated in the same way as
      // expired token. Even though it's an edge case, there are several perfectly valid scenarios when it can
      // happen. E.g. when several simultaneous AJAX request has been sent to Kibana, but elasticsearch access token has
      // expired already, so the first request that reaches Kibana uses refresh token to get a new elasticsearch access
      // token, but the second concurrent request has no idea about that and tries to refresh access token as well. All
      // ends well when first request refreshes the elasticsearch access token and updates session cookie with fresh
      // access/refresh token pair. But if user navigates to another page _before_ AJAX request (the one that triggered
      // token refresh)responds with updated cookie, then user will have only that old cookie with expired elasticsearch
      // access token and refresh token that has been used already.
      //
      // When user has neither valid access nor refresh token, the only way to resolve this issue is to re-initiate the
      // OpenID Connect authentication by requesting a new authentication request to send to the OpenID Connect Provider
      // and exchange it's forthcoming response for a new Elasticsearch access/refresh token pair. In case this is an
      // AJAX request, we just reply with `400` and clear error message.
      // There are two reasons for `400` and not `401`: Elasticsearch search responds with `400` so it seems logical
      // to do the same on Kibana side and `401` would force user to logout and do full SLO if it's supported.
      if (getErrorStatusCode(err) === 400) {
        if (canRedirectRequest(request)) {
          this.debug(
            'Both elasticsearch access and refresh tokens are expired. Re-initiating OpenID Connect authentication.'
          );
          return this.initiateOIDCAuthentication(request, { realm: this.realm });
        }

        return AuthenticationResult.failed(
          Boom.badRequest('Both elasticsearch access and refresh tokens are expired.')
        );
      }

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Invalidates an elasticsearch access token and refresh token that were originally created as a successful response
   * to an OpenID Connect based authentication. This does not handle OP initiated Single Logout
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async deauthenticate(request: Legacy.Request, state: ProviderState) {
    this.debug(`Trying to deauthenticate user via ${request.url.path}.`);

    if (!state || !state.accessToken) {
      this.debug('There is no elasticsearch access token to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      const logoutBody = {
        body: {
          token: state.accessToken,
          refresh_token: state.refreshToken,
        },
      };
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/logout`.
      const { redirect } = await this.options.client.callWithInternalUser(
        'shield.oidcLogout',
        logoutBody
      );

      this.debug('User session has been successfully invalidated.');

      // Having non-null `redirect` field within logout response means that the OpenID Connect realm configuration
      // supports RP initiated Single Logout and we should redirect user to the specified location in the OpenID Connect
      // Provider to properly complete logout.
      if (redirect != null) {
        this.debug('Redirecting user to the OpenID Connect Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.redirectTo(`${this.options.basePath}/logged_out`);
    } catch (err) {
      this.debug(`Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Logs message with `debug` level and oidc/security related tags.
   * @param message Message to log.
   */
  private debug(message: string) {
    this.options.log(['debug', 'security', 'oidc'], message);
  }
}
