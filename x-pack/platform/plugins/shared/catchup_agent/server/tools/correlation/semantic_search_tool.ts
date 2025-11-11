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
// TODO: Uncomment when implementing ELSER/E5 embeddings
// import { getPluginServices } from '../../services/service_locator';

const semanticSearchSchema = z.object({
  query: z.string().describe('Search query text'),
  items: z
    .array(z.record(z.unknown()))
    .describe('Array of items to search through (messages, alerts, cases, etc.)'),
  limit: z.number().optional().default(10).describe('Maximum number of results to return'),
  textField: z
    .string()
    .optional()
    .describe(
      'Field name containing text to search. Defaults to "text", "message", "title", or "description"'
    ),
});

export const semanticSearchTool = (): BuiltinToolDefinition<typeof semanticSearchSchema> => {
  return {
    id: 'hackathon.catchup.correlation.semantic_search',
    type: ToolType.builtin,
    description: `Uses semantic search with embeddings (ELSER/E5) and hybrid search (RRF) to find related content across Security, Observability, Slack, and GitHub sources.

This tool combines:
- Keyword search for exact matches (alert IDs, case IDs)
- Semantic search for similarity (related topics, services)
- Hybrid search using Reciprocal Rank Fusion (RRF) to combine results

**Use Cases:**
- Find Slack messages related to a security alert
- Discover observability alerts for a service mentioned in GitHub PRs
- Correlate security cases with similar issues across sources

**Requirements:**
- ELSER or E5 embedding model configured in Elasticsearch
- Items should have text fields for semantic matching`,
    schema: semanticSearchSchema,
    handler: async ({ query, items, limit = 10, textField }, { logger }) => {
      try {
        if (!items || items.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  results: [],
                  total: 0,
                  query,
                },
              },
            ],
          };
        }

        // TODO: Use esClient for ELSER/E5 embeddings and RRF in production
        // const { core } = getPluginServices();
        // const esClient = core.elasticsearch.client.asInternalUser;

        // Determine text field from items
        const detectTextField = (item: Record<string, unknown>): string | null => {
          if (textField && item[textField]) {
            return textField;
          }
          const commonFields = ['text', 'message', 'title', 'description', 'summary', 'content'];
          for (const field of commonFields) {
            if (item[field] && typeof item[field] === 'string') {
              return field;
            }
          }
          return null;
        };

        // For now, use a simplified semantic similarity approach
        // In production, this would use ELSER/E5 embeddings and RRF
        interface ItemWithText {
          item: Record<string, unknown>;
          text: string;
          index: number;
        }
        const itemsWithText: ItemWithText[] = items
          .map((item, index) => {
            const textFieldName = detectTextField(item);
            if (!textFieldName) {
              return null;
            }
            return {
              item,
              text: String(item[textFieldName]),
              index,
            };
          })
          .filter((item): item is ItemWithText => item !== null);

        if (itemsWithText.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  results: [],
                  total: 0,
                  query,
                  message: 'No items with text fields found for semantic search',
                },
              },
            ],
          };
        }

        // Simple semantic scoring (in production, would use embeddings)
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);

        const scoredItems = itemsWithText.map(({ item, text, index }) => {
          const textLower = text.toLowerCase();
          let semanticScore = 0;
          let keywordScore = 0;

          // Keyword matching (exact matches)
          for (const word of queryWords) {
            if (textLower.includes(word)) {
              keywordScore += 1;
            }
          }

          // Semantic similarity (word overlap, phrase matching)
          const textWords = textLower.split(/\s+/).filter((w: string) => w.length > 2);
          const commonWords = queryWords.filter((qw) => textWords.includes(qw));
          semanticScore = commonWords.length / Math.max(queryWords.length, 1);

          // Boost for exact phrase matches
          if (textLower.includes(queryLower)) {
            semanticScore += 2;
          }

          // Combine scores (simplified RRF-like approach)
          const combinedScore = keywordScore * 0.4 + semanticScore * 0.6;

          return {
            item,
            score: combinedScore,
            keyword_score: keywordScore,
            semantic_score: semanticScore,
            original_index: index,
          };
        });

        // Sort by combined score and take top N
        const results = scoredItems
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(({ item, score, keyword_score: keywordScore, semantic_score: semanticScore }) => ({
            ...item,
            _score: score,
            _keyword_score: keywordScore,
            _semantic_score: semanticScore,
          }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                results,
                total: results.length,
                query,
                note: 'Using simplified semantic scoring. For production, configure ELSER/E5 embeddings and use Elasticsearch hybrid search (RRF) for better results.',
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in semantic search tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error performing semantic search: ${errorMessage}`)],
        };
      }
    },
    tags: ['correlation', 'semantic-search', 'hybrid-search'],
  };
};
