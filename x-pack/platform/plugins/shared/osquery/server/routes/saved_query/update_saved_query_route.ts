/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, some } from 'lodash';

import type { IRouter } from '@kbn/core/server';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { isSavedQueryPrebuilt } from './utils';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';
import type { UpdateSavedQueryResponse } from './types';
import type {
  UpdateSavedQueryRequestBodySchema,
  UpdateSavedQueryRequestParamsSchema,
} from '../../../common/api/saved_query/update_saved_query_route';
import {
  updateSavedQueryRequestBodySchema,
  updateSavedQueryRequestParamsSchema,
} from '../../../common/api/saved_query/update_saved_query_route';

export const updateSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/osquery/saved_queries/{id}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writeSavedQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof updateSavedQueryRequestParamsSchema,
              UpdateSavedQueryRequestParamsSchema
            >(updateSavedQueryRequestParamsSchema),
            body: buildRouteValidation<
              typeof updateSavedQueryRequestBodySchema,
              UpdateSavedQueryRequestBodySchema
            >(updateSavedQueryRequestBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;
        const currentUser = coreContext.security.authc.getCurrentUser()?.username;

        const {
          id,
          description,
          platform,
          query,
          version,
          interval,
          timeout,
          snapshot,
          removed,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ecs_mapping,
        } = request.body;

        const isPrebuilt = await isSavedQueryPrebuilt(
          osqueryContext.service.getPackageService()?.asInternalUser,
          request.params.id
        );

        if (isPrebuilt) {
          return response.conflict({ body: `Elastic prebuilt Saved query cannot be updated.` });
        }

        const conflictingEntries = await savedObjectsClient.find<{ id: string }>({
          type: savedQuerySavedObjectType,
          filter: `${savedQuerySavedObjectType}.attributes.id: "${id}"`,
        });

        if (
          some(
            filter(
              conflictingEntries.saved_objects,
              (soObject) => soObject.id !== request.params.id
            ),
            ['attributes.id', id]
          )
        ) {
          return response.conflict({ body: `Saved query with id "${id}" already exists.` });
        }

        const updatedSavedQuerySO = await savedObjectsClient.update(
          savedQuerySavedObjectType,
          request.params.id,
          {
            id,
            description: description || '',
            platform,
            query,
            version,
            interval,
            timeout,
            snapshot,
            removed,
            ecs_mapping: convertECSMappingToArray(ecs_mapping),
            updated_by: currentUser,
            updated_at: new Date().toISOString(),
          },
          {
            refresh: 'wait_for',
          }
        );

        if (ecs_mapping || updatedSavedQuerySO.attributes.ecs_mapping) {
          // @ts-expect-error update types
          updatedSavedQuerySO.attributes.ecs_mapping =
            ecs_mapping ||
            (updatedSavedQuerySO.attributes.ecs_mapping &&
              // @ts-expect-error update types
              convertECSMappingToObject(updatedSavedQuerySO.attributes.ecs_mapping)) ||
            {};
        }

        const { attributes } = updatedSavedQuerySO;

        const data: Partial<UpdateSavedQueryResponse> = {
          description: attributes.description,
          id: attributes.id,
          removed: attributes.removed,
          snapshot: attributes.snapshot,
          version: attributes.version,
          ecs_mapping: attributes.ecs_mapping,
          interval: attributes.interval,
          timeout: attributes.timeout,
          platform: attributes.platform,
          query: attributes.query,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          saved_object_id: updatedSavedQuerySO.id,
        };

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
