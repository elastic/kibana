/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { BaseAuthenticationProvider } from './base';
import type { AuthenticationInfo } from '../../elasticsearch';
import { getDetailedErrorMessage, getErrorStatusCode, InvalidGrantError } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import type { RefreshTokenResult, TokenPair } from '../tokens';
import { Tokens } from '../tokens';

/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;

/**
 * Name of the `WWW-Authenticate` we parse out of Elasticsearch responses or/and return to the
 * client to initiate or continue negotiation.
 */
const WWWAuthenticateHeaderName = 'WWW-Authenticate';

/**
 * Checks whether current request can initiate new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and it's not an XHR request.
  // Technically we can authenticate XHR requests too, but we don't want these to create a new session unintentionally.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

/**
 * Provider that supports Kerberos request authentication.
 */
export class KerberosAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'kerberos';

  /**
   * Performs initial login request.
   * @param request Request instance.
   */
  public async login(request: KibanaRequest) {
    this.logger.debug('Trying to perform a login.');

    if (HTTPAuthorizationHeader.parseFromRequest(request)?.scheme.toLowerCase() === 'negotiate') {
      return await this.authenticateWithNegotiateScheme(request);
    }

    return await this.authenticateViaSPNEGO(request);
  }

  /**
   * Performs Kerberos request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}.`
    );

    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (authorizationHeader && authorizationHeader.scheme.toLowerCase() !== 'negotiate') {
      this.logger.debug(`Unsupported authentication scheme: ${authorizationHeader.scheme}`);
      return AuthenticationResult.notHandled();
    }

    let authenticationResult = AuthenticationResult.notHandled();
    if (state) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (
        authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error)
      ) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }

    if (!authenticationResult.notHandled() || !canStartNewSession(request)) {
      return authenticationResult;
    }

    // If we couldn't authenticate by means of all methods above, let's check if we're already at the authentication
    // mechanism negotiation stage, otherwise check with Elasticsearch if we can start it.
    return authorizationHeader
      ? await this.authenticateWithNegotiateScheme(request)
      : await this.authenticateViaSPNEGO(request, state);
  }

  /**
   * Invalidates access token retrieved in exchange for SPNEGO token if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to log user out via ${request.url.pathname}${request.url.search}.`);

    // Having a `null` state means that provider was specifically called to do a logout, but when
    // session isn't defined then provider is just being probed whether or not it can perform logout.
    if (state === undefined) {
      this.logger.debug('There is no access token invalidate.');
      return DeauthenticationResult.notHandled();
    }

    if (state) {
      try {
        await this.options.tokens.invalidate(state);
      } catch (err) {
        this.logger.debug(
          () => `Failed invalidating access and/or refresh tokens: ${getDetailedErrorMessage(err)}`
        );
        return DeauthenticationResult.failed(err);
      }
    }

    return DeauthenticationResult.redirectTo(this.options.urls.loggedOut(request));
  }

  /**
   * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
   * that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return 'bearer';
  }

  /**
   * Tries to authenticate request with `Negotiate ***` Authorization header by passing it to the Elasticsearch backend to
   * get an access token in exchange.
   * @param request Request instance.
   */
  private async authenticateWithNegotiateScheme(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate request using "Negotiate" authentication scheme.');

    const [, kerberosTicket] = (request.headers.authorization as string).split(/\s+/);

    // First attempt to exchange SPNEGO token for an access token.
    let tokens: {
      access_token: string;
      refresh_token: string;
      kerberos_authentication_response_token?: string;
      authentication: AuthenticationInfo;
    };
    try {
      // @ts-expect-error authentication.email can be optional
      tokens = await this.options.client.asInternalUser.security.getToken({
        body: {
          grant_type: '_kerberos',
          kerberos_ticket: kerberosTicket,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to exchange SPNEGO token for an access token: ${getDetailedErrorMessage(err)}`
      );

      // Check if SPNEGO context wasn't established and we have a response token to return to the client.
      const challenge =
        getErrorStatusCode(err) === 401 && err instanceof errors.ResponseError
          ? this.getNegotiateChallenge(err)
          : undefined;
      if (!challenge) {
        return AuthenticationResult.failed(err);
      }

      const challengeParts = challenge.split(/\s+/);
      if (challengeParts.length > 2) {
        this.logger.warn('Challenge consists of more than two parts and may be malformed.');
      }

      let responseChallenge;
      const [, responseToken] = challengeParts;
      if (responseToken) {
        this.logger.debug(
          'Returning response token to the client and continuing SPNEGO handshake.'
        );
        responseChallenge = `Negotiate ${responseToken}`;
      } else {
        this.logger.debug('Re-initiating SPNEGO handshake.');
        responseChallenge = 'Negotiate';
      }

      return AuthenticationResult.failed(Boom.unauthorized(), {
        authResponseHeaders: { [WWWAuthenticateHeaderName]: responseChallenge },
      });
    }

    this.logger.debug('Get token API request to Elasticsearch successful');

    // There is a chance we may need to provide an output token for the client (usually for mutual
    // authentication), it should be attached to the response within `WWW-Authenticate` header with
    // the requested payload, no matter what status code it may have.
    let authResponseHeaders: AuthenticationResult['authResponseHeaders'] | undefined;
    if (tokens.kerberos_authentication_response_token) {
      this.logger.debug(
        'There is an output token provided that will be included into response headers.'
      );

      authResponseHeaders = {
        [WWWAuthenticateHeaderName]: `Negotiate ${tokens.kerberos_authentication_response_token}`,
      };
    }

    return AuthenticationResult.succeeded(
      this.authenticationInfoToAuthenticatedUser(tokens.authentication),
      {
        userProfileGrant: { type: 'accessToken', accessToken: tokens.access_token },
        authHeaders: {
          authorization: new HTTPAuthorizationHeader('Bearer', tokens.access_token).toString(),
        },
        authResponseHeaders,
        state: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token },
      }
    );
  }

  /**
   * Tries to extract access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(request: KibanaRequest, { accessToken }: ProviderState) {
    this.logger.debug('Trying to authenticate via state.');

    if (!accessToken) {
      this.logger.debug('Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      const authHeaders = {
        authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
      };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate request via state: ${getDetailedErrorMessage(err)}`
      );
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
  private async authenticateViaRefreshToken(request: KibanaRequest, state: ProviderState) {
    this.logger.debug('Trying to refresh access token.');

    let refreshTokenResult: RefreshTokenResult | null;
    try {
      refreshTokenResult = await this.options.tokens.refresh(state.refreshToken);
    } catch (err) {
      // If refresh token is no longer valid, let's try to renegotiate new tokens using SPNEGO. We
      // allow this because expired underlying token is an implementation detail and Kibana user
      // facing session is still valid.
      if (err instanceof InvalidGrantError) {
        this.logger.warn('Both access and refresh tokens are expired. Re-authenticating…');
        return this.authenticateViaSPNEGO(request, state);
      }

      this.logger.error(`Failed to refresh access token: ${getDetailedErrorMessage(err)}`);
      return AuthenticationResult.failed(err);
    }

    this.logger.debug('Request has been authenticated via refreshed token.');
    const { accessToken, refreshToken, authenticationInfo } = refreshTokenResult;
    return AuthenticationResult.succeeded(
      this.authenticationInfoToAuthenticatedUser(authenticationInfo),
      {
        authHeaders: {
          authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
        },
        state: { accessToken, refreshToken },
      }
    );
  }

  /**
   * Tries to query Elasticsearch and see if we can rely on SPNEGO to authenticate user.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  private async authenticateViaSPNEGO(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug('Trying to authenticate request via SPNEGO.');

    // Try to authenticate current request with Elasticsearch to see whether it supports SPNEGO.
    let elasticsearchError: errors.ResponseError;
    try {
      await this.getUser(request, {
        // We should send a fake SPNEGO token to Elasticsearch to make sure Kerberos realm is included
        // into authentication chain and adds a `WWW-Authenticate: Negotiate` header to the error
        // response. Otherwise it may not be even consulted if request can be authenticated by other
        // means (e.g. when anonymous access is enabled in Elasticsearch).
        authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}`,
      });
      this.logger.error('Request was not supposed to be authenticated, ignoring result.');
      return AuthenticationResult.notHandled();
    } catch (err) {
      // Fail immediately if we get unexpected error (e.g. ES isn't available). We should not touch
      // session cookie in this case.
      if (getErrorStatusCode(err) !== 401 || !(err instanceof errors.ResponseError)) {
        return AuthenticationResult.failed(err);
      }

      elasticsearchError = err;
    }

    if (this.getNegotiateChallenge(elasticsearchError)) {
      return AuthenticationResult.failed(Boom.unauthorized(), {
        authResponseHeaders: { [WWWAuthenticateHeaderName]: 'Negotiate' },
      });
    }

    // If we failed to do SPNEGO and have a session with expired token that belongs to Kerberos
    // authentication provider then it means Elasticsearch isn't configured to use Kerberos anymore.
    // In this case we should reply with the `401` error and allow Authenticator to clear the cookie.
    // Otherwise give a chance to the next authentication provider to authenticate request.
    return state
      ? AuthenticationResult.failed(Boom.unauthorized())
      : AuthenticationResult.notHandled();
  }

  /**
   * Extracts `Negotiate` challenge from the list of challenges returned with Elasticsearch error if any.
   * @param error Error to extract challenges from.
   */
  private getNegotiateChallenge(error: errors.ResponseError) {
    // We extract headers from the original Elasticsearch error and not from the top-level `headers`
    // property of the Elasticsearch client error since client merges multiple `WWW-Authenticate`
    // headers into one using comma as a separator. That makes it hard to correctly parse the header
    // since `WWW-Authenticate` values can also include commas.
    const challenges = ([] as string[]).concat(
      error.body?.error?.header?.[WWWAuthenticateHeaderName] || []
    );
    const negotiateChallenge = challenges.find((challenge) =>
      challenge.toLowerCase().startsWith('negotiate')
    );
    if (negotiateChallenge) {
      this.logger.debug(`SPNEGO is supported by the backend, challenges are: [${challenges}].`);
    } else {
      this.logger.debug(`SPNEGO is not supported by the backend, challenges are: [${challenges}].`);
    }

    return negotiateChallenge;
  }
}
