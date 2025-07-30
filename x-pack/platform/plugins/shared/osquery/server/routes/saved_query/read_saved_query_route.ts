/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { SavedQueryResponse } from './types';
import type { SavedQuerySavedObject } from '../../common/types';
import { isSavedQueryPrebuilt } from './utils';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';
import type { ReadSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/read_saved_query_route';
import { readSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/read_saved_query_route';

export const readSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/saved_queries/{id}',
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
            params: buildRouteValidation<
              typeof readSavedQueryRequestParamsSchema,
              ReadSavedQueryRequestParamsSchema
            >(readSavedQueryRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        const space = await osqueryContext.service.getActiveSpace(request);
        const spaceId = space?.id ?? DEFAULT_SPACE_ID;

        const savedQuery = await spaceScopedClient.get<SavedQuerySavedObject>(
          savedQuerySavedObjectType,
          request.params.id
        );

        if (savedQuery.attributes.ecs_mapping) {
          // @ts-expect-error update types
          savedQuery.attributes.ecs_mapping = convertECSMappingToObject(
            savedQuery.attributes.ecs_mapping
          );
        }

        const prebuiltById = await isSavedQueryPrebuilt(
          osqueryContext.service.getPackageService()?.asInternalUser,
          savedQuery.id,
          spaceScopedClient,
          spaceId
        );

        const prebuiltByOriginId =
          !prebuiltById && savedQuery.originId
            ? await isSavedQueryPrebuilt(
                osqueryContext.service.getPackageService()?.asInternalUser,
                savedQuery.originId,
                spaceScopedClient,
                spaceId
              )
            : false;

        savedQuery.attributes.prebuilt = prebuiltById || prebuiltByOriginId;

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
        } = savedQuery.attributes;

        const data: SavedQueryResponse = {
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
          saved_object_id: savedQuery.id,
        };

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
