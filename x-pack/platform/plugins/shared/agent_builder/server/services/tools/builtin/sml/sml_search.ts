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
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SmlToolsOptions } from './types';

const smlSearchSchema = z.object({
  keywords: z
    .array(z.string().max(500))
    .min(1)
    .max(50)
    .describe(
      'An array of keywords to search for in asset titles and content (matched with OR logic). ' +
        'Use specific, descriptive terms (e.g. ["cpu", "usage", "host"] or ["error", "rate", "service"]). ' +
        'Pass ["*"] to return all available assets.'
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
    'Provide an array of keywords that are matched against asset titles, descriptions, chart types, and ES|QL queries using OR logic. ' +
    'Each result includes a title, content snippet, attachment_id, attachment_type, and chunk_id. ' +
    'To bring a result into the conversation as an attachment, pass its chunk_id, attachment_id, and attachment_type to sml_attach.',
  schema: smlSearchSchema,
  tags: ['sml', 'search'],
  handler: async ({ keywords, size }, context) => {
    const smlService = getSmlService();
    const { spaceId, esClient, request } = context;

    const searchResult = await smlService.search({
      keywords,
      size,
      spaceId,
      esClient: esClient.asCurrentUser,
      request,
    });

    if (searchResult.results.length === 0) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              message: 'No results found in the Semantic Metadata Layer.',
              keywords,
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
              attachment_id: hit.attachment_reference_id,
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
