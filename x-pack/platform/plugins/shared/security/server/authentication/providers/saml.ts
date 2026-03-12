/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { isInternalURL } from '@kbn/std';

import type { AuthenticationProviderOptions } from './base';
import { BaseAuthenticationProvider, ELASTIC_CLOUD_SSO_REALM_NAME } from './base';
import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  AUTH_URL_HASH_QUERY_STRING_PARAMETER,
  NEXT_URL_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { AuthenticationInfo } from '../../elasticsearch';
import { getDetailedErrorMessage, InvalidGrantError } from '../../errors';
import type { UiamServicePublic } from '../../uiam';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import type { RefreshTokenResult, TokenPair } from '../tokens';
import { Tokens } from '../tokens';

type RequestId = string;

/**
 * The state supported by the provider (for the SAML handshake or established session).
 */
interface ProviderState extends Partial<TokenPair> {
  /**
   * Map of redirectURLs by requestId.
   */
  requestIdMap?: Record<RequestId, { redirectURL: string }>;

  /**
   * The name of the SAML realm that was used to establish session (may not be known during URL
   * fragment capturing stage).
   */
  realm?: string;
}

/**
 * Describes possible SAML Login flows.
 */
export enum SAMLLogin {
  /**
   * The login flow when user initiates SAML handshake (SP Initiated Login).
   */
  LoginInitiatedByUser = 'login-by-user',
  /**
   * The login flow when IdP responds with SAML Response payload (last step of the SP Initiated
   * Login or IdP initiated Login).
   */
  LoginWithSAMLResponse = 'login-saml-response',
}

/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
type ProviderLoginAttempt =
  | { type: SAMLLogin.LoginInitiatedByUser; redirectURL: string }
  | { type: SAMLLogin.LoginWithSAMLResponse; samlResponse: string; relayState?: string };

/**
 * Checks whether request query includes SAML request from IdP.
 * @param query Parsed HTTP request query.
 */
function isSAMLRequestQuery(query: any): query is { SAMLRequest: string } {
  return query && query.SAMLRequest;
}

/**
 * Checks whether request query includes SAML response from IdP.
 * @param query Parsed HTTP request query.
 */
function isSAMLResponseQuery(query: any): query is { SAMLResponse: string } {
  return query && query.SAMLResponse;
}

/**
 * Checks whether current request can initiate new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and client
  // can be redirected to the Identity Provider where they can authenticate.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

/**
 * SAML _requestId limit
 */
const samlRequestIdLimit = 50;
/**
 * Provider that supports SAML request authentication.
 */
export class SAMLAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'saml';

  /**
   * Optionally specifies Elasticsearch SAML realm name that Kibana should use. If not specified
   * Kibana ACS URL is used for realm matching instead.
   */
  private readonly realm?: string;

  /**
   * Indicates if we should treat non-empty `RelayState` as a deep link in Kibana we should redirect
   * user to after successful IdP initiated login. `RelayState` is ignored for SP initiated login.
   */
  private readonly useRelayStateDeepLink: boolean;

  /**
   * Indicates if we should use UIAM service for this SAML provider.
   */
  private readonly useUiam: boolean;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    samlOptions?: Readonly<{ realm?: string; useRelayStateDeepLink?: boolean }>
  ) {
    super(options);

    this.realm = samlOptions?.realm;
    this.useRelayStateDeepLink = samlOptions?.useRelayStateDeepLink ?? false;

    // Switch SAML authentication provider to UIAM in case it's enabled, and we're using Elastic Cloud SSO realm.
    this.useUiam = !!options.uiam && this.realm === ELASTIC_CLOUD_SSO_REALM_NAME;
  }

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
  public shouldInvalidateIntermediateSessionAfterLogin(state?: unknown) {
    const samlState = state as ProviderState | undefined;
    return !(samlState?.requestIdMap && Object.keys(samlState.requestIdMap).length > 0);
  }

  /**
   * Performs initial login request using SAMLResponse payload.
   * @param request Request instance.
   * @param attempt Login attempt description.
   * @param [state] Optional state object associated with the provider.
   */
  public async login(
    request: KibanaRequest,
    attempt: ProviderLoginAttempt,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to perform a login.');

    // It may happen that Kibana is re-configured to use different realm for the same provider name,
    // we should clear such session and log user out.
    if (state && this.realm && state.realm !== this.realm) {
      const message = `State based on realm "${state.realm}", but provider with the name "${this.options.name}" is configured to use realm "${this.realm}".`;
      this.logger.warn(message);
      return AuthenticationResult.failed(Boom.unauthorized(message));
    }

    if (attempt.type === SAMLLogin.LoginInitiatedByUser) {
      if (!attempt.redirectURL) {
        const message = 'Login attempt should include non-empty `redirectURL` string.';
        this.logger.warn(message);
        return AuthenticationResult.failed(Boom.badRequest(message));
      }
      return this.authenticateViaHandshake(request, attempt.redirectURL, state);
    }

    const { samlResponse, relayState } = attempt;
    const authenticationResult = state
      ? await this.authenticateViaState(request, state)
      : AuthenticationResult.notHandled();

    // Let's check if user is redirected to Kibana from IdP with valid SAMLResponse.
    if (authenticationResult.notHandled()) {
      return await this.loginWithSAMLResponse(request, samlResponse, relayState, state);
    }

    // If user has been authenticated via session or failed to do so because of expired access token,
    // but request also includes SAML payload we should check whether this payload is for the exactly
    // same user and if not we'll re-authenticate user and forward to a page with the respective warning.
    if (
      authenticationResult.succeeded() ||
      (authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error))
    ) {
      return await this.loginWithNewSAMLResponse(
        request,
        samlResponse,
        relayState,
        (authenticationResult.state || state) as ProviderState
      );
    }

    if (authenticationResult.redirected()) {
      this.logger.debug('Login has been successfully performed.');
    } else {
      this.logger.debug(
        () =>
          `Failed to perform a login: ${
            authenticationResult.error && getDetailedErrorMessage(authenticationResult.error)
          }`
      );
    }

    return authenticationResult;
  }

  /**
   * Performs SAML request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}`
    );

    if (HTTPAuthorizationHeader.parseFromRequest(request) != null) {
      this.logger.debug('Cannot authenticate requests with `Authorization` header.');
      return AuthenticationResult.notHandled();
    }

    // It may happen that Kibana is re-configured to use different realm for the same provider name,
    // we should clear such session and log user out.
    if (state && this.realm && state.realm !== this.realm) {
      const message = `State based on realm "${state.realm}", but provider with the name "${this.options.name}" is configured to use realm "${this.realm}".`;
      this.logger.warn(message);
      return AuthenticationResult.failed(Boom.unauthorized(message));
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

    // If we couldn't authenticate by means of all methods above, let's try to capture user URL and
    // initiate SAML handshake, otherwise just return authentication result we have.
    return authenticationResult.notHandled() && canStartNewSession(request)
      ? this.initiateAuthenticationHandshake(request, state)
      : authenticationResult;
  }

  /**
   * Invalidates SAML/UIAM access token if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to log user out via ${request.url.pathname}${request.url.search}.`);

    // Normally when there is no active session in Kibana, `logout` method shouldn't do anything
    // and user will eventually be redirected to the home page to log in. But when SAML SLO is
    // supported there are two special cases that we need to handle even if there is no active
    // Kibana session:
    //
    // 1. When IdP or another SP initiates logout, then IdP will request _every_ SP associated with
    // the current user session to do the logout. So if Kibana receives such request it shouldn't
    // redirect user to the home page, but rather redirect back to IdP with correct logout response
    // and only Elasticsearch knows how to do that.
    //
    // 2. When Kibana initiates logout, then IdP may eventually respond with the logout response. So
    // if Kibana receives such response it shouldn't redirect user to the home page, but rather
    // redirect to the `loggedOut` URL instead.
    const isIdPInitiatedSLORequest = isSAMLRequestQuery(request.query);
    const isSPInitiatedSLOResponse = isSAMLResponseQuery(request.query);
    if (state === undefined && !isIdPInitiatedSLORequest && !isSPInitiatedSLOResponse) {
      this.logger.debug('There is no SAML session to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    // When the provider is in UIAM mode, the UIAM service is responsible for invalidating the user session tokens.
    // Additionally, when in UIAM mode, SAML Single Logout (SLO) is not supported. Therefore, the code should never
    // reach the `else if` branch below. However, even if it does, it will result in a no-op call to Elasticsearch.
    if (state && this.isUiamToken(state.accessToken)) {
      try {
        await this.options.uiam.invalidateSessionTokens(state.accessToken!, state.refreshToken!);
      } catch (err) {
        this.logger.error(
          () => `Failed to deauthenticate UIAM user: ${getDetailedErrorMessage(err)}`
        );
        return DeauthenticationResult.failed(err);
      }
    } else if (state?.accessToken || isIdPInitiatedSLORequest || isSPInitiatedSLOResponse) {
      try {
        // It may _theoretically_ (highly unlikely in practice though) happen that when user receives
        // logout response they may already have a new SAML session (isSPInitiatedSLOResponse == true
        // and state !== undefined). In this case it'd be safer to trigger SP initiated logout
        // for the new session as well.
        const redirect = isIdPInitiatedSLORequest
          ? await this.performIdPInitiatedSingleLogout(request, this.realm || state?.realm)
          : state
          ? await this.performUserInitiatedSingleLogout(state.accessToken!, state.refreshToken!)
          : // Once Elasticsearch can consume logout response we'll be sending it here. See https://github.com/elastic/elasticsearch/issues/40901
            null;

        // Having non-null `redirect` field within logout response means that IdP
        // supports SAML Single Logout and we should redirect user to the specified
        // location to properly complete logout.
        if (redirect != null) {
          this.logger.debug('Redirecting user to Identity Provider to complete logout.');
          return DeauthenticationResult.redirectTo(redirect);
        }
      } catch (err) {
        this.logger.debug(() => `Failed to deauthenticate user: ${getDetailedErrorMessage(err)}`);
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
  private async loginWithSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
    relayState?: string,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to log in with SAML response payload.');

    // If we have a `SAMLResponse` and state, but state doesn't contain all the necessary information,
    // then something unexpected happened and we should fail.
    const { requestIdMap: stateRequestIdMap = {}, realm: stateRealm } = state || {
      requestIdMap: {},
      realm: '',
    };

    const stateRequestIds = Object.keys(stateRequestIdMap) || [];

    this.logger.debug(`Current state: ${JSON.stringify(state)}`);

    if (state && stateRequestIds.length === 0) {
      const message = 'SAML response state does not have corresponding request id.';
      this.logger.warn(message);
      return AuthenticationResult.failed(Boom.badRequest(message));
    }

    // When we don't have requestIds we assume that SAMLResponse came from an IdP initiated login.
    const isIdPInitiatedLogin = !stateRequestIds.length;

    this.logger.debug(
      !isIdPInitiatedLogin
        ? `Login has been previously initiated by Kibana. Current requestIds: ${stateRequestIds}`
        : 'Login has been initiated by Identity Provider.'
    );

    this.logger.debug(
      `SAML RESPONSE: ${samlResponse}:::${JSON.stringify(
        !isIdPInitiatedLogin ? [...stateRequestIds] : []
      )}`
    );

    const providerRealm = this.realm || stateRealm;

    let result: {
      access_token: string;
      refresh_token: string;
      realm: string;
      authentication: AuthenticationInfo;
      in_response_to?: string;
    };
    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/authenticate`.
      // We can replace generic `transport.request` with a dedicated API method call once
      // https://github.com/elastic/elasticsearch/issues/67189 is resolved.
      result = (await this.options.client.asInternalUser.transport.request({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: !isIdPInitiatedLogin ? stateRequestIds : [],
          content: samlResponse,
          ...(providerRealm ? { realm: providerRealm } : {}),
        },
      })) as any;
    } catch (err) {
      let inResponseToRequestId;
      if (err instanceof errors.ResponseError) {
        const body = (err as errors.ResponseError).meta.body as
          | { error: Record<string, string> }
          | undefined;
        inResponseToRequestId =
          body?.error?.['security.saml.unsolicited_in_response_to'] ?? undefined;
      }

      this.logger.error(
        [
          'Failed to log in with SAML response',
          inResponseToRequestId
            ? `SP-initiated, unsolicited InResponseTo: ${inResponseToRequestId}`
            : 'IDP-initiated',
          state ? `current requestIds: [${stateRequestIds}]` : 'no state',
          getDetailedErrorMessage(err),
        ].join(', ')
      );

      // Since we don't know upfront what realm is targeted by the Identity Provider initiated login
      // there is a chance that it failed because of realm mismatch and hence we should return
      // `notHandled` and give other SAML providers a chance to properly handle it instead.
      return isIdPInitiatedLogin && providerRealm
        ? AuthenticationResult.notHandled()
        : AuthenticationResult.failed(err);
    }

    // IdP can pass `RelayState` with the deep link in Kibana during IdP initiated login and
    // depending on the configuration we may need to redirect user to this URL.
    let redirectURLFromRelayState;
    if (isIdPInitiatedLogin && relayState) {
      if (!this.useRelayStateDeepLink) {
        this.options.logger.warn(
          `"RelayState" is provided, but deep links support is not enabled for "${this.type}/${this.options.name}" provider.`
        );
      } else if (!isInternalURL(relayState, this.options.basePath.serverBasePath)) {
        this.options.logger.warn(
          `"RelayState" is provided, but it is not a valid Kibana internal URL.`
        );
      } else {
        this.options.logger.debug(
          `User will be redirected to the Kibana internal URL specified in "RelayState".`
        );
        redirectURLFromRelayState = relayState;
      }
    }

    this.logger.debug('Login has been performed with SAML response.');

    let redirectURLForRequestId;
    let areAnyRequestIdsRemaining = false;
    let remainingRequestIdMap = stateRequestIdMap;

    if (!isIdPInitiatedLogin) {
      const inResponseToRequestId = result.in_response_to;
      this.logger.debug(`Login was performed with requestId: ${inResponseToRequestId}`);

      if (stateRequestIds.length && inResponseToRequestId) {
        redirectURLForRequestId = stateRequestIdMap[inResponseToRequestId].redirectURL;
      } else {
        this.logger.info(
          'No requestId found in SAML response or state does not contain requestId.'
        );
      }

      // Remove value of inResponseToRequestId from stateRequestIdMap and return a map of any
      // requestIds that remain
      [areAnyRequestIdsRemaining, remainingRequestIdMap] = this.updateRemainingRequestIds(
        inResponseToRequestId,
        stateRequestIdMap
      );
    }

    return AuthenticationResult.redirectTo(
      redirectURLFromRelayState ||
        redirectURLForRequestId ||
        `${this.options.basePath.get(request)}/`,
      {
        user: this.authenticationInfoToAuthenticatedUser(result.authentication),
        userProfileGrant: this.isUiamToken(result.access_token)
          ? {
              type: 'uiamAccessToken',
              accessToken: result.access_token,
              clientAuthentication: this.options.uiam.getClientAuthentication(),
            }
          : { type: 'accessToken', accessToken: result.access_token },
        state: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          realm: result.realm,
          ...(areAnyRequestIdsRemaining && { requestIdMap: remainingRequestIdMap }),
        },
      }
    );
  }

  private updateRemainingRequestIds(
    requestIdToRemove: string | undefined,
    remainingRequestIds: Record<RequestId, { redirectURL: string }>
  ): [boolean, Record<RequestId, { redirectURL: string }>] {
    if (requestIdToRemove) {
      this.logger.info(`Removing requestId ${requestIdToRemove} from the state.`);
      delete remainingRequestIds[requestIdToRemove];
    }

    const areAnyRequestIdsRemaining =
      remainingRequestIds && Object.keys(remainingRequestIds)?.length > 0;

    if (areAnyRequestIdsRemaining) {
      this.logger.info(
        `The remaining requestIds in the state are ${Object.keys(remainingRequestIds)}`
      );
    } else {
      this.logger.info(`There are no remaining requestIds in the state.`);
    }

    return [areAnyRequestIdsRemaining, remainingRequestIds];
  }

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
  private async loginWithNewSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
    relayState: string | undefined,
    existingState: ProviderState
  ) {
    this.logger.info('Trying to log in with SAML response payload and existing valid session.');

    // If there are requestIds we want to pass the state
    const shouldPassState =
      existingState?.requestIdMap && Object.keys(existingState.requestIdMap).length > 0;

    // First let's try to authenticate via SAML Response payload.
    const payloadAuthenticationResult = await this.loginWithSAMLResponse(
      request,
      samlResponse,
      relayState,
      shouldPassState ? existingState : null
    );

    if (payloadAuthenticationResult.failed() || payloadAuthenticationResult.notHandled()) {
      return payloadAuthenticationResult;
    }

    if (!payloadAuthenticationResult.shouldUpdateState()) {
      // Should never happen, but if it does - it's a bug.
      return AuthenticationResult.failed(
        new Error('Login with SAML payload did not produce access and refresh tokens.')
      );
    }

    // Now let's invalidate tokens from the existing session.
    try {
      this.logger.debug('Perform IdP initiated local logout.');
      await this.options.tokens.invalidate({
        accessToken: existingState.accessToken!,
        refreshToken: existingState.refreshToken!,
      });
    } catch (err) {
      this.logger.debug(
        () => `Failed to perform IdP initiated local logout: ${getDetailedErrorMessage(err)}`
      );
      return AuthenticationResult.failed(err);
    }

    this.logger.debug('IdP initiated login completed successfully.');
    return payloadAuthenticationResult;
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

    const authHeaders: Record<string, string> | undefined = this.isUiamToken(accessToken)
      ? this.options.uiam.getAuthenticationHeaders(accessToken)
      : { authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString() };

    try {
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(
        () => `Failed to authenticate request via state: ${getDetailedErrorMessage(err)}`
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

    if (!state.refreshToken) {
      this.logger.debug('Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    let refreshTokenResult: RefreshTokenResult;

    try {
      if (this.isUiamToken(state.refreshToken)) {
        this.logger.debug('SAML provider is in UIAM mode, calling UIAM service to refresh tokens.');

        const { accessToken, refreshToken } = await this.options.uiam.refreshSessionTokens(
          state.refreshToken
        );

        const uiamAuthenticatedUser = await this.getUser(
          request,
          this.options.uiam.getAuthenticationHeaders(accessToken)!
        );

        this.logger.debug('SAML provider successfully refreshed tokens via UIAM service.');

        refreshTokenResult = {
          accessToken,
          refreshToken,
          authenticationInfo: uiamAuthenticatedUser,
        };
      } else {
        refreshTokenResult = await this.options.tokens.refresh(state.refreshToken);
      }
    } catch (err) {
      // When user has neither valid access nor refresh token, the only way to resolve this issue is to get new
      // SAML LoginResponse and exchange it for a new access/refresh token pair. To do that we initiate a new SAML
      // handshake. Obviously we can't do that for AJAX requests, so we just reply with `400` and clear error message.
      // There are two reasons for `400` and not `401`: Elasticsearch search responds with `400` so it seems logical
      // to do the same on Kibana side and `401` would force user to logout and do full SLO if it's supported.
      if (err instanceof InvalidGrantError) {
        if (canStartNewSession(request)) {
          this.logger.warn(
            'Both access and refresh tokens are expired. Capturing redirect URL and re-initiating SAML handshake.'
          );
          return this.initiateAuthenticationHandshake(request);
        }

        return AuthenticationResult.failed(Boom.badRequest(err.message));
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
        ...(this.isUiamToken(accessToken) && {
          userProfileGrant: {
            type: 'uiamAccessToken',
            accessToken,
            clientAuthentication: this.options.uiam.getClientAuthentication(),
          },
        }),
        state: { accessToken, refreshToken, realm: this.realm || state.realm },
      }
    );
  }

  /**
   * Tries to start SAML handshake and eventually receive a token.
   * @param request Request instance.
   * @param redirectURL URL to redirect user to after successful SAML handshake.
   * @param state Optional state object associated with the provider.
   */
  private async authenticateViaHandshake(
    request: KibanaRequest,
    redirectURL: string,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to initiate SAML handshake.');

    try {
      // Prefer realm name if it's specified, otherwise fallback to ACS.
      const preparePayload = this.realm ? { realm: this.realm } : { acs: this.getACS() };

      // This operation should be performed on behalf of the user with a privilege that a normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/prepare`.
      // We can replace generic `transport.request` with a dedicated API method call once
      // https://github.com/elastic/elasticsearch/issues/67189 is resolved.
      const {
        id: requestId,
        redirect,
        realm,
      } = (await this.options.client.asInternalUser.transport.request({
        method: 'POST',
        path: '/_security/saml/prepare',
        body: preparePayload,
      })) as any;

      this.logger.debug(
        `Redirecting to Identity Provider with SAML request, request id: ${requestId}`
      );

      // Store request id in the state so that we can reuse it once we receive `SAMLResponse`.
      return AuthenticationResult.redirectTo(redirect, {
        state: {
          requestIdMap: this.updateRequestIdMap(requestId, redirectURL, state?.requestIdMap),
          realm,
        },
        stateCookieOptions: { sameSite: 'None', isSecure: true },
      });
    } catch (err) {
      this.logger.debug(() => `Failed to initiate SAML handshake: ${getDetailedErrorMessage(err)}`);
      return AuthenticationResult.failed(err);
    }
  }

  private updateRequestIdMap(
    newRequestID: string,
    newRedirectURL: string,
    existingRequestIdMap: Record<RequestId, { redirectURL: string }> | undefined
  ): Record<RequestId, { redirectURL: string }> {
    let result: Record<RequestId, { redirectURL: string }> = {};

    if (existingRequestIdMap) {
      result = existingRequestIdMap;
    }

    // We do not want to add an infinite number of requestIds to the state, so we limit it to `samlRequestIdLimit`(50)
    // We remove the first requestId if we have 50
    if (Object.keys(result).length >= samlRequestIdLimit) {
      this.logger.debug(
        `requestId limit reached, removing the oldest requestId ${result[0]} from the state.`
      );

      const oldestRequestId = Object.keys(result)[0];
      delete result[oldestRequestId];
    }

    // We add the new requestId to the end of the array
    result[newRequestID] = { redirectURL: newRedirectURL };

    this.logger.debug(
      `Adding new requestId ${newRequestID} to the state. Current state: ${JSON.stringify(result)}`
    );

    return result;
  }

  /**
   * Calls `saml/logout` with access and refresh tokens and redirects user to the Identity Provider if needed.
   * @param accessToken Access token to invalidate.
   * @param refreshToken Refresh token to invalidate.
   */
  private async performUserInitiatedSingleLogout(accessToken: string, refreshToken: string) {
    this.logger.debug('Single logout has been initiated by the user.');

    // This operation should be performed on behalf of the user with a privilege that normal
    // user usually doesn't have `cluster:admin/xpack/security/saml/logout`.
    // We can replace generic `transport.request` with a dedicated API method call once
    // https://github.com/elastic/elasticsearch/issues/67189 is resolved.
    const { redirect } = (await this.options.client.asInternalUser.transport.request({
      method: 'POST',
      path: '/_security/saml/logout',
      body: { token: accessToken, refresh_token: refreshToken },
    })) as any;

    this.logger.debug('User session has been successfully invalidated.');

    return redirect;
  }

  /**
   * Calls `saml/invalidate` with the `SAMLRequest` query string parameter received from the Identity
   * Provider and redirects user back to the Identity Provider if needed.
   * @param request Request instance.
   * @param realm Configured SAML realm name.
   */
  private async performIdPInitiatedSingleLogout(request: KibanaRequest, realm?: string) {
    this.logger.debug('Single logout has been initiated by the Identity Provider.');

    // Prefer realm name if it's specified, otherwise fallback to ACS.
    const invalidatePayload = realm ? { realm } : { acs: this.getACS() };

    // This operation should be performed on behalf of the user with a privilege that normal
    // user usually doesn't have `cluster:admin/xpack/security/saml/invalidate`.
    // We can replace generic `transport.request` with a dedicated API method call once
    // https://github.com/elastic/elasticsearch/issues/67189 is resolved.
    const { redirect } = (await this.options.client.asInternalUser.transport.request({
      method: 'POST',
      path: '/_security/saml/invalidate',
      // Elasticsearch expects `query_string` without leading `?`, so we should strip it with `slice`.
      body: {
        query_string: request.url.search ? request.url.search.slice(1) : '',
        ...invalidatePayload,
      },
    })) as any;

    this.logger.debug('User session has been successfully invalidated.');

    return redirect;
  }

  /**
   * Constructs and returns Kibana's Assertion consumer service URL.
   */
  private getACS() {
    return `${this.options.getServerBaseURL()}${
      this.options.basePath.serverBasePath
    }/api/security/saml/callback`;
  }

  /**
   * Tries to initiate SAML authentication handshake. If the request already includes user URL hash fragment, we will
   * initiate handshake right away, otherwise we'll redirect user to a dedicated page where we capture URL hash fragment
   * first and only then initiate SAML handshake.
   * @param request Request instance.
   * @param state Optional state object associated with the provider.
   */
  private initiateAuthenticationHandshake(request: KibanaRequest, state?: ProviderState | null) {
    const originalURLHash = request.url.searchParams.get(AUTH_URL_HASH_QUERY_STRING_PARAMETER);

    if (originalURLHash != null) {
      return this.authenticateViaHandshake(
        request,
        `${this.options.getRequestOriginalURL(request)}${originalURLHash}`,
        state
      );
    }

    return AuthenticationResult.redirectTo(
      `${
        this.options.basePath.serverBasePath
      }/internal/security/capture-url?${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
        this.options.getRequestOriginalURL(request, [
          [AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER, this.options.name],
        ])
      )}`,
      // Here we indicate that current session, if any, should be invalidated. It is a no-op for the
      // initial handshake, but is essential when both access and refresh tokens are expired.
      { state: state ? state : null }
    );
  }

  /**
   * Determines whether the provided token is a UIAM token. Generally, we shouldn't rely on the
   * shape of the UIAM tokens to trigger UIAM-specific logic, but this is necessary for the
   * transition period while we support both SAML and UIAM tokens at the same time.
   * @param token ES native or UIAM access or refresh token.
   */
  private isUiamToken(token?: string): this is { options: { uiam: UiamServicePublic } } {
    const isUiamToken = !!token && isUiamCredential(token);
    if (isUiamToken && !this.useUiam) {
      this.logger.error('Detected UIAM token, but the provider is not configured to use UIAM.');
    } else if (!isUiamToken && this.useUiam) {
      this.logger.warn('Detected non-UIAM token, but the provider is configured to use UIAM.');
    }

    return this.useUiam && isUiamToken;
  }
}
