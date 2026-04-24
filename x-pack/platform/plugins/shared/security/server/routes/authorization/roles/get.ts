/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AuthzDisabled } from '@kbn/core-security-server';

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
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.roles.public.v1,
        validate: {
          request: {
            params: schema.object(
              {
                name: schema.string({
                  minLength: 1,
                  meta: { id: 'security_role_name', description: 'The role name.' },
                }),
              },
              {
                meta: {
                  id: 'security_get_role_params',
                  description: 'Path parameters for retrieving a role.',
                },
              }
            ),
            query: schema.maybe(
              schema.object(
                {
                  replaceDeprecatedPrivileges: schema.maybe(
                    schema.boolean({
                      meta: {
                        id: 'security_role_replace_deprecated_privileges',
                        description:
                          'If `true` and the response contains any privileges that are associated with deprecated features, they are omitted in favor of details about the appropriate replacement feature privileges.',
                      },
                    })
                  ),
                },
                {
                  meta: {
                    id: 'security_get_role_query',
                    description: 'Query parameters for retrieving a role.',
                  },
                }
              )
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
                subFeaturePrivilegeIterator,
                // @ts-expect-error `SecurityIndicesPrivileges.names` expected to be `string[]`
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
