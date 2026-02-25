/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const listIndicesSchema = z.object({
  pattern: z
    .string()
    .default('*')
    .describe(
      `Index pattern to match Elasticsearch indices, aliases and datastream names.
      - Correct examples: '.logs-*', '*data*', 'metrics-prod-*', 'my-specific-index', '*'
      - Cross-cluster search (CCS): use cluster:pattern (e.g. 'remote:logs-*', '*:metrics-*'). Use the list_remote_clusters tool first to discover available remote clusters.
      - Should only be used if you are certain of a specific index pattern to filter on. *Do not try to guess*.
      - Defaults to '*' to match all local indices.`
    ),
});

export const listIndicesTool = (): BuiltinToolDefinition<typeof listIndicesSchema> => {
  return {
    id: platformCoreTools.listIndices,
    type: ToolType.builtin,
    description: `List the indices, aliases and datastreams from the Elasticsearch cluster.
With the default pattern '*', returns local indices only.

To include remote cluster indices (cross-cluster search / CCS), first use the list_remote_clusters tool to discover available remote clusters, then pass an explicit cluster:pattern (e.g. remote:logs-*, *:metrics-*).

The 'pattern' optional parameter is an index pattern which can be used to filter resources.
This parameter should only be used when you already know of a specific pattern to filter on,
e.g. if the user provided one. Otherwise, do not try to invent or guess a pattern.`,
    schema: listIndicesSchema,
    handler: async ({ pattern }, { esClient, logger }) => {
      logger.debug(`list indices tool called with pattern: ${pattern}`);
      // Increase per-type limit when an explicit CCS pattern is used (contains ':'),
      // since remote clusters may contribute many additional results.
      // Note: the default '*' pattern only returns local indices. Use the
      // list_remote_clusters tool to discover remote clusters first.
      const perTypeLimit = pattern.includes(':') ? 50 : undefined;
      const {
        indices,
        data_streams: dataStreams,
        aliases,
        warnings,
      } = await listSearchSources({
        pattern,
        perTypeLimit,
        includeHidden: false,
        includeKibanaIndices: false,
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
