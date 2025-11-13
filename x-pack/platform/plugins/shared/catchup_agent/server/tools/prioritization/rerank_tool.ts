/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';
import { getPluginServices } from '../../services/service_locator';
import { extractDataFromResponse } from '../summary/helpers/data_extraction';

const rerankSchema = z.object({
  items: z
    .union([z.array(z.record(z.unknown())), z.record(z.unknown()), z.string()])
    .describe(
      'Array of items to rerank, or workflow response object/string that will be parsed to extract items'
    )
    .transform((value) => {
      // If already an array, return it
      if (Array.isArray(value)) {
        return value;
      }

      // If it's a string, try to parse it as JSON
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Recursively handle parsed value
          if (Array.isArray(parsed)) {
            return parsed;
          }
          // Continue processing as object
          value = parsed;
        } catch {
          return [];
        }
      }

      // If it's a workflow response structure {results: [{data: ...}]} or any object
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Use extractDataFromResponse to handle workflow response structures
        // This handles cases where data is nested in {results: [{data: {content: "..."}}]}
        const extractedData = extractDataFromResponse(value);

        // Check if extracted data is an array (direct array of items)
        if (Array.isArray(extractedData)) {
          return extractedData;
        }

        // Extract correlations or prioritized_items array from extracted data
        if (extractedData?.correlations && Array.isArray(extractedData.correlations)) {
          return extractedData.correlations;
        }
        if (extractedData?.prioritized_items && Array.isArray(extractedData.prioritized_items)) {
          return extractedData.prioritized_items;
        }

        // Direct access to correlations or prioritized_items on original value (fallback)
        if (value.correlations && Array.isArray(value.correlations)) {
          return value.correlations;
        }
        if (value.prioritized_items && Array.isArray(value.prioritized_items)) {
          return value.prioritized_items;
        }
      }

      // Default to empty array if we can't extract anything
      return [];
    })
    .pipe(z.array(z.record(z.unknown()))),
  query: z
    .string()
    .describe('Query text used for reranking (e.g., "security incidents", "critical alerts")'),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of items to return after reranking'),
  inferenceId: z
    .string()
    .optional()
    .describe(
      'Inference endpoint ID for reranking model. If not provided, will attempt to use default reranker.'
    ),
  textField: z
    .string()
    .optional()
    .describe(
      'Field name containing text to rerank. Defaults to "text", "message", "title", or "description" based on item structure.'
    ),
});

export const rerankTool = (): BuiltinToolDefinition<typeof rerankSchema> => {
  return {
    id: 'hackathon.catchup.prioritization.rerank',
    type: ToolType.builtin,
    description: `Uses Elastic's RERANK command to prioritize items by relevance to a query.

This tool leverages ES|QL's RERANK command with inference models to score and rank items based on their relevance to a query. It's particularly useful for:
- Prioritizing security alerts by relevance to "critical security incidents"
- Ranking Slack messages by importance to "team updates"
- Sorting cases by relevance to "urgent issues"

The tool accepts an array of items with text content and uses a reranking model to score them. Items are returned in order of relevance.

**Requirements:**
- A reranking inference endpoint must be configured in Elasticsearch
- Items should have text fields (text, message, title, description, etc.)
- The inference endpoint must have task type 'rerank'

**Example Usage:**
- Rerank security alerts: query="critical security incidents", items=[alerts with text fields]
- Prioritize Slack messages: query="important team updates", items=[messages with text fields]
- Sort cases by urgency: query="urgent issues requiring attention", items=[cases with descriptions]`,
    schema: rerankSchema,
    handler: async ({ items, query, limit = 10, inferenceId, textField }, { logger, runner }) => {
      try {
        // Items is already normalized to an array by the schema transform
        // No need for additional extraction logic here
        logger.debug(`Rerank tool received ${items.length} items for query: ${query}`);

        if (items.length === 0) {
          logger.warn('Rerank tool received empty items array - data extraction may have failed');
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  prioritized_items: [],
                  total: 0,
                  query,
                },
              },
            ],
          };
        }

        const { core } = getPluginServices();
        const esClient = core.elasticsearch.client.asInternalUser;

        // Determine text field from items
        const detectTextField = (item: Record<string, unknown>): string | null => {
          if (textField && item[textField]) {
            return textField;
          }
          // Try common field names
          const commonFields = ['text', 'message', 'title', 'description', 'summary', 'content'];
          for (const field of commonFields) {
            if (item[field] && typeof item[field] === 'string') {
              return field;
            }
          }
          return null;
        };

        // Find inference endpoint if not provided
        let rerankInferenceId = inferenceId;
        if (!rerankInferenceId) {
          // Try to find a rerank inference endpoint
          try {
            await esClient.inference.get({
              inference_id: '_all',
            });
            // Look for a rerank endpoint (this is a simplified check)
            // In practice, you'd need to check the endpoint configuration
            rerankInferenceId = 'rerank'; // Default assumption
          } catch (error) {
            logger.warn(
              `Could not auto-detect rerank inference endpoint: ${error}. Using default 'rerank'.`
            );
            rerankInferenceId = 'rerank';
          }
        }

        const itemsWithText = items
          .map((item, index) => {
            const textFieldName = detectTextField(item);
            if (!textFieldName) {
              logger.warn(`Item at index ${index} has no detectable text field, skipping`);
              return null;
            }
            return {
              ...item,
              _id: `item-${index}`,
              text: item[textFieldName], // Normalize to 'text' field for reranking
            };
          })
          .filter(
            (item): item is Record<string, unknown> & { _id: string; text: unknown } =>
              item !== null
          );

        if (itemsWithText.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  prioritized_items: [],
                  total: 0,
                  query,
                  message: 'No items with text fields found for reranking',
                },
              },
            ],
          };
        }

        // Create a temporary index for reranking
        let tempIndex: string | null = null;

        try {
          tempIndex = `.catchup-rerank-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          // Create the temporary index
          await esClient.indices.create({
            index: tempIndex,
            mappings: {
              properties: {
                text: { type: 'text' },
              },
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          });

          // Index items using bulk helper
          const bulkResult = await esClient.helpers.bulk({
            datasource: itemsWithText,
            index: tempIndex,
            onDocument: (doc) => {
              const { _id, ...source } = doc as typeof doc & { _id: string };
              return [{ index: { _id } }, source];
            },
            refresh: 'wait_for',
          });

          if (bulkResult.failed > 0) {
            logger.warn(`Failed to index ${bulkResult.failed} items for reranking`);
          }

          // Build ES|QL query with RERANK
          // Escape single quotes in query for ES|QL (use single quotes for string literals)
          const escapedQuery = query.replace(/'/g, "''");
          const rerankWithClause = rerankInferenceId
            ? `WITH '{"inference_id": "${rerankInferenceId}"}'`
            : '';

          const esqlQuery = `FROM ${tempIndex} | RERANK _rerank_score = '${escapedQuery}' ON text ${rerankWithClause} | SORT _rerank_score DESC | LIMIT ${limit}`;

          logger.debug(`Executing ES|QL RERANK query: ${esqlQuery}`);

          // Execute ES|QL query with RERANK using platform.core.execute_esql tool
          const esqlResult = await runner.runTool({
            toolId: platformCoreTools.executeEsql,
            toolParams: {
              query: esqlQuery,
            },
          });

          // Extract tabular data from tool result
          const tabularResult = esqlResult.results.find(
            (r) => r.type === ToolResultType.tabularData
          );
          if (!tabularResult || !tabularResult.data) {
            throw new Error('ES|QL query did not return tabular data');
          }

          const { columns, values } = tabularResult.data as {
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          };

          // Find column indices
          const scoreColIndex = columns.findIndex((col) => col.name === '_rerank_score');
          const idColIndex = columns.findIndex((col) => col.name === '_id');

          // Map ES|QL results back to original item format
          const prioritized = values.map((row) => {
            const rowObj: Record<string, unknown> = {};

            // Reconstruct the original item by finding it by _id
            const itemId = idColIndex >= 0 ? String(row[idColIndex]) : null;
            const originalItem = itemId ? itemsWithText.find((item) => item._id === itemId) : null;

            if (originalItem) {
              // Start with original item, but remove internal fields
              const { _id, text: _text, ...rest } = originalItem;
              Object.assign(rowObj, rest);
            }

            // Add all columns from ES|QL response (except internal ones)
            columns.forEach((col, idx) => {
              if (col.name !== '_id' && col.name !== 'text') {
                rowObj[col.name] = row[idx];
              }
            });

            // Add relevance score
            if (scoreColIndex >= 0) {
              rowObj.relevance_score = row[scoreColIndex];
            }

            return rowObj;
          });

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  prioritized_items: prioritized,
                  total: prioritized.length,
                  query,
                  inference_id_used: rerankInferenceId || 'default',
                },
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error executing ES|QL RERANK: ${errorMessage}`);

          // Fallback to simple text similarity if ES|QL RERANK fails
          logger.warn('Falling back to text similarity scoring');

          const scoredItems = itemsWithText.map((item, itemIndex) => {
            const text = (item.text as string) || '';
            const queryLower = query.toLowerCase();
            const textLower = text.toLowerCase();
            let score = 0;
            const queryWords = queryLower.split(/\s+/);
            for (const word of queryWords) {
              if (textLower.includes(word)) {
                score += 1;
              }
            }
            if (textLower.includes(queryLower)) {
              score += 5;
            }
            const severity = item.severity as string | undefined;
            if (severity === 'critical' || severity === 'high') {
              score += 3;
            }
            const mentions = item.mentions;
            if (mentions && Array.isArray(mentions)) {
              score += mentions.length;
            }

            const { _id, text: _text, ...rest } = item;
            return {
              ...rest,
              _rerank_score: score,
              _original_index: itemIndex,
            };
          });

          const prioritized = scoredItems
            .sort((a, b) => (b._rerank_score as number) - (a._rerank_score as number))
            .slice(0, limit)
            .map((item) => {
              const { _rerank_score, _original_index, ...rest } = item;
              return {
                ...rest,
                relevance_score: _rerank_score,
              };
            });

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  prioritized_items: prioritized,
                  total: prioritized.length,
                  query,
                  inference_id_used: rerankInferenceId || 'fallback',
                  note: 'ES|QL RERANK failed, using text similarity fallback',
                },
              },
            ],
          };
        } finally {
          // Clean up temporary index
          if (tempIndex) {
            try {
              await esClient.indices.delete({ index: tempIndex }, { ignore: [404] });
              logger.debug(`Cleaned up temporary index: ${tempIndex}`);
            } catch (cleanupError) {
              logger.warn(`Failed to delete temporary index ${tempIndex}: ${cleanupError}`);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in rerank tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error reranking items: ${errorMessage}`)],
        };
      }
    },
    tags: ['prioritization', 'rerank', 'relevance'],
  };
};
