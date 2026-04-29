/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlToolsOptions } from './types';

const CONTENT_PREVIEW_LENGTH = 200;

const smlSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(512)
    .describe(
      'Natural-language search string. Matched via hybrid search (lexical on titles + semantic on content with ELSER embeddings, fused via RRF). ' +
        'Pass "*" to return all available assets.'
    ),
  size: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of results to return (defaults to 10)'),
  type: z
    .string()
    .optional()
    .describe(
      'Filter results to a specific SML type (e.g. "conversation", "visualization", "dashboard", "workflow")'
    ),
  item_id: z
    .string()
    .optional()
    .describe('Filter to chunks of a specific item (origin_id). Use to browse all chunks of one asset.'),
  around_id: z
    .string()
    .optional()
    .describe(
      'Return chunks chronologically around this chunk_id (size/2 before + size/2 after, same item). ' +
        'Useful for browsing conversation turns around a specific result. The query parameter is ignored when around_id is set.'
    ),
  min_score: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum relevance score threshold (0–1). Results with score below this value are excluded.'),
});

/**
 * Creates the sml_search tool.
 * Searches the Semantic Metadata Layer for items matching a query.
 */
export const createSmlSearchTool = ({
  getSmlService,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlSearchSchema> => ({
  id: platformCoreTools.smlSearch,
  type: ToolType.builtin,
  description:
    'Search the Semantic Metadata Layer (SML) for Kibana assets such as saved visualizations, dashboards, workflows, conversations, and more. ' +
    'Uses hybrid search (lexical title matching + semantic content search with ELSER, fused via RRF) for high-quality results. ' +
    'Pass "*" to return all available assets. ' +
    'Each result includes chunk_id, item_id, type, title, a content preview (200 chars), has_more flag, created_at, score, and attachable (boolean). ' +
    'Only items with attachable=true can be passed to sml_attach. ' +
    'Use around_id to browse conversation turns chronologically around a specific chunk.',
  schema: smlSearchSchema,
  tags: ['sml', 'search'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'SML features require experimental features to be enabled',
          };
    },
  },
  handler: async ({ query, size, type, item_id: itemId, around_id: aroundId, min_score: minScore }, context) => {
    const smlService = getSmlService();
    const { spaceId, esClient, request } = context;

    let searchResult;
    try {
      searchResult = await smlService.search({
        query,
        size,
        spaceId,
        esClient: esClient.asCurrentUser,
        request,
        type,
        itemId,
        aroundId,
      });
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `SML search failed: ${(error as Error).message}`,
            metadata: { query },
          }),
        ],
      };
    }

    if (minScore != null) {
      searchResult = {
        ...searchResult,
        results: searchResult.results.filter((r) => r.score >= minScore),
      };
    }

    if (searchResult.results.length === 0) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              message: 'No results found in the Semantic Metadata Layer.',
              query,
              total: 0,
              items: [],
            },
          },
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            total: searchResult.total,
            items: searchResult.results.map((hit) => {
              const fullContent = hit.content ?? '';
              return {
                chunk_id: hit.id,
                item_id: hit.origin_id,
                attachment_id: hit.origin_id,
                attachment_type: hit.type,
                type: hit.type,
                title: hit.title,
                content: fullContent.substring(0, CONTENT_PREVIEW_LENGTH),
                has_more: fullContent.length > CONTENT_PREVIEW_LENGTH,
                created_at: hit.created_at,
                score: hit.score,
                attachable: hit.attachable,
              };
            }),
          },
        },
      ],
    };
  },
});
