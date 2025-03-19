/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { API_VERSIONS } from '../../../../common/constants';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineDeleteRolesRoutes({ router }: RouteDefinitionParams) {
  router.versioned
    .delete({
      path: '/api/security/role/{name}',
      access: 'public',
      summary: `Delete a role`,
      options: {
        tags: ['oas-tag:roles'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.roles.public.v1,
        security: {
          authz: {
            enabled: false,
            reason: `This route delegates authorization to Core's scoped ES cluster client`,
          },
        },
        validate: {
          request: {
            params: schema.object({ name: schema.string({ minLength: 1 }) }),
          },
          response: {
            204: {
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          await esClient.asCurrentUser.security.deleteRole({
            name: request.params.name,
          });

          return response.noContent();
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
}
