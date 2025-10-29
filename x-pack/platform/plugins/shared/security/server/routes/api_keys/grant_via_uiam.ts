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

export function defineGrantViaUiamApiKeyRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/grant_via_uiam',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the UIAM service via the bearer token in the request',
        },
      },
      validate: {
        body: schema.object({
          name: schema.string(),
          expiration: schema.maybe(schema.string()),
          metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const grantedApiKey = await getAuthenticationService().apiKeys.grantViaUiam(
          request,
          request.body
        );

        if (!grantedApiKey) {
          return response.badRequest({ body: { message: 'API Keys are not available' } });
        }

        return response.ok({ body: grantedApiKey });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
