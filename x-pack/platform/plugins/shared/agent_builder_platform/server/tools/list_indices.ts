/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { listSearchSources } from '@kbn/onechat-genai-utils';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const listIndicesSchema = z.object({
  pattern: z
    .string()
    .default('*')
    .describe(
      `Index pattern to match Elasticsearch indices, aliases and datastream names.
      - Correct examples: '.logs-*', '*data*', 'metrics-prod-*', 'my-specific-index', '*'
      - Should only be used if you are certain of a specific index pattern to filter on. *Do not try to guess*.
      - Defaults to '*' to match all indices.`
    ),
  includeKibanaIndices: z
    .boolean()
    .optional()
    .describe(
      '(optional) Include Kibana/system indices (dot-prefixed). Defaults to false.'
    ),
});

export const listIndicesTool = (): BuiltinToolDefinition<typeof listIndicesSchema> => {
  return {
    id: platformCoreTools.listIndices,
    type: ToolType.builtin,
    description: `List the indices, aliases and datastreams from the Elasticsearch cluster.

The 'pattern' optional parameter is an index pattern which can be used to filter resources.
This parameter should only be used when you already know of a specific pattern to filter on,
e.g. if the user provided one. Otherwise, do not try to invent or guess a pattern.

The 'includeKibanaIndices' optional parameter can be used to include Kibana/system indices (dot-prefixed).
This is *off* by default and should only be enabled when you intentionally need to target system resources.`,
    schema: listIndicesSchema,
    handler: async ({ pattern, includeKibanaIndices = false }, { esClient, logger }) => {
      logger.debug(
        `list indices tool called with pattern: ${pattern}, includeKibanaIndices: ${includeKibanaIndices}`
      );
      const {
        indices,
        data_streams: dataStreams,
        aliases,
        warnings,
      } = await listSearchSources({
        pattern,
        includeHidden: false,
        includeKibanaIndices,
        excludeIndicesRepresentedAsAlias: false,
        excludeIndicesRepresentedAsDatastream: true,
        esClient: esClient.asCurrentUser,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              indices: indices.map((index) => ({ name: index.name })),
              aliases: aliases.map((alias) => ({ name: alias.name, indices: alias.indices })),
              data_streams: dataStreams.map((ds) => ({ name: ds.name, indices: ds.indices })),
              warnings,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
