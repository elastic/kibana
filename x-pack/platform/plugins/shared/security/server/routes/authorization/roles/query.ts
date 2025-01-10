/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { QueryRolesResult } from '@kbn/security-plugin-types-common';

import type { RouteDefinitionParams } from '../..';
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
  router.post(
    {
      path: '/api/security/role/_query',
      options: {
        summary: `Query roles`,
        access: 'public',
        tags: ['oas-tags:roles'],
      },
      security: {
        authz: {
          enabled: false,
          reason: `This route delegates authorization to Core's scoped ES cluster client`,
        },
      },
      validate: {
        body: schema.object({
          query: schema.maybe(schema.string()),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
          sort: schema.maybe(
            schema.object({
              field: schema.string(),
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            })
          ),
          filters: schema.maybe(
            schema.object({
              showReservedRoles: schema.maybe(schema.boolean({ defaultValue: true })),
            })
          ),
        }),
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
