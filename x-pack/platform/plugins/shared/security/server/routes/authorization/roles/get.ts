/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { API_VERSIONS } from '../../../../common/constants';
import { transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineGetRolesRoutes({
  router,
  authz,
  getFeatures,
  subFeaturePrivilegeIterator,
  logger,
}: RouteDefinitionParams) {
  router.versioned
    .get({
      path: '/api/security/role/{name}',
      access: 'public',
      summary: `Get a role`,
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
            params: schema.object({
              name: schema.string({
                minLength: 1,
                meta: { description: 'The role name.' },
              }),
            }),
            query: schema.maybe(
              schema.object({
                replaceDeprecatedPrivileges: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'If `true` and the response contains any privileges that are associated with deprecated features, they are omitted in favor of details about the appropriate replacement feature privileges.',
                    },
                  })
                ),
              })
            ),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;

          const [features, elasticsearchRoles] = await Promise.all([
            getFeatures(),
            await esClient.asCurrentUser.security.getRole({
              name: request.params.name,
            }),
          ]);

          const elasticsearchRole = elasticsearchRoles[request.params.name];

          if (elasticsearchRole) {
            return response.ok({
              body: transformElasticsearchRoleToRole({
                features,
                subFeaturePrivilegeIterator, // @ts-expect-error `SecurityIndicesPrivileges.names` expected to be `string[]`
                elasticsearchRole,
                name: request.params.name,
                application: authz.applicationName,
                logger,
                replaceDeprecatedKibanaPrivileges:
                  request.query?.replaceDeprecatedPrivileges ?? false,
              }),
            });
          }

          return response.notFound();
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
}
