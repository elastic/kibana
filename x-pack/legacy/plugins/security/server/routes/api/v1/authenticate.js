/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { schema } from '@kbn/config-schema';
import {
  canRedirectRequest,
  wrapError,
  OIDCAuthenticationFlow,
} from '../../../../../../../plugins/security/server';
import { KibanaRequest } from '../../../../../../../../src/core/server';
import { createCSPRuleString } from '../../../../../../../../src/legacy/server/csp';

export function initAuthenticateApi({ authc: { login, logout }, config }, server) {
  function prepareCustomResourceResponse(response, contentType) {
    return response
      .header('cache-control', 'private, no-cache, no-store')
      .header('content-security-policy', createCSPRuleString(server.config().get('csp.rules')))
      .type(contentType);
  }

  server.route({
    method: 'POST',
    path: '/api/security/v1/login',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      response: {
        emptyStatusCode: 204,
      },
    },
    async handler(request, h) {
      const { username, password } = request.payload;

      try {
        // We should prefer `token` over `basic` if possible.
        const providerToLoginWith = config.authc.providers.includes('token') ? 'token' : 'basic';
        const authenticationResult = await login(KibanaRequest.from(request), {
          provider: providerToLoginWith,
          value: { username, password },
        });

        if (!authenticationResult.succeeded()) {
          throw Boom.unauthorized(authenticationResult.error);
        }

        return h.response();
      } catch (err) {
        throw wrapError(err);
      }
    },
  });

  /**
   * The route should be configured as a redirect URI in OP when OpenID Connect implicit flow
   * is used, so that we can extract authentication response from URL fragment and send it to
   * the `/api/security/v1/oidc` route.
   */
  server.route({
    method: 'GET',
    path: '/api/security/v1/oidc/implicit',
    config: { auth: false },
    async handler(request, h) {
      return prepareCustomResourceResponse(
        h.response(`
          <!DOCTYPE html>
          <title>Kibana OpenID Connect Login</title>
          <script src="${server
            .config()
            .get('server.basePath')}/api/security/v1/oidc/implicit.js"></script>
        `),
        'text/html'
      );
    },
  });

  /**
   * The route that accompanies `/api/security/v1/oidc/implicit` and renders a JavaScript snippet
   * that extracts fragment part from the URL and send it to the `/api/security/v1/oidc` route.
   * We need this separate endpoint because of default CSP policy that forbids inline scripts.
   */
  server.route({
    method: 'GET',
    path: '/api/security/v1/oidc/implicit.js',
    config: { auth: false },
    async handler(request, h) {
      return prepareCustomResourceResponse(
        h.response(`
          window.location.replace(
            '${server
              .config()
              .get('server.basePath')}/api/security/v1/oidc?authenticationResponseURI=' + 
              encodeURIComponent(window.location.href)
          );
        `),
        'text/javascript'
      );
    },
  });

  server.route({
    // POST is only allowed for Third Party initiated authentication
    // Consider splitting this route into two (GET and POST) when it's migrated to New Platform.
    method: ['GET', 'POST'],
    path: '/api/security/v1/oidc',
    config: {
      auth: false,
      validate: {
        query: Joi.object()
          .keys({
            iss: Joi.string().uri({ scheme: 'https' }),
            login_hint: Joi.string(),
            target_link_uri: Joi.string().uri(),
            code: Joi.string(),
            error: Joi.string(),
            error_description: Joi.string(),
            error_uri: Joi.string().uri(),
            state: Joi.string(),
            authenticationResponseURI: Joi.string(),
          })
          .unknown(),
      },
    },
    async handler(request, h) {
      try {
        const query = request.query || {};
        const payload = request.payload || {};

        // An HTTP GET request with a query parameter named `authenticationResponseURI` that includes URL fragment OpenID
        // Connect Provider sent during implicit authentication flow to the Kibana own proxy page that extracted that URL
        // fragment and put it into `authenticationResponseURI` query string parameter for this endpoint. See more details
        // at https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth
        let loginAttempt;
        if (query.authenticationResponseURI) {
          loginAttempt = {
            flow: OIDCAuthenticationFlow.Implicit,
            authenticationResponseURI: query.authenticationResponseURI,
          };
        } else if (query.code || query.error) {
          // An HTTP GET request with a query parameter named `code` (or `error`) as the response to a successful (or
          // failed) authentication from an OpenID Connect Provider during authorization code authentication flow.
          // See more details at https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth.
          loginAttempt = {
            flow: OIDCAuthenticationFlow.AuthorizationCode,
            //  We pass the path only as we can't be sure of the full URL and Elasticsearch doesn't need it anyway.
            authenticationResponseURI: request.url.path,
          };
        } else if (query.iss || payload.iss) {
          // An HTTP GET request with a query parameter named `iss` or an HTTP POST request with the same parameter in the
          // payload as part of a 3rd party initiated authentication. See more details at
          // https://openid.net/specs/openid-connect-core-1_0.html#ThirdPartyInitiatedLogin
          loginAttempt = {
            flow: OIDCAuthenticationFlow.InitiatedBy3rdParty,
            iss: query.iss || payload.iss,
            loginHint: query.login_hint || payload.login_hint,
          };
        }

        if (!loginAttempt) {
          throw Boom.badRequest('Unrecognized login attempt.');
        }

        // We handle the fact that the user might get redirected to Kibana while already having an session
        // Return an error notifying the user they are already logged in.
        const authenticationResult = await login(KibanaRequest.from(request), {
          provider: 'oidc',
          value: loginAttempt,
        });
        if (authenticationResult.succeeded()) {
          return Boom.forbidden(
            'Sorry, you already have an active Kibana session. ' +
              'If you want to start a new one, please logout from the existing session first.'
          );
        }

        if (authenticationResult.redirected()) {
          return h.redirect(authenticationResult.redirectURL);
        }

        throw Boom.unauthorized(authenticationResult.error);
      } catch (err) {
        throw wrapError(err);
      }
    },
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/logout',
    config: {
      auth: false,
    },
    async handler(request, h) {
      if (!canRedirectRequest(KibanaRequest.from(request))) {
        throw Boom.badRequest('Client should be able to process redirect response.');
      }

      try {
        const deauthenticationResult = await logout(
          // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
          // set of query string parameters (e.g. SAML/OIDC logout request parameters).
          KibanaRequest.from(request, {
            query: schema.object({}, { allowUnknowns: true }),
          })
        );
        if (deauthenticationResult.failed()) {
          throw wrapError(deauthenticationResult.error);
        }

        return h.redirect(
          deauthenticationResult.redirectURL || `${server.config().get('server.basePath')}/`
        );
      } catch (err) {
        throw wrapError(err);
      }
    },
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/me',
    handler(request) {
      return request.auth.credentials;
    },
  });
}
