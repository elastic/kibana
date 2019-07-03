/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { schema } from '@kbn/config-schema';
import { canRedirectRequest, wrapError } from '../../../../../../../plugins/security/server';
import { KibanaRequest } from '../../../../../../../../src/core/server';

export function initAuthenticateApi({ authc: { login, logout }, config }, server) {

  server.route({
    method: 'POST',
    path: '/api/security/v1/login',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required()
        })
      },
      response: {
        emptyStatusCode: 204,
      }
    },
    async handler(request, h) {
      const { username, password } = request.payload;

      try {
        // We should prefer `token` over `basic` if possible.
        const providerToLoginWith = config.authc.providers.includes('token')
          ? 'token'
          : 'basic';
        const authenticationResult = await login(KibanaRequest.from(request), {
          provider: providerToLoginWith,
          value: { username, password }
        });

        if (!authenticationResult.succeeded()) {
          throw Boom.unauthorized(authenticationResult.error);
        }

        return h.response();
      } catch(err) {
        throw wrapError(err);
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/saml',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          SAMLResponse: Joi.string().required(),
          RelayState: Joi.string().allow('')
        })
      }
    },
    async handler(request, h) {
      try {
        // When authenticating using SAML we _expect_ to redirect to the SAML Identity provider.
        const authenticationResult = await login(KibanaRequest.from(request), {
          provider: 'saml',
          value: { samlResponse: request.payload.SAMLResponse }
        });

        if (authenticationResult.redirected()) {
          return h.redirect(authenticationResult.redirectURL);
        }

        return Boom.unauthorized(authenticationResult.error);
      } catch (err) {
        return wrapError(err);
      }
    }
  });

  server.route({
    // POST is only allowed for Third Party initiated authentication
    method: ['GET', 'POST'],
    path: '/api/security/v1/oidc',
    config: {
      auth: false,
      validate: {
        query: Joi.object().keys({
          iss: Joi.string().uri({ scheme: 'https' }),
          login_hint: Joi.string(),
          target_link_uri: Joi.string().uri(),
          code: Joi.string(),
          error: Joi.string(),
          error_description: Joi.string(),
          error_uri: Joi.string().uri(),
          state: Joi.string()
        }).unknown()
      }
    },
    async handler(request, h) {
      try {
        // We handle the fact that the user might get redirected to Kibana while already having an session
        // Return an error notifying the user they are already logged in.
        const authenticationResult = await login(KibanaRequest.from(request), {
          provider: 'oidc',
          // Checks if the request object represents an HTTP request regarding authentication with OpenID Connect.
          // This can be
          //  - An HTTP GET request with a query parameter named `iss` as part of a 3rd party initiated authentication
          //  - An HTTP POST request with a parameter named `iss` as part of a 3rd party initiated authentication
          //  - An HTTP GET request with a query parameter named `code` as the response to a successful authentication from
          //    an OpenID Connect Provider
          //  - An HTTP GET request with a query parameter named `error` as the response to a failed authentication from
          //    an OpenID Connect Provider
          value: {
            code: request.query && request.query.code,
            iss: (request.query && request.query.iss) || (request.payload && request.payload.iss),
            loginHint:
              (request.query && request.query.login_hint) ||
              (request.payload && request.payload.login_hint),
          },
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
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/logout',
    config: {
      auth: false
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
    }
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/me',
    handler(request) {
      return request.auth.credentials;
    }
  });
}
