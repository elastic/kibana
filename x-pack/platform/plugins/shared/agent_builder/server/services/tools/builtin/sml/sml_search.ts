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

const smlSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(512)
    .describe(
      'Search string matched against asset titles and types (search-as-you-type / bool_prefix; Elasticsearch analyzes the text). ' +
        'Example: "cpu usage" or "error rate service". Pass "*" to return all available assets.'
    ),
  size: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of results to return (defaults to 10)'),
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
    'Search the Semantic Metadata Layer (SML) for saved visualizations and other Kibana assets. ' +
    'Provide a natural-language query string; titles and types are matched using Elasticsearch text analysis (bool_prefix on search_as_you_type fields). ' +
    'Each result includes a title, content snippet, attachment_id, attachment_type, and chunk_id. ' +
    'To bring a result into the conversation as an attachment, pass its chunk_id, attachment_id, and attachment_type to sml_attach.',
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
  handler: async ({ query, size }, context) => {
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
            items: searchResult.results.map((hit) => ({
              chunk_id: hit.id,
              attachment_id: hit.origin_id,
              attachment_type: hit.type,
              type: hit.type,
              title: hit.title,
              content: hit.content,
              score: hit.score,
            })),
          },
        },
      ],
    };
  },
});
