/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getRegistries, targetSchema } from './shared';
import type { ApiTarget } from './shared';

export interface ApiDiscoverEntry {
  api: string;
  name: string;
  namespace: string | null;
  description: string;
}

export interface ApiDiscoverResultData {
  target: ApiTarget;
  total: number;
  apis: ApiDiscoverEntry[];
}

const discoverSchema = z.object({
  target: targetSchema,
  search: z
    .string()
    .optional()
    .describe(
      'Optional keyword to filter APIs by identifier, name, namespace, or description. ' +
        'Leave empty to list all available APIs, though each target exposes hundreds of them, ' +
        'so an unfiltered listing is large and may be truncated before you see it.'
    ),
});

export const apiDiscoverTool = (): BuiltinToolDefinition<typeof discoverSchema> => {
  return {
    id: platformCoreTools.discover,
    type: ToolType.builtin,
    description: `Discover available HTTP API operations for a given backend target.

Returns a list of API entries with their identifiers, namespace, and description.
Use this tool first to find the \`api\` identifier needed by the \`${platformCoreTools.describe}\` and \`${platformCoreTools.execute}\` tools.

Each result includes:
- \`api\`: the identifier to pass to the other API tools, formed from the namespace and name (e.g. \`"indices.create"\`, or \`"bulk"\` for root operations)
- \`name\`: the operation name (e.g. \`"create"\`)
- \`namespace\`: the namespace group (e.g. \`"indices"\`), or null for root operations
- \`description\`: a short description of the operation`,
    schema: discoverSchema,
    experimental: true,
    handler: async ({ target, search }, { logger }) => {
      let registries;
      try {
        registries = await getRegistries();
      } catch (err) {
        logger.error(`${platformCoreTools.discover}: failed to load the API registry: ${err}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to load the API registry: ${
                err instanceof Error ? err.message : String(err)
              }`,
            }),
          ],
        };
      }

      const registry = registries[target];
      const searchTerm = search?.toLowerCase().trim();

      const apis: ApiDiscoverEntry[] = registry.manifest
        .filter((entry) => {
          if (!searchTerm) return true;
          return (
            entry.name.toLowerCase().includes(searchTerm) ||
            (entry.namespace ?? '').toLowerCase().includes(searchTerm) ||
            entry.description.toLowerCase().includes(searchTerm) ||
            entry.id.toLowerCase().includes(searchTerm)
          );
        })
        .map((entry) => ({
          api: entry.id,
          name: entry.name,
          namespace: entry.namespace ?? null,
          description: entry.description,
        }));

      const data: ApiDiscoverResultData = { target, total: apis.length, apis };

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    },
    tags: [],
  };
};
