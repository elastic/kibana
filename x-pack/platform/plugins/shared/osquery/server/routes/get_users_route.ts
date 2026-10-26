/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../common/constants';
import { PLUGIN_ID } from '../../common';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../common/types';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

interface GetUsersRouteConfig {
  path: string;
  privilege: string;
  savedObjectType: string;
}

const getUsersRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext,
  config: GetUsersRouteConfig
) => {
  router.versioned
    .get({
      access: 'internal',
      path: config.path,
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-${config.privilege}`],
        },
      },
      options: { tags: ['api'] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (_, request, response) => {
        try {
          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );

          const result = await spaceScopedClient.find<{
            created_by?: string;
            created_by_profile_uid?: string;
          }>({
            type: config.savedObjectType,
            fields: ['created_by', 'created_by_profile_uid'],
            perPage: 10000,
            page: 1,
          });

          const usersMap = new Map<string, string | undefined>();
          for (const so of result.saved_objects) {
            const createdBy = so.attributes.created_by;
            if (createdBy && !usersMap.has(createdBy)) {
              usersMap.set(createdBy, so.attributes.created_by_profile_uid);
            }
          }

          const data = Array.from(usersMap.entries()).map(
            ([created_by, created_by_profile_uid]) => ({
              created_by,
              ...(created_by_profile_uid ? { created_by_profile_uid } : {}),
            })
          );

          return response.ok({ body: { data } });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: { message: 'Failed to fetch users' },
          });
        }
      }
    );
};

export const getPackUsersRoute = (router: IRouter, osqueryContext: OsqueryAppContext) =>
  getUsersRoute(router, osqueryContext, {
    path: '/internal/osquery/packs/users',
    privilege: 'readPacks',
    savedObjectType: packSavedObjectType,
  });

export const getSavedQueryUsersRoute = (router: IRouter, osqueryContext: OsqueryAppContext) =>
  getUsersRoute(router, osqueryContext, {
    path: '/internal/osquery/saved_queries/users',
    privilege: 'readSavedQueries',
    savedObjectType: savedQuerySavedObjectType,
  });
