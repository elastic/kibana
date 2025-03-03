/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy, some, isBoolean, isNumber } from 'lodash';
import type { IRouter } from '@kbn/core/server';
import type { CreateSavedQueryRequestSchemaDecoded } from '../../../common/api';
import { API_VERSIONS } from '../../../common/constants';
import type { SavedQueryResponse } from './types';
import type { SavedQuerySavedObject } from '../../common/types';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertECSMappingToArray } from '../utils';
import { createSavedQueryRequestSchema } from '../../../common/api';

export const createSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/saved_queries',
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
            body: buildRouteValidation<
              typeof createSavedQueryRequestSchema,
              CreateSavedQueryRequestSchemaDecoded
            >(createSavedQueryRequestSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        const {
          id,
          description,
          platform,
          query,
          version,
          interval,
          snapshot,
          removed,
          timeout,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ecs_mapping,
        } = request.body;

        const currentUser = coreContext.security.authc.getCurrentUser()?.username;

        const conflictingEntries = await savedObjectsClient.find<SavedQuerySavedObject>({
          type: savedQuerySavedObjectType,
          filter: `${savedQuerySavedObjectType}.attributes.id: "${id}"`,
        });

        if (
          conflictingEntries.saved_objects.length &&
          some(conflictingEntries.saved_objects, ['attributes.id', id])
        ) {
          return response.conflict({ body: `Saved query with id "${id}" already exists.` });
        }

        const savedQuerySO = await savedObjectsClient.create(
          savedQuerySavedObjectType,
          pickBy(
            {
              id,
              description,
              query,
              platform,
              version,
              interval,
              snapshot,
              removed,
              timeout,
              ecs_mapping: convertECSMappingToArray(ecs_mapping),
              created_by: currentUser,
              created_at: new Date().toISOString(),
              updated_by: currentUser,
              updated_at: new Date().toISOString(),
            },
            (value) => !isEmpty(value) || isBoolean(value) || isNumber(value)
          )
        );

        const { attributes } = savedQuerySO;

        const data: Partial<SavedQueryResponse> = pickBy(
          {
            created_at: attributes.created_at,
            created_by: attributes.created_by,
            description: attributes.description,
            id: attributes.id,
            removed: attributes.removed,
            snapshot: attributes.snapshot,
            version: attributes.version,
            interval: attributes.interval,
            timeout: attributes.timeout,
            platform: attributes.platform,
            query: attributes.query,
            updated_at: attributes.updated_at,
            updated_by: attributes.updated_by,
            saved_object_id: savedQuerySO.id,
            ecs_mapping,
          },
          (value) => !isEmpty(value) || isNumber(value)
        );

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
