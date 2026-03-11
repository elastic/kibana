/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import { API_VERSIONS, ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getScheduledExecutionDetailsRoute = (
  router: IRouter<DataRequestHandlerContext>,
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
          const { scheduleId, executionCount } = request.params;

          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const responsesResult = await esClient.search({
            index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
            size: 1,
            query: {
              bool: {
                filter: [
                  { term: { schedule_id: scheduleId } },
                  { term: { schedule_execution_count: executionCount } },
                  { term: { space_id: spaceId } },
                ],
              },
            },
            aggs: {
              agent_count: { cardinality: { field: 'agent.id' } },
              total_rows: { sum: { field: 'action_response.osquery.count' } },
              success_count: {
                filter: {
                  bool: { must_not: [{ exists: { field: 'error' } }] },
                },
              },
              error_count: {
                filter: {
                  bool: { must: [{ exists: { field: 'error' } }] },
                },
              },
            },
            sort: [{ '@timestamp': { order: 'desc' } }],
          });

          const totalHits =
            typeof responsesResult.hits.total === 'number'
              ? responsesResult.hits.total
              : responsesResult.hits.total?.value ?? 0;

          if (totalHits === 0) {
            return response.notFound({
              body: { message: 'Scheduled execution not found' },
            });
          }

          const topHit = responsesResult.hits.hits[0]?._source as Record<string, unknown>;
          const aggs = responsesResult.aggregations as Record<string, unknown>;
          const timestamp = topHit?.['@timestamp'] as string;

          const packId = topHit?.pack_id as string | undefined;

          let packName = '';
          let queryName = '';
          let queryText = '';

          if (packId) {
            try {
              const soClient = coreContext.savedObjects.client;
              const packSO = await soClient.get(packSavedObjectType, packId);
              const packAttributes = packSO.attributes as Record<string, unknown>;
              packName = (packAttributes.name as string) || '';

              const queries = packAttributes.queries as Array<Record<string, unknown>> | undefined;
              if (queries) {
                const matchingQuery = queries.find((q) => q.schedule_id === scheduleId);
                if (matchingQuery) {
                  queryName = (matchingQuery.name as string) || (matchingQuery.id as string) || '';
                  queryText = (matchingQuery.query as string) || '';
                }
              }
            } catch {
              // Pack deleted — gracefully degrade to empty name fields
            }
          }

          const agentCount = (aggs?.agent_count as { value?: number })?.value ?? 0;
          const totalRows = (aggs?.total_rows as { value?: number })?.value ?? 0;
          const successCount = (aggs?.success_count as { doc_count?: number })?.doc_count ?? 0;
          const errorCount = (aggs?.error_count as { doc_count?: number })?.doc_count ?? 0;

          return response.ok({
            body: {
              data: {
                scheduleId,
                executionCount,
                packId: packId ?? '',
                packName,
                queryName,
                queryText,
                timestamp,
                agentCount,
                successCount,
                errorCount,
                totalRows,
              },
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: { message: e.message },
          });
        }
      }
    );
};
