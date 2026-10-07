/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { QueryRolesResult } from '@kbn/security-plugin-types-common';

import { queryRolesResponseSchema } from './model';
import type { RouteDefinitionParams } from '../..';
import { API_VERSIONS } from '../../../../common/constants';
import { transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

interface QueryClause {
  [key: string]: any;
}

export function defineQueryRolesRoutes({
  router,
  authz,
  getFeatures,
  logger,
  buildFlavor,
}: RouteDefinitionParams) {
  router.versioned
    .post({
      path: '/api/security/role/_query',
      access: 'public',
      summary: `Query roles`,
      description: 'Query Kibana roles with optional filters, paging, and sorting.',
      options: {
        tags: ['oas-tags:roles'],
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
            requestBody: {
              content: {
                'application/json': {
                  examples: {
                    queryRolesRequest: {
                      value: {
                        query: 'kibana',
                        from: 0,
                        size: 25,
                        sort: { field: 'name', direction: 'asc' },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                content: {
                  'application/json': {
                    examples: {
                      queryRolesResponse: {
                        value: {
                          roles: [
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
                          count: 1,
                          total: 1,
                        },
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
            body: schema.object(
              {
                query: schema.maybe(schema.string()),
                from: schema.maybe(schema.number()),
                size: schema.maybe(schema.number()),
                sort: schema.maybe(
                  schema.object(
                    {
                      field: schema.string(),
                      direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
                    },
                    {
                      meta: {
                        id: 'security_query_roles_sort',
                        description: 'The sort criteria for the query.',
                      },
                    }
                  )
                ),
                filters: schema.maybe(
                  schema.object(
                    {
                      showReservedRoles: schema.maybe(schema.boolean({ defaultValue: true })),
                    },
                    {
                      meta: {
                        id: 'security_query_roles_filters',
                        description: 'The filter criteria for the query.',
                      },
                    }
                  )
                ),
              },
              {
                meta: {
                  id: 'security_query_roles_body',
                  description: 'The request body for querying roles.',
                },
              }
            ),
          },
          response: {
            200: {
              body: () => queryRolesResponseSchema,
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const features = await getFeatures();

          const { query, size, from, sort, filters } = request.body;

          let showReservedRoles = filters?.showReservedRoles;

          if (buildFlavor === 'serverless') {
            showReservedRoles = false;
          }

          const queryPayload: {
            bool: {
              must: QueryClause[];
              should: QueryClause[];
              must_not: QueryClause[];
              minimum_should_match?: number;
            };
          } = { bool: { must: [], should: [], must_not: [] } };

          const nonReservedRolesQuery = [
            {
              bool: {
                must_not: {
                  exists: {
                    field: 'metadata._reserved',
                  },
                },
              },
            },
          ];
          queryPayload.bool.should.push(...nonReservedRolesQuery);
          queryPayload.bool.minimum_should_match = 1;

          if (query) {
            queryPayload.bool.must.push({
              wildcard: {
                name: {
                  value: `*${query}*`,
                  case_insensitive: true,
                },
              },
            });
          }

          if (showReservedRoles) {
            queryPayload.bool.should.push({ term: { 'metadata._reserved': true } });
          }

          const transformedSort = sort && [{ [sort.field]: { order: sort.direction } }];

          const queryRoles = await esClient.asCurrentUser.security.queryRole({
            query: queryPayload,
            from,
            size,
            sort: transformedSort,
          });

          const transformedRoles = (queryRoles.roles || []).map((role) =>
            transformElasticsearchRoleToRole({
              features,
              // @ts-expect-error `remote_cluster` is not known in `Role` type
              elasticsearchRole: role,
              name: role.name,
              application: authz.applicationName,
              logger,
            })
          );

          return response.ok<QueryRolesResult>({
            body: {
              roles: transformedRoles,
              count: queryRoles.count,
              total: queryRoles.total,
            },
          });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
}
