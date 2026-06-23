/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { API_REGISTRIES, apiId, targetSchema } from './registries';

const discoverSchema = z.object({
  target: targetSchema,
  search: z
    .string()
    .optional()
    .describe(
      'Optional keyword to filter APIs by name, namespace, or description. ' +
        'Leave empty to list all available APIs.'
    ),
});

export const apiDiscoverTool = (): BuiltinToolDefinition<typeof discoverSchema> => {
  return {
    id: platformCoreTools.apiDiscover,
    type: ToolType.builtin,
    description: `Discover available HTTP API operations for a given backend target.

Returns a list of API entries with their identifiers, HTTP method, namespace, and description.
Use this tool first to find the \`api\` identifier needed by the \`${platformCoreTools.apiManual}\` and \`${platformCoreTools.apiExecute}\` tools.

Each result includes:
- \`api\`: the identifier to pass to the other API tools, formed from the namespace and name (e.g. \`"indices.create"\`, or \`"bulk"\` for root operations)
- \`name\`: the operation name (e.g. \`"create"\`)
- \`namespace\`: the namespace group (e.g. \`"indices"\`), or null for root operations
- \`description\`: a short description of the operation`,
    schema: discoverSchema,
    handler: async ({ target, search }) => {
      const registry = API_REGISTRIES[target];
      const needle = search?.toLowerCase().trim();

      const results = registry.manifest
        .filter((entry) => {
          if (!needle) return true;
          return (
            entry.name.toLowerCase().includes(needle) ||
            (entry.namespace ?? '').toLowerCase().includes(needle) ||
            entry.description.toLowerCase().includes(needle) ||
            apiId(entry).toLowerCase().includes(needle)
          );
        })
        .map((entry) => ({
          api: apiId(entry),
          name: entry.name,
          namespace: entry.namespace ?? null,
          description: entry.description,
        }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { target, total: results.length, apis: results },
          },
        ],
      };
    },
    tags: [],
  };
};
