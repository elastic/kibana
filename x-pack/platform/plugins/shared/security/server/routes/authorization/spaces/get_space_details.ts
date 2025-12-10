/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

const canReadDetailedSpaceInfo = async (routeContext) => {
  const { request, server } = routeContext;

  const capabilities = await server.coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'spaces.*',
  });

  return capabilities.spaces?.canReadDetailedInfo ?? false;
};

export function defineGetSpaceDetailsRoutes({ router, license }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/spaces/{spaceId}/details',
      security: {
        authz: {
          requiredPrivileges: [{ anyRequired: ['read_spaces', 'manage_spaces'] }],
        },
      },
      validate: {
        params: schema.object({ spaceId: schema.string({ minLength: 1 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response, server) => {
      if (!license.isEnabled()) {
        return response.notFound();
      }

      try {
        const { spaceId } = request.params;

        if (await canReadDetailedSpaceInfo({ request, server })) {
          // Return detailed space information
          return response.ok({
            body: {
              spaceId,
              detailed: true,
              metadata: {
                description: 'Detailed space information',
                features: ['feature1', 'feature2'],
              },
            },
          });
        } else {
          // Return basic space information
          return response.ok({
            body: {
              spaceId,
              detailed: false,
            },
          });
        }
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
