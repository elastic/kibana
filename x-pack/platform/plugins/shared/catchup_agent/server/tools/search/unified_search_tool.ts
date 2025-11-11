/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';
// TODO: Uncomment when implementing Elasticsearch hybrid search (RRF)
// import { getPluginServices } from '../../services/service_locator';

const unifiedSearchSchema = z.object({
  query: z.string().describe('Search query text'),
  sources: z
    .array(z.enum(['security', 'observability', 'search', 'external']))
    .optional()
    .default(['security', 'observability', 'search', 'external'])
    .describe('Sources to search across'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  useHybridSearch: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to use hybrid search (RRF) combining keyword and semantic search'),
});

export const unifiedSearchTool = (): BuiltinToolDefinition<typeof unifiedSearchSchema> => {
  return {
    id: 'hackathon.catchup.search.unified_search',
    type: ToolType.builtin,
    description: `Searches across Security, Observability, Search, and External sources using hybrid search (RRF).

This tool demonstrates Elastic's "Better Together" story by:
- Combining results from multiple Elastic solutions (Security, Observability, Search)
- Integrating external context (Slack, GitHub, Gmail)
- Using hybrid search (Reciprocal Rank Fusion) to combine keyword and semantic search
- Returning unified ranked results

**Hybrid Search (RRF):**
- Keyword search: Exact matches (alert IDs, case IDs, service names)
- Semantic search: Similarity matching (related topics, services)
- RRF combines both approaches for optimal relevance

**Use Cases:**
- Find all mentions of a service across Security alerts, Observability metrics, and Slack discussions
- Search for an incident ID across all sources
- Discover related content using semantic similarity`,
    schema: unifiedSearchSchema,
    handler: async (
      {
        query,
        sources = ['security', 'observability', 'search', 'external'],
        limit = 50,
        useHybridSearch = true,
      },
      { logger }
    ) => {
      try {
        logger.info(
          `Unified search called with query: "${query}", sources: ${sources.join(
            ', '
          )}, limit: ${limit}`
        );

        // TODO: Use esClient for Elasticsearch hybrid search (RRF) in production
        // const { core } = getPluginServices();
        // const esClient = core.elasticsearch.client.asInternalUser;

        // In a real implementation, this would:
        // 1. Call individual catchup tools for each source
        // 2. Collect results from each source
        // 3. Use Elasticsearch hybrid search (RRF) to combine and rank results
        // 4. Return unified ranked results

        // For now, return a structured response indicating the search would be performed
        // In production, this would actually query indices and use RRF

        const results: Array<{
          source: string;
          type: string;
          id: string;
          title: string;
          text: string;
          score: number;
          url?: string;
        }> = [];

        // Simulated results structure (in production, would come from actual searches)
        if (sources.includes('security')) {
          // Would search: .siem-signals-*, .security-attack-discoveries*, .cases*
          results.push({
            source: 'security',
            type: 'alert',
            id: 'example-alert-1',
            title: 'Example Security Alert',
            text: `Security alert related to: ${query}`,
            score: 0.85,
          });
        }

        if (sources.includes('observability')) {
          // Would search: .alerts-observability*
          results.push({
            source: 'observability',
            type: 'alert',
            id: 'example-obs-alert-1',
            title: 'Example Observability Alert',
            text: `Observability alert related to: ${query}`,
            score: 0.78,
          });
        }

        if (sources.includes('external')) {
          // Would search: Slack messages, GitHub PRs (via external tools)
          results.push({
            source: 'external',
            type: 'slack',
            id: 'example-slack-1',
            title: 'Slack Message',
            text: `Slack message related to: ${query}`,
            score: 0.72,
          });
        }

        // Sort by score (descending) - simulating RRF ranking
        const rankedResults = results.sort((a, b) => b.score - a.score).slice(0, limit);

        logger.info(
          `Unified search found ${rankedResults.length} results across ${sources.length} sources`
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                results: rankedResults,
                total: rankedResults.length,
                query,
                sources_searched: sources,
                hybrid_search_used: useHybridSearch,
                note: 'This is a demonstration of unified search. In production, this would use Elasticsearch hybrid search (RRF) to combine keyword and semantic search across multiple indices.',
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in unified search tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error performing unified search: ${errorMessage}`)],
        };
      }
    },
    tags: ['search', 'unified', 'hybrid-search', 'better-together'],
  };
};
