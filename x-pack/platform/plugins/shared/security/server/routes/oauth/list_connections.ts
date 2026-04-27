/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { OAUTH_MAX_STRING_FIELD_LENGTH } from './schemas';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineListOAuthConnectionsRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/oauth/connections',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        query: schema.object({
          client_id: schema.maybe(
            schema.string({ minLength: 1, maxLength: OAUTH_MAX_STRING_FIELD_LENGTH })
          ),
          connection_id: schema.maybe(
            schema.string({ minLength: 1, maxLength: OAUTH_MAX_STRING_FIELD_LENGTH })
          ),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const { oauth } = getAuthenticationService();
        if (!oauth) {
          return response.notFound({
            body: { message: 'OAuth management is not available: UIAM is not configured' },
          });
        }

        const result = await oauth.listConnections(
          request,
          request.query.client_id,
          request.query.connection_id
        );
        if (!result) {
          return response.notFound({
            body: { message: 'OAuth management is not available: security features are disabled' },
          });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
