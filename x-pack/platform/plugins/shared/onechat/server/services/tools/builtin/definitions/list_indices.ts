/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { listIndices } from '@kbn/onechat-genai-utils';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { getToolResultId } from '../../utils/tool_result_id';

const listIndicesSchema = z.object({
  pattern: z
    .string()
    .default('*')
    .describe(
      `Index pattern to match Elasticsearch index names.
      - Correct examples: '.logs-*', '*data*', 'metrics-prod-*', 'my-specific-index', '*'
      - Should only be used if you are certain of a specific index pattern to filter on. *Do not try to guess*.
      - Defaults to '*' to match all indices.`
    ),
  showDetails: z
    .boolean()
    .default(false)
    .describe(
      'If true, returns extra details like health, status, and shard counts. Defaults to false.'
    ),
});

export const listIndicesTool = (): BuiltinToolDefinition<typeof listIndicesSchema> => {
  return {
    id: builtinToolIds.listIndices,
    description: `List the indices in the Elasticsearch cluster the current user has access to.

    The 'pattern' optional parameter is an index pattern which can be used to filter indices.
    This parameter should only be used when you already know of a specific pattern to filter on,
    e.g. if the user provided one. Otherwise, do not try to invent or guess a pattern.`,
    schema: listIndicesSchema,
    handler: async ({ pattern, showDetails }, { esClient }) => {
      const result = await listIndices({
        pattern,
        showDetails,
        includeHidden: false,
        includeKibanaIndices: false,
        // LLM is stupid with index patterns, this works around it
        listAllIfNoResults: true,
        esClient: esClient.asCurrentUser,
      });

      return {
        results: [
          {
            toolResultId: getToolResultId(),
            type: ToolResultType.other,
            data: {
              indices: result,
            },
          },
        ],
      };
    },
    tags: [builtinTags.retrieval],
  };
};
