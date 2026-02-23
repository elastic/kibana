/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { pick } from 'lodash';
import type { Observable } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type {
  GetLiveQueryDetailsRequestParamsSchema,
  GetLiveQueryDetailsRequestQuerySchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import {
  getLiveQueryDetailsRequestParamsSchema,
  getLiveQueryDetailsRequestQuerySchema,
} from '../../../common/api';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { fetchLiveQueryDetails } from '../../services';

export const getLiveQueryDetailsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/live_queries/{id}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof getLiveQueryDetailsRequestParamsSchema,
              GetLiveQueryDetailsRequestParamsSchema
            >(getLiveQueryDetailsRequestParamsSchema),
            query: buildRouteValidation<
              typeof getLiveQueryDetailsRequestQuerySchema,
              GetLiveQueryDetailsRequestQuerySchema
            >(getLiveQueryDetailsRequestQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const search = await context.search;
          const status = await fetchLiveQueryDetails(search, {
            actionId: request.params.id,
            spaceId,
            abortSignal,
          });

          return response.ok({
            body: {
              data: {
                ...pick(
                  status.actionDetails._source,
                  'action_id',
                  'expiration',
                  '@timestamp',
                  'agent_selection',
                  'agents',
                  'user_id',
                  'user_profile_uid',
                  'pack_id',
                  'pack_name',
                  'prebuilt_pack'
                ),
                queries: status.queries.map((query) => ({
                  action_id: query.action_id,
                  id: query.id,
                  query: query.query,
                  agents: query.agents,
                  pending: query.pending,
                  responded: query.responded,
                  successful: query.successful,
                  failed: query.failed,
                  docs: query.docs,
                  status: query.status,
                })),
                status: status.status === 'expired' ? 'completed' : status.status,
              },
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: {
              message: e.message,
            },
          });
        }
      }
    );
};

function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());

  return controller.signal;
}
