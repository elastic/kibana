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
import type { SchemaService } from '../lib/schema_service';
import type { OsqueryTable } from '../../common/types/schema';
import { createActionHandler } from '../handlers';
import type { CreateLiveQueryRequestBodySchema } from '../../common/api';
import { getUserInfo } from '../lib/get_user_info';
import type { StartPlugins } from '../types';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { validateReadOnlyQuery } from './validate_read_only_query';
import { pollActionResponses } from './poll_action_responses';

export const RUN_LIVE_QUERY_TOOL_ID = osqueryTool('run_live_query');

/** Initial inline wait before returning action_id for osquery.get_live_query_results. */
const POLL_BUDGET_MS = 30_000;
const MAX_RESULT_ROWS = 100;

const runLiveQuerySchema = z.object({
  query: z
    .string()
    .describe(
      'Read-only Osquery SQL query (e.g. "SELECT pid, name, path FROM processes WHERE on_disk = 0"). Only tables from the osquery schema catalog are allowed.'
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
    .describe('Query timeout in seconds (passed to osquerybeat). Default 60.'),
});

export const runLiveQueryTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger,
  schemaService: SchemaService
): BuiltinToolDefinition<typeof runLiveQuerySchema> => ({
  id: RUN_LIVE_QUERY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Run a read-only Osquery live query on specified agents and wait briefly for results. Enforces SchemaService catalog allowlist — only SELECT against known tables. Returns rows when agents respond within ~30s; otherwise returns action_id — call osquery.get_live_query_results to wait longer and display rows in chat.',
  schema: runLiveQuerySchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { query, agent_ids: agentIds, timeout } = input;

    const packageService = osqueryContext.service.getPackageService();
    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    // SchemaService catalog = extensible allowlist (FR-005)
    let allowedTables: Set<string>;
    try {
      const schemaResponse = await schemaService.getSchema(
        'osquery',
        packageService,
        spaceScopedClient
      );
      const tables = schemaResponse.data as OsqueryTable[];
      allowedTables = new Set(tables.map((t) => t.name.toLowerCase()));
    } catch (e) {
      logger.warn(`Failed to load Osquery schema for allowlist: ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Cannot enforce read-only allowlist — schema catalog unavailable: ${
                e instanceof Error ? e.message : String(e)
              }`,
            },
          },
        ],
      };
    }

    const validationError = validateReadOnlyQuery(query, allowedTables);
    if (validationError) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: validationError },
          },
        ],
      };
    }

    const createActionParams: CreateLiveQueryRequestBodySchema = {
      query,
      agent_ids: agentIds,
      ...(timeout !== undefined && { timeout }),
    };

    try {
      const [coreStart, startPlugins] = await osqueryContext.getStartServices();
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

      const actionId = result.response.action_id as string;
      const agentCount = result.response.agents?.length ?? result.fleetActionsCount;

      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const pollResult = await pollActionResponses(esClient, actionId, {
        budgetMs: POLL_BUDGET_MS,
        maxRows: MAX_RESULT_ROWS,
        logger,
      });
      const { rows, responded, status: pollStatus } = pollResult;
      const status =
        pollStatus === 'completed'
          ? 'completed'
          : pollStatus === 'partial'
          ? 'partial'
          : ('dispatched' as const);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              action_id: actionId,
              agent_count: agentCount,
              status,
              query,
              timeout_seconds: timeout ?? 60,
              responded_agents: responded,
              row_count: rows.length,
              rows: rows.slice(0, MAX_RESULT_ROWS),
              ...(status === 'dispatched' && {
                guidance:
                  'Agents have not responded within the initial poll budget. Call osquery.get_live_query_results with this action_id to wait longer and return rows for chat display.',
              }),
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
            type: ToolResultType.error,
            data: {
              message: `Failed to dispatch query: ${e instanceof Error ? e.message : String(e)}`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'live-query'],
});
