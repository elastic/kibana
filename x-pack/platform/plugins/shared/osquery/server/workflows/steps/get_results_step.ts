/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  getResultsStepCommonDefinition,
  type GetResultsStepInput,
  type GetResultsStepOutput,
} from '../../../common/workflows/steps/get_results_step';
import {
  ACTIONS_INDEX,
  OSQUERY_INTEGRATION_NAME,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getWorkflowRequest, requireOsqueryReadAuthz } from './utils';

const RESULTS_INDEX = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;

export const getGetResultsStepDefinition = (osqueryContext: OsqueryAppContext) =>
  createServerStepDefinition({
    ...getResultsStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as GetResultsStepInput;

      const fakeRequest = getWorkflowRequest(context);

      await requireOsqueryReadAuthz(osqueryContext, fakeRequest);

      const esClient = context.contextManager.getScopedEsClient();
      const maxRows = input.max_rows ?? 1000;

      try {
        // Get the action document to determine agents
        const actionResult = await esClient.search({
          index: `${ACTIONS_INDEX}*`,
          query: { term: { action_id: input.action_id } },
          size: 1,
        });

        if (!actionResult.hits.hits.length) {
          return {
            output: {
              rows: [],
              row_count: 0,
              responded_agents: 0,
              total_agents: 0,
              status: 'not_found',
            } satisfies GetResultsStepOutput,
          };
        }

        const actionDoc = actionResult.hits.hits[0]._source as Record<string, unknown>;
        const totalAgents = (actionDoc.agents as string[])?.length ?? 0;
        const queries = (actionDoc.queries as Array<{ action_id?: string }>) ?? [];

        // Determine which action_id to query results for
        const queryActionId = input.query_action_id ?? queries[0]?.action_id ?? input.action_id;

        // Count responded agents
        const agentCountResult = await esClient.search({
          index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
          query: { match: { action_id: queryActionId } },
          size: 0,
          aggs: {
            unique_agents: { cardinality: { field: 'agent_id' } },
          },
        });

        const respondedAgents =
          (agentCountResult.aggregations?.unique_agents as { value: number })?.value ?? 0;

        // Fetch result rows with _search_after pagination
        const rows: Array<Record<string, unknown>> = [];
        let searchAfter: unknown[] | undefined;

        while (rows.length < maxRows) {
          const remaining = maxRows - rows.length;
          const searchResult = await esClient.search({
            index: RESULTS_INDEX,
            query: { match: { action_id: queryActionId } },
            size: Math.min(remaining, 1000),
            sort: [{ '@timestamp': { order: 'asc' } }, { 'agent.id': { order: 'asc' } }],
            fields: ['osquery.*', 'agent.*', 'elastic_agent.*'],
            ...(searchAfter ? { search_after: searchAfter } : {}),
          });

          const hits = searchResult.hits.hits;
          if (!hits.length) break;

          for (const hit of hits) {
            const fields = hit.fields ?? {};
            const row: Record<string, unknown> = {};

            for (const [key, value] of Object.entries(fields)) {
              if (key.startsWith('osquery.')) {
                const fieldName = key.replace('osquery.', '');
                row[fieldName] = Array.isArray(value) && value.length === 1 ? value[0] : value;
              }
            }

            if (Object.keys(row).length > 0) {
              rows.push(row);
            }
          }

          searchAfter = hits[hits.length - 1].sort;
          if (hits.length < Math.min(remaining, 1000)) break;
        }

        // Get total row count
        const countResult = await esClient.count({
          index: RESULTS_INDEX,
          query: { match: { action_id: queryActionId } },
        });

        const status: GetResultsStepOutput['status'] =
          respondedAgents >= totalAgents ? 'success' : 'partial';

        return {
          output: {
            rows,
            row_count: countResult.count,
            responded_agents: respondedAgents,
            total_agents: totalAgents,
            status,
          } satisfies GetResultsStepOutput,
        };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }

        context.logger.error('osquery.getResults failed', error as Error);

        throw new ExecutionError({
          type: 'RuntimeError',
          message: (error as Error).message ?? String(error),
        });
      }
    },
  });
