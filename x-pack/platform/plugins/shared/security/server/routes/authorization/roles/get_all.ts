/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';

import { getRolesResponseSchema } from './model';
import type { RouteDefinitionParams } from '../..';
import { API_VERSIONS } from '../../../../common/constants';
import { compareRolesByName, transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

const queryAllRoles = async (
  client: ElasticsearchClient
): Promise<Record<string, estypes.SecurityRoleDescriptor>> => {
  const roles: estypes.SecurityQueryRoleQueryRole[] = [];
  let searchAfter: estypes.SortResults | undefined;

  while (true) {
    const page = await client.security.queryRole({
      size: 1000,
      sort: [{ name: 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    roles.push(...page.roles);
    if (roles.length >= page.total || page.roles.length === 0) {
      return Object.fromEntries(
        roles.map(({ name, ...role }) => [
          name,
          {
            ...role,
            cluster: role.cluster ?? [],
            indices: role.indices ?? [],
            applications: role.applications ?? [],
            run_as: role.run_as ?? [],
          },
        ])
      );
    }
    searchAfter = page.roles.at(-1)?._sort;
    if (!searchAfter?.length) {
      throw new Error('Missing sort values while querying roles');
    }
  }
};

export function defineGetAllRolesRoutes({
  router,
  authz,
  getFeatures,
  subFeaturePrivilegeIterator,
  logger,
  buildFlavor,
}: RouteDefinitionParams) {
  router.versioned
    .get({
      path: '/api/security/role',
      access: 'public',
      summary: `Get all roles`,
      description: 'Retrieve all Kibana roles.',
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
        options: {
          oasOperationObject: () => ({
            responses: {
              200: {
                content: {
                  'application/json': {
                    examples: {
                      getAllRolesResponse: {
                        value: [
                          {
                            name: 'my_kibana_role',
                            description: 'My custom Kibana role.',
                            elasticsearch: {
                              cluster: ['monitor'],
                              indices: [{ names: ['logs-*'], privileges: ['read'] }],
                              run_as: [],
                            },
                            kibana: [{ spaces: ['default'], base: ['read'], feature: {} }],
                            metadata: {},
                            transient_metadata: { enabled: true },
                            _unrecognized_applications: [],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          }),
        },
        validate: {
          request: {
            query: schema.maybe(
              schema.object({
                includeReservedRoles: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'If true, include built-in roles on serverless. By default, serverless returns only custom roles. Other deployments always include built-in roles.',
                    },
                  })
                ),
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
              body: () => getRolesResponseSchema,
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const hideReservedRoles =
            buildFlavor === 'serverless' && !request.query?.includeReservedRoles;
          const esClient = (await context.core).elasticsearch.client;
          const [features, elasticsearchRoles] = await Promise.all([
            getFeatures(),
            buildFlavor === 'serverless' && request.query?.includeReservedRoles
              ? queryAllRoles(esClient.asCurrentUser)
              : esClient.asCurrentUser.security.getRole(),
          ]);

          // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
          return response.ok({
            body: Object.entries<estypes.SecurityGetRoleRole | estypes.SecurityRoleDescriptor>(
              elasticsearchRoles
            )
              .map(([roleName, elasticsearchRole]) =>
                transformElasticsearchRoleToRole({
                  features,
                  subFeaturePrivilegeIterator,
                  // @ts-expect-error @elastic/elasticsearch SecurityIndicesPrivileges.names expected to be string[]
                  elasticsearchRole,
                  name: roleName,
                  application: authz.applicationName,
                  logger,
                  replaceDeprecatedKibanaPrivileges:
                    request.query?.replaceDeprecatedPrivileges ?? false,
                })
              )
              .filter((role) => {
                return !hideReservedRoles || !role.metadata?._reserved;
              })
              .sort(compareRolesByName),
          });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
}
