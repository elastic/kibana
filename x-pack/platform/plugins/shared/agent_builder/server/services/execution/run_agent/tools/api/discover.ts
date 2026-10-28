/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { DISCOVER_RESULT_LIMIT, searchApisForTarget, targetSchema } from '../../api';
import type { ApiSummary } from '../../api';
import { registryUnavailableErrorResult } from './errors';

const MAX_SEARCH_LENGTH = 500;

export interface ApiDiscoverResultData {
  target: ApiTarget;
  apis: ApiSummary[];
}

const discoverSchema = lazySchema(() =>
  z.object({
    target: targetSchema,
    search: z
      .string()
      .max(MAX_SEARCH_LENGTH)
      .describe(
        'Natural language description of what you want to do (e.g. "create an index", ' +
          '"get the health of the cluster"), or an API identifier or part of one.'
      ),
  })
);

export const createDiscoverApisTool = (): InternalBuiltinToolDefinition<typeof discoverSchema> => {
  return {
    id: internalTools.discoverApis,
    type: ToolType.builtin,
    description: `Search the HTTP API operations of a given backend target.

Use this tool first to find the \`api\` identifier needed by the \`${internalTools.describeApi}\` and \`${internalTools.executeApi}\` tools.

Describe what you want to do in a few words, or pass an API identifier or part of one. Results are
ranked by relevance and only the top ${DISCOVER_RESULT_LIMIT} are returned. When the operation you
need is not listed, search again with different words, or search the other target.

Each result includes:
- \`api\`: the identifier to pass to the other API tools, formed from the namespace and name (e.g. \`"indices.create"\`, or \`"bulk"\` for root operations)
- \`name\`: the operation name (e.g. \`"create"\`)
- \`namespace\`: the namespace group (e.g. \`"indices"\`), or null for root operations
- \`description\`: a short description of the operation`,
    schema: discoverSchema,
    handler: async ({ target, search }, { logger }) => {
      if (search.trim() === '') {
        return {
          results: [
            createErrorResult({
              message:
                'search is required. Describe what you want to do in natural language, or give an ' +
                'API identifier.',
            }),
          ],
        };
      }

      const searchResult = await searchApisForTarget(target, search);
      if (searchResult.status !== 'searched') {
        return {
          results: [
            registryUnavailableErrorResult(searchResult.error, {
              toolId: internalTools.discoverApis,
              logger,
            }),
          ],
        };
      }

      const { apis } = searchResult;
      const data: ApiDiscoverResultData = { target, apis };

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
