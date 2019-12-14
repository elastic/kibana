/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import Boom from 'boom';
import Joi from 'joi';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { userSchema } from '../../../lib/user_schema';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { wrapError } from '../../../../../../../plugins/security/server';
import { KibanaRequest } from '../../../../../../../../src/core/server';

export function initUsersApi({ authc: { login }, config }, server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/security/v1/users',
    handler(request) {
      return callWithRequest(request, 'shield.getUser').then(_.values, wrapError);
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'GET',
    path: '/api/security/v1/users/{username}',
    handler(request) {
      const username = request.params.username;
      return callWithRequest(request, 'shield.getUser', { username }).then(response => {
        if (response[username]) return response[username];
        throw Boom.notFound();
      }, wrapError);
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/users/{username}',
    handler(request) {
      const username = request.params.username;
      const body = _(request.payload)
        .omit(['username', 'enabled'])
        .omit(_.isNull);
      return callWithRequest(request, 'shield.putUser', { username, body }).then(
        () => request.payload,
        wrapError
      );
    },
    config: {
      validate: {
        payload: userSchema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'DELETE',
    path: '/api/security/v1/users/{username}',
    handler(request, h) {
      const username = request.params.username;
      return callWithRequest(request, 'shield.deleteUser', { username }).then(
        () => h.response().code(204),
        wrapError
      );
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'POST',
    path: '/api/security/v1/users/{username}/password',
    async handler(request, h) {
      const username = request.params.username;
      const { password, newPassword } = request.payload;
      const isCurrentUser = username === request.auth.credentials.username;

      // We should prefer `token` over `basic` if possible.
      const providerToLoginWith = config.authc.providers.includes('token') ? 'token' : 'basic';

      // If user tries to change own password, let's check if old password is valid first by trying
      // to login.
      if (isCurrentUser) {
        try {
          const authenticationResult = await login(KibanaRequest.from(request), {
            provider: providerToLoginWith,
            value: { username, password },
            // We shouldn't alter authentication state just yet.
            stateless: true,
          });

          if (!authenticationResult.succeeded()) {
            return Boom.unauthorized(authenticationResult.error);
          }
        } catch (err) {
          return Boom.unauthorized(err);
        }
      }

      try {
        const body = { password: newPassword };
        await callWithRequest(request, 'shield.changePassword', { username, body });

        // Now we authenticate user with the new password again updating current session if any.
        if (isCurrentUser) {
          const authenticationResult = await login(KibanaRequest.from(request), {
            provider: providerToLoginWith,
            value: { username, password: newPassword },
          });

          if (!authenticationResult.succeeded()) {
            return Boom.unauthorized(authenticationResult.error);
          }
        }
      } catch (err) {
        return wrapError(err);
      }

      return h.response().code(204);
    },
    config: {
      validate: {
        payload: Joi.object({
          password: Joi.string(),
          newPassword: Joi.string().required(),
        }),
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
