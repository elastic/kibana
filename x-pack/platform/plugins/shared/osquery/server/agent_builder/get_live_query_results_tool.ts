/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { pollActionResponses } from './poll_action_responses';

export const GET_LIVE_QUERY_RESULTS_TOOL_ID = osqueryTool('get_live_query_results');

const DEFAULT_WAIT_SECONDS = 60;
const MAX_WAIT_SECONDS = 120;
const MAX_RESULT_ROWS = 100;

const getLiveQueryResultsSchema = z.object({
  action_id: z
    .string()
    .min(1)
    .describe('action_id returned by osquery.run_live_query when dispatching a live query'),
  wait_seconds: z
    .number()
    .int()
    .min(1)
    .max(MAX_WAIT_SECONDS)
    .optional()
    .describe(
      `Seconds to wait for agent responses before returning. Default ${DEFAULT_WAIT_SECONDS}, max ${MAX_WAIT_SECONDS}.`
    ),
  max_rows: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULT_ROWS)
    .optional()
    .describe(`Maximum rows to return for chat display. Default ${MAX_RESULT_ROWS}.`),
});

export const getLiveQueryResultsTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof getLiveQueryResultsSchema> => ({
  id: GET_LIVE_QUERY_RESULTS_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Wait for and retrieve Osquery live-query results for a dispatched action_id. Use after osquery.run_live_query when status is dispatched/partial, or when the analyst needs rows displayed in chat. Polls action responses until wait_seconds elapses or rows arrive.',
  schema: getLiveQueryResultsSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { action_id: actionId, wait_seconds: waitSeconds, max_rows: maxRows } = input;
    const waitBudgetMs = (waitSeconds ?? DEFAULT_WAIT_SECONDS) * 1_000;
    const rowLimit = maxRows ?? MAX_RESULT_ROWS;

    try {
      const [coreStart] = await osqueryContext.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;

      const pollResult = await pollActionResponses(esClient, actionId, {
        budgetMs: waitBudgetMs,
        maxRows: rowLimit,
        logger,
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              action_id: actionId,
              status: pollResult.status,
              responded_agents: pollResult.responded,
              row_count: pollResult.rows.length,
              rows: pollResult.rows,
              wait_seconds: waitSeconds ?? DEFAULT_WAIT_SECONDS,
              ...(pollResult.status === 'pending' && {
                guidance:
                  'No agent responses yet. Agents may be offline or the query is still running. Retry with a longer wait_seconds or check Fleet agent health.',
              }),
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to poll live query results: ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Failed to retrieve live query results: ${
                e instanceof Error ? e.message : String(e)
              }`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'live-query'],
});
