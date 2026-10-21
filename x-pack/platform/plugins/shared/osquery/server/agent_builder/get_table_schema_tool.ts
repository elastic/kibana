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
import { osqueryTool, osqueryLivePathAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import type { SchemaService } from '../lib/schema_service';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';

export const GET_TABLE_SCHEMA_TOOL_ID = osqueryTool('get_table_schema');

const getTableSchemaSchema = z.object({
  table_name: z
    .string()
    .max(255)
    .describe(
      'Osquery table name to get the schema for (e.g. "processes", "process_open_sockets", "scheduled_tasks")'
    ),
  platform: z
    .enum(['linux', 'windows', 'darwin'])
    .optional()
    .describe(
      'Platform to get the schema for. Tables not available on this platform are rejected; columns return the table catalog entry, which covers all supported platforms.'
    ),
});

export const getTableSchemaTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger,
  schemaService: SchemaService
): BuiltinToolDefinition<typeof getTableSchemaSchema> => ({
  id: GET_TABLE_SCHEMA_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'Get Osquery Table Schema',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    'Get the Osquery table schema (columns, types, descriptions) for a specific table. Use this before authoring a custom Osquery query to verify column names and types. The schema is sourced from the installed osquery_manager integration package.',
  schema: getTableSchemaSchema,
  availability: osqueryLivePathAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { table_name: tableName, platform } = input;

    if (!(await hasOsqueryToolPrivilege(osqueryContext, request, 'read'))) {
      return unauthorizedToolResult('read');
    }

    const packageService = osqueryContext.service.getPackageService();
    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    try {
      const schemaResponse = await schemaService.getSchema(
        'osquery',
        packageService,
        spaceScopedClient
      );

      const osqueryTables = schemaResponse.data as Array<{
        name: string;
        description: string;
        platforms: string[];
        columns: Array<{ name: string; description: string; type: string }>;
      }>;

      const table = osqueryTables.find((t) => t.name === tableName);

      if (!table) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                table_name: tableName,
                found: false,
                error: `Table "${tableName}" not found in the Osquery schema. Pick one of available_tables below.`,
                available_tables: osqueryTables.map((t) => t.name).sort(),
              },
            },
          ],
        };
      }

      // `platform` is advertised as narrowing the schema, so it has to actually
      // narrow it rather than being accepted and ignored.
      if (platform && !table.platforms?.includes(platform)) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                table_name: table.name,
                found: false,
                platform,
                platforms: table.platforms,
                error: `Table "${tableName}" is not available on ${platform}. It exists on: ${(
                  table.platforms ?? []
                ).join(', ')}.`,
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
              table_name: table.name,
              description: table.description,
              platforms: table.platforms,
              ...(platform && { platform }),
              columns: table.columns,
              found: true,
              schema_version: schemaResponse.version,
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to get table schema for "${tableName}": ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              table_name: tableName,
              found: false,
              error: `Failed to retrieve schema: ${e instanceof Error ? e.message : String(e)}`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'schema'],
});
