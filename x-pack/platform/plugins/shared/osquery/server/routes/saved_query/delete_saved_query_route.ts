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
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { isSavedQueryPrebuilt } from './utils';
import type { DeleteSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/delete_saved_query_route';
import { deleteSavedQueryRequestParamsSchema } from '../../../common/api/saved_query/delete_saved_query_route';

export const deleteSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .delete({
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
              typeof deleteSavedQueryRequestParamsSchema,
              DeleteSavedQueryRequestParamsSchema
            >(deleteSavedQueryRequestParamsSchema),
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

        const isPrebuilt = await isSavedQueryPrebuilt(
          osqueryContext.service.getPackageService()?.asInternalUser,
          request.params.id,
          spaceScopedClient,
          spaceId
        );
        if (isPrebuilt) {
          return response.conflict({ body: `Elastic prebuilt Saved query cannot be deleted.` });
        }

        await spaceScopedClient.delete(savedQuerySavedObjectType, request.params.id, {
          refresh: 'wait_for',
        });

        return response.ok({
          body: {},
        });
      }
    );
};
