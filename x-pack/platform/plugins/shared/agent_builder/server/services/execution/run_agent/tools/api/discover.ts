/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { listApisForTarget, targetSchema } from '../../api';
import type { ApiSummary } from '../../api';
import { registryUnavailableErrorResult } from './errors';

export interface ApiDiscoverResultData {
  target: ApiTarget;
  total: number;
  apis: ApiSummary[];
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

export const createDiscoverApisTool = (): BuiltinToolDefinition<typeof discoverSchema> => {
  return {
    id: internalTools.discoverApis,
    type: ToolType.builtin,
    description: `Discover available HTTP API operations for a given backend target.

Returns a list of API entries with their identifiers, namespace, and description.
Use this tool first to find the \`api\` identifier needed by the \`${internalTools.describeApi}\` and \`${internalTools.executeApi}\` tools.

Each result includes:
- \`api\`: the identifier to pass to the other API tools, formed from the namespace and name (e.g. \`"indices.create"\`, or \`"bulk"\` for root operations)
- \`name\`: the operation name (e.g. \`"create"\`)
- \`namespace\`: the namespace group (e.g. \`"indices"\`), or null for root operations
- \`description\`: a short description of the operation`,
    schema: discoverSchema,
    handler: async ({ target, search }, { logger }) => {
      const listResult = await listApisForTarget(target, search);
      if (listResult.status !== 'listed') {
        return {
          results: [
            registryUnavailableErrorResult(listResult.error, {
              toolId: internalTools.discoverApis,
              logger,
            }),
          ],
        };
      }

      const { apis } = listResult;
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
