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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { osqueryTool, osqueryLivePathAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { pollActionResponses } from './poll_action_responses';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';
import { assertActionBelongsToSpace } from './assert_action_in_space';

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
  annotations: {
    title: 'Get Osquery Live Query Results',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    'Wait for and retrieve Osquery live-query results for a dispatched action_id. Use after osquery.run_live_query when status is dispatched/partial, or when the analyst needs rows displayed in chat. Polls action responses until wait_seconds elapses or rows arrive.',
  schema: getLiveQueryResultsSchema,
  availability: osqueryLivePathAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { action_id: actionId, wait_seconds: waitSeconds, max_rows: maxRows } = input;
    const waitBudgetMs = (waitSeconds ?? DEFAULT_WAIT_SECONDS) * 1_000;
    const rowLimit = maxRows ?? MAX_RESULT_ROWS;

    if (!(await hasOsqueryToolPrivilege(osqueryContext, request, 'readLiveQueries'))) {
      return unauthorizedToolResult('readLiveQueries');
    }

    try {
      const [coreStart] = await osqueryContext.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceId = space?.id ?? DEFAULT_SPACE_ID;

      // `action_id` arrives straight from the model. Without confirming the
      // action was created in the caller's space, any id read out of a chat
      // transcript would return another space's rows.
      const ownership = await assertActionBelongsToSpace(esClient, actionId, spaceId);
      if (!ownership.found) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `No live query action ${actionId} exists in this space.`,
              },
            },
          ],
        };
      }

      const pollResult = await pollActionResponses(esClient, actionId, {
        budgetMs: waitBudgetMs,
        spaceId,
        expectedAgentCount: ownership.expectedAgentCount,
        maxRows: rowLimit,
        logger,
      });

      // Unreadable results are not pending — do not report an empty state.
      if (pollResult.status === 'error') {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Results for action ${actionId} could not be read: ${
                  pollResult.error ?? 'polling failed'
                }. The query may still be running; retry once the data streams are readable.`,
                action_id: actionId,
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              action_id: actionId,
              status: pollResult.status,
              responded_agents: pollResult.responded,
              ...(pollResult.expected !== undefined && { expected_agents: pollResult.expected }),
              row_count: pollResult.rows.length,
              rows: pollResult.rows,
              ...(pollResult.truncated && { truncated: true }),
              ...(pollResult.errorAgents !== undefined &&
                pollResult.errorAgents > 0 && { errored_agents: pollResult.errorAgents }),
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
