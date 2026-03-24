/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineRevokeOAuthConnectionRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/oauth/clients/{client_id}/connections/{connection_id}/_revoke',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        params: schema.object({
          client_id: schema.string(),
          connection_id: schema.string(),
        }),
        body: schema.object({
          reason: schema.maybe(schema.string()),
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
            body: { message: 'OAuth management is not available' },
          });
        }

        const result = await oauth.revokeConnection(
          request,
          request.params.client_id,
          request.params.connection_id,
          request.body.reason
        );
        if (!result) {
          return response.badRequest({ body: { message: 'OAuth management is not available' } });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
