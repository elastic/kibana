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
import type { SchemaService } from '../lib/schema_service';
import type { OsqueryTable } from '../../common/types/schema';
import { createActionHandler } from '../handlers';
import type { CreateLiveQueryRequestBodySchema } from '../../common/api';
import { getUserInfo } from '../lib/get_user_info';
import type { StartPlugins } from '../types';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../common/constants';
import { validateReadOnlyQuery } from './validate_read_only_query';

const osqueryTool = (toolName: string): string => `${internalNamespaces.osquery}.${toolName}`;

export const RUN_LIVE_QUERY_TOOL_ID = osqueryTool('run_live_query');

/** Max wall-clock time the tool will wait for agent responses before returning dispatched status. */
const POLL_BUDGET_MS = 15_000;
const POLL_INTERVAL_MS = 1_500;
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const runLiveQueryTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger,
  schemaService: SchemaService
): BuiltinToolDefinition<typeof runLiveQuerySchema> => ({
  id: RUN_LIVE_QUERY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Run a read-only Osquery live query on specified agents and wait briefly for results. Enforces SchemaService catalog allowlist — only SELECT against known tables. Returns rows when agents respond within ~15s; otherwise returns action_id for later polling.',
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

      // Awaitable-step: poll action responses briefly so the tool can return rows inline
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const deadline = Date.now() + POLL_BUDGET_MS;
      let rows: Array<Record<string, unknown>> = [];
      let responded = 0;

      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        try {
          const searchResult = await esClient.search({
            index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
            size: MAX_RESULT_ROWS,
            ignore_unavailable: true,
            query: {
              bool: {
                filter: [{ term: { action_id: actionId } }],
              },
            },
          });
          const hits = searchResult.hits.hits;
          responded = hits.length;
          if (responded > 0) {
            rows = hits.map((hit) => {
              const source = (hit._source ?? {}) as Record<string, unknown>;
              // Prefer the nested osquery result payload when present
              const nested =
                (source.osquery as Record<string, unknown> | undefined) ??
                (source['osquery.result'] as Record<string, unknown> | undefined);

              return nested ?? source;
            });
            break;
          }
        } catch (pollErr) {
          logger.debug(`Live-query poll error (will retry): ${pollErr}`);
        }
      }

      const status =
        rows.length > 0 ? 'completed' : responded > 0 ? 'partial' : ('dispatched' as const);

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
                  'Agents have not responded within the poll budget. Use the action_id to retrieve results later via GET /api/osquery/live_queries/{id}/results/{actionId}.',
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
