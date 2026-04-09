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

export function defineCreateOAuthClientRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/oauth/clients',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        body: schema.object({
          resource: schema.string(),
          client_name: schema.maybe(schema.string()),
          client_type: schema.maybe(
            schema.oneOf([schema.literal('public'), schema.literal('confidential')])
          ),
          client_metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          client_logo: schema.maybe(
            schema.object({
              media_type: schema.string(),
              data: schema.string(),
            })
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
            body: { message: 'OAuth management is not available' },
          });
        }

        const result = await oauth.createClient(request, request.body);
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
