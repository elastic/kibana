/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createActionHandler } from '../handlers';
import type { CreateLiveQueryRequestBodySchema } from '../../common/api';
import { getUserInfo } from '../lib/get_user_info';
import type { StartPlugins } from '../types';

const osqueryTool = (toolName: string): string => `${internalNamespaces.osquery}.${toolName}`;

export const RUN_LIVE_QUERY_TOOL_ID = osqueryTool('run_live_query');

const runLiveQuerySchema = z.object({
  query: z
    .string()
    .describe(
      'Read-only Osquery SQL query (e.g. "SELECT pid, name, path FROM processes WHERE on_disk = 0"). Only tables from the osquery schema are allowed.'
    ),
  agent_ids: z
    .array(z.string())
    .min(1)
    .describe(
      'Specific agent IDs to run the query on (from Elastic Agent / osquerybeat enrollment)'
    ),
  timeout: z
    .number()
    .int()
    .min(1)
    .max(86400)
    .optional()
    .describe('Query timeout in seconds. Default 60.'),
});

export const runLiveQueryTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof runLiveQuerySchema> => ({
  id: RUN_LIVE_QUERY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Run a read-only Osquery live query on specified agents. Returns the action ID for polling results. The query must be read-only (SELECT statements only). Results are returned inline when available; for long-running queries, poll using the returned action_id.',
  schema: runLiveQuerySchema,
  availability: {
    cacheMode: 'space',
    handler: async () => ({
      status: osqueryContext.experimentalFeatures.agentBuilderTools ? 'available' : 'unavailable',
      reason: osqueryContext.experimentalFeatures.agentBuilderTools
        ? undefined
        : 'Osquery Agent Builder tools are not enabled',
    }),
  },
  handler: async (input, { request }) => {
    const { query, agent_ids: agentIds, timeout } = input;

    const createActionParams: CreateLiveQueryRequestBodySchema = {
      query,
      agent_ids: agentIds,
      ...(timeout !== undefined && { timeout }),
    };

    try {
      const [, startPlugins] = await osqueryContext.getStartServices();
      const securityStart = (startPlugins as StartPlugins).security;
      const currentUser = await getUserInfo({
        request,
        security: securityStart,
        logger,
      });
      const space = await osqueryContext.service.getActiveSpace(request);

      const result = await createActionHandler(osqueryContext, createActionParams, {
        metadata: {
          currentUser: currentUser?.username ?? undefined,
          userProfileUid: currentUser?.profile_uid ?? undefined,
        },
        space,
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              action_id: result.response.action_id,
              agent_count: result.response.agents?.length ?? result.fleetActionsCount,
              status: 'dispatched',
              query,
              timeout_seconds: timeout ?? 60,
              guidance:
                'Query dispatched to Fleet. Results will be collected from osquerybeat. The action_id can be used to poll for results.',
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to dispatch live query: ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              action_id: null,
              status: 'failed',
              query,
              error: `Failed to dispatch query: ${e instanceof Error ? e.message : String(e)}`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'live-query'],
});
