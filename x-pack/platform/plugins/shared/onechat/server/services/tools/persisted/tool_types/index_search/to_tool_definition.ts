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
  };
}
