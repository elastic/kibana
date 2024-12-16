/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { omit } from 'lodash';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { SavedQueryResponse } from './types';
import type { SavedQuerySavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';
import { getInstalledSavedQueriesMap } from './utils';
import type { FindSavedQueryRequestQuerySchema } from '../../../common/api/saved_query/find_saved_query_route';
import { findSavedQueryRequestQuerySchema } from '../../../common/api/saved_query/find_saved_query_route';

export const findSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/saved_queries',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readSavedQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof findSavedQueryRequestQuerySchema,
              FindSavedQueryRequestQuerySchema
            >(findSavedQueryRequestQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        try {
          const savedQueries = await savedObjectsClient.find<SavedQuerySavedObject>({
            type: savedQuerySavedObjectType,
            page: request.query.page || 1,
            perPage: request.query.pageSize,
            sortField: request.query.sort || 'id',
            sortOrder: request.query.sortOrder || 'desc',
          });

          const prebuiltSavedQueriesMap = await getInstalledSavedQueriesMap(
            osqueryContext.service.getPackageService()?.asInternalUser
          );
          const savedObjects: SavedQueryResponse[] = savedQueries.saved_objects.map(
            (savedObject) => {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              const ecs_mapping = savedObject.attributes.ecs_mapping;

              savedObject.attributes.prebuilt = !!prebuiltSavedQueriesMap[savedObject.id];

              if (ecs_mapping) {
                // @ts-expect-error update types
                savedObject.attributes.ecs_mapping = convertECSMappingToObject(ecs_mapping);
              }

              const {
                created_at: createdAt,
                created_by: createdBy,
                description,
                id,
                interval,
                timeout,
                platform,
                query,
                removed,
                snapshot,
                version,
                ecs_mapping: ecsMapping,
                updated_at: updatedAt,
                updated_by: updatedBy,
                prebuilt,
              } = savedObject.attributes;

              return {
                created_at: createdAt,
                created_by: createdBy,
                description,
                id,
                removed,
                snapshot,
                version,
                ecs_mapping: ecsMapping,
                interval,
                timeout,
                platform,
                query,
                updated_at: updatedAt,
                updated_by: updatedBy,
                prebuilt,
                saved_object_id: savedObject.id,
              };
            }
          );

          return response.ok({
            body: {
              ...omit(savedQueries, 'saved_objects'),
              data: savedObjects,
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode || e.output?.statusCode || 500,
            body: e,
          });
        }
      }
    );
};
