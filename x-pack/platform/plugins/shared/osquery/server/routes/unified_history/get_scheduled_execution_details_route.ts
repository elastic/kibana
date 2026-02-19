/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import { PLUGIN_ID } from '../../../common';
import {
  API_VERSIONS,
  ACTION_RESPONSES_INDEX,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';

// osquerybeat writes results to logs-osquery_manager.result (singular, no leading dot)
const RESULTS_DATA_STREAM = 'logs-osquery_manager.result';

export const getScheduledExecutionDetailsRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/history/scheduled/{scheduleId}/{executionCount}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              scheduleId: schema.string(),
              executionCount: schema.number(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const { scheduleId, executionCount } = request.params;

          // 1. Look up pack context to find packName, queryId, queryText
          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );
          const packResults = await spaceScopedClient.find<PackSavedObject>({
            type: packSavedObjectType,
            perPage: 1000,
          });

          let packName: string | undefined;
          let queryId: string | undefined;
          let queryText: string | undefined;

          for (const packSO of packResults.saved_objects) {
            const queries = packSO.attributes.queries ?? [];
            const matchingQuery = queries.find(
              (q: { schedule_id?: string }) => q.schedule_id === scheduleId
            );
            if (matchingQuery) {
              packName = packSO.attributes.name;
              queryId = matchingQuery.id;
              queryText = matchingQuery.query;
              break;
            }
          }

          // 2. Fetch responses for this execution
          const responsesResult = await esClient.search(
            {
              index: `${ACTION_RESPONSES_INDEX}-*,${ACTION_RESPONSES_DATA_STREAM_INDEX}-*`,
              body: {
                query: {
                  bool: {
                    filter: [
                      { term: { schedule_id: scheduleId } },
                      { term: { schedule_execution_count: executionCount } },
                    ],
                  },
                },
                size: 1000,
                sort: [{ '@timestamp': { order: 'desc' } }],
              },
            },
            { ignore: [404] }
          );

          const responseHits = responsesResult.hits?.hits ?? [];

          const totalResponded = responseHits.length;
          const successCount = responseHits.filter((h: Record<string, unknown>) => {
            const source = (h._source ?? {}) as Record<string, unknown>;

            return !source.error;
          }).length;
          const errorCount = totalResponded - successCount;

          // Sum action_response.osquery.count from responses to get total rows
          const totalRows = responseHits.reduce((sum: number, h: Record<string, unknown>) => {
            const source = (h._source ?? {}) as Record<string, unknown>;
            const actionResponse = source.action_response as Record<string, unknown> | undefined;
            const osqueryResponse = actionResponse?.osquery as Record<string, unknown> | undefined;

            return sum + ((osqueryResponse?.count as number) ?? 0);
          }, 0);

          const timestamp =
            responseHits.length > 0
              ? ((responseHits[0]._source ?? {}) as Record<string, unknown>)['@timestamp']
              : undefined;

          // 3. Fetch actual result rows from the results data stream
          // Result docs have a response_id field that links them to response documents
          let results: unknown[] = [];
          const responseIds = responseHits
            .map((h: Record<string, unknown>) => {
              const source = (h._source ?? {}) as Record<string, unknown>;
              return source.response_id as string;
            })
            .filter(Boolean);

          if (responseIds.length > 0) {
            const resultsResult = await esClient.search(
              {
                index: `${RESULTS_DATA_STREAM}-*`,
                body: {
                  query: {
                    bool: {
                      filter: [{ terms: { response_id: responseIds } }],
                    },
                  },
                  size: 1000,
                  sort: [{ '@timestamp': { order: 'desc' } }],
                },
              },
              { ignore: [404] }
            );

            results = resultsResult.hits?.hits ?? [];
          }

          return response.ok({
            body: {
              scheduleId,
              executionCount,
              packName,
              queryText: queryText ?? '',
              timestamp,
              agentCount: totalResponded,
              successCount,
              errorCount,
              totalRows,
              responses: responseHits,
              results,
            },
          });
        } catch (err) {
          const error = err as Error;

          return response.customError({
            statusCode: 500,
            body: { message: error.message },
          });
        }
      }
    );
};
