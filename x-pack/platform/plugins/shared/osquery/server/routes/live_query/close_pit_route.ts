/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/**
 * Internal route to close a Point in Time (PIT) search context.
 *
 * PITs are opened lazily by `get_live_query_results_route` when pagination exceeds
 * MAX_OFFSET_RESULTS (10,000). The PIT ID is returned to the client, which must
 * close it when navigation away from results or when the UI unmounts.
 *
 * Why this route exists:
 * - PITs consume Elasticsearch server resources until they expire (PIT_KEEP_ALIVE)
 * - Explicit cleanup is a best practice for resource management
 * - The client calls this on component unmount to release resources immediately
 *
 * @internal This is an internal API and not part of the public Osquery API.
 */
export const closePitRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/osquery/live_queries/pit/close',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              pitId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const logger = osqueryContext.logFactory.get('close_pit');

        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          await esClient.closePointInTime({ id: request.body.pitId });

          return response.ok({
            body: { success: true },
          });
        } catch (e) {
          logger.warn(`Error closing PIT: ${e.message}`);

          return response.ok({
            body: { success: false, error: e.message },
          });
        }
      }
    );
};
