/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexSearchToolConfig } from '@kbn/onechat-common/tools';
import { ToolType } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools';
import type { ToolPersistedDefinition } from '../../client';
import type { InternalToolDefinition } from '../../../tool_provider';

const searchSchema = z.object({
  nlQuery: z.string().describe('A natural language query expressing the search request'),
});

type SearchSchemaType = typeof searchSchema;

export function toToolDefinition(
  tool: ToolPersistedDefinition<IndexSearchToolConfig>
): InternalToolDefinition<IndexSearchToolConfig, SearchSchemaType> {
  const { id, description, tags, configuration } = tool;
  return {
    id,
    type: ToolType.index_search,
    description,
    tags,
    configuration,
    readonly: false,
    schema: searchSchema,
    handler: async ({ nlQuery }, { esClient, modelProvider, logger, events }) => {
      const { pattern } = configuration;
      const results = await runSearchTool({
        nlQuery,
        index: pattern,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
        events,
        logger,
      });
      return { results };
    },
    llmDescription: (opts) => {
      return getFullDescription({ description: opts.description, pattern: opts.config.pattern });
    },
  };
}

const getFullDescription = ({ pattern, description }: { pattern: string; description: string }) => {
  return `${description}

  ## Tool usage

  This tool is a a powerful search tool for searching and analyzing data within your Elasticsearch cluster.

  It is configured to search against the following index pattern: \`${pattern}\`.

  It supports both full-text relevance searches and structured analytical queries, based on a natural language query.

  Examples of queries:
  - "find documents about serverless architecture"
  - "search for documents mentioning '[some term]' or '[another term]'"
  - "list all documents where the category is 'electronics'"
  - "show me the last 5 documents from that index"
  - "show me the sales over the last year break down by month"
`;
};
