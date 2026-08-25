/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';

const searchAiIndexSchema = z.object({
  ai_index_id: z
    .string()
    .describe("The ID of the AI index to search, e.g. 'nightshift' or 'elastic'"),
  query: z.string().describe('Natural language or keyword query'),
});

// TODO(POC): Replace with context engine registry lookup once the start contract exposes it.
const DEST_BY_INDEX_ID: Readonly<Record<string, string>> = {
  nightshift: 'ai-index-ds-nightshift',
};

export const searchAiIndexTool = (): BuiltinToolDefinition<typeof searchAiIndexSchema> => {
  return {
    id: platformCoreTools.searchAiIndex,
    type: ToolType.builtin,
    description: `Search a registered AI index for knowledge items.

Performs keyword search against the backing data stream with automatic space scoping — the
server injects a space_id filter so results are always restricted to the current space.

Use this tool to retrieve:
- Behavioral signals (type: feature): anomaly patterns, service behavior per stream
- Detection queries (type: query): named ES|QL queries with severity scoring
- Memory (type: memory): synthesized knowledge from past investigations
- Significant events (type: significant_event): recent event summaries with status/severity
`,
    schema: searchAiIndexSchema,
    handler: async ({ ai_index_id, query }, { esClient, spaceId, logger }) => {
      const dest = DEST_BY_INDEX_ID[ai_index_id];
      if (!dest) {
        return {
          results: [
            createErrorResult(
              `Unknown ai_index_id: '${ai_index_id}'. Available: ${Object.keys(DEST_BY_INDEX_ID).join(', ')}`
            ),
          ],
        };
      }

      logger.debug(`search_ai_index: ai_index_id=${ai_index_id} dest=${dest} space=${spaceId}`);

      try {
        const response = await esClient.asInternalUser.search({
          index: dest,
          query: {
            bool: {
              must: [{ match: { description: query } }],
              filter: [{ term: { space_id: spaceId } }],
            },
          },
          size: 20,
          _source: true,
        });

        const hits = response.hits.hits.map((hit) => hit._source);

        return {
          results: [createOtherResult({ hits, total: response.hits.total })],
        };
      } catch (error) {
        logger.error(
          `search_ai_index failed for '${ai_index_id}': ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          results: [
            createErrorResult(`Search failed: ${error instanceof Error ? error.message : String(error)}`),
          ],
        };
      }
    },
    tags: [],
  };
};
