/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { SavedQuerySavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { ReadSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/read_saved_query_route';
import { readSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/read_saved_query_route';
import { prepareSavedObjectCopy } from '../utils/copy_saved_object';
import type { CopySavedQueryResponseData } from './types';

export const copySavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/saved_queries/{id}/copy',
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
              typeof readSavedQueryRequestParamsSchema,
              ReadSavedQueryRequestParamsSchema
            >(readSavedQueryRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const logger = osqueryContext.logFactory.get('savedQuery');

        try {
          const copyContext = await prepareSavedObjectCopy<SavedQuerySavedObject>(
            osqueryContext,
            request,
            {
              type: savedQuerySavedObjectType,
              loggerName: 'savedQuery',
              getNameFromAttributes: (attrs) => attrs.id,
            }
          );

          if (!copyContext) {
            return response.notFound({
              body: `Saved query with id "${request.params.id}" not found.`,
            });
          }

          const { client, sourceAttributes, newName, username, now } = copyContext;

          const {
            id: _sourceId,
            prebuilt: _prebuilt,
            created_at: _createdAt,
            created_by: _createdBy,
            updated_at: _updatedAt,
            updated_by: _updatedBy,
            ...restAttributes
          } = sourceAttributes;

          const newSavedQuerySO = await client.create(savedQuerySavedObjectType, {
            ...restAttributes,
            id: newName,
            created_by: username,
            created_at: now,
            updated_by: username,
            updated_at: now,
          });

          const { attributes } = newSavedQuerySO;

          const data: CopySavedQueryResponseData = {
            created_at: attributes.created_at,
            created_by: attributes.created_by,
            description: attributes.description,
            id: attributes.id,
            removed: attributes.removed,
            snapshot: attributes.snapshot,
            interval: attributes.interval,
            timeout: attributes.timeout,
            platform: attributes.platform,
            query: attributes.query,
            ecs_mapping: attributes.ecs_mapping,
            updated_at: attributes.updated_at,
            updated_by: attributes.updated_by,
            saved_object_id: newSavedQuerySO.id,
          };

          return response.ok({
            body: {
              data,
            },
          });
        } catch (error) {
          logger.error(`Failed to copy saved query "${request.params.id}": ${error}`);

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to copy saved query: ${error.message}`,
            },
          });
        }
      }
    );
};
