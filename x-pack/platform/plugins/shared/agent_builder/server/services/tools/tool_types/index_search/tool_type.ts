/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type { IndexSearchToolConfig } from '@kbn/agent-builder-common/tools';
import { runSearchTool } from '@kbn/agent-builder-genai-utils';
import type { ToolTypeDefinition } from '../definitions';
import { validateConfig } from './validate_configuration';
import { configurationSchema, configurationUpdateSchema } from './schemas';

const searchSchema = z.object({
  nlQuery: z.string().describe('A natural language query expressing the search request'),
});

type SearchSchemaType = typeof searchSchema;

export const getIndexSearchToolType = (): ToolTypeDefinition<
  ToolType.index_search,
  IndexSearchToolConfig,
  SearchSchemaType
> => {
  return {
    toolType: ToolType.index_search,
    getDynamicProps: (config) => {
      return {
        getHandler: () => {
          return async ({ nlQuery }, { esClient, modelProvider, logger, events }) => {
            const {
              pattern,
              row_limit: rowLimit,
              custom_instructions: customInstructions,
            } = config;
            const results = await runSearchTool({
              nlQuery,
              index: pattern,
              rowLimit,
              customInstructions,
              esClient: esClient.asCurrentUser,
              model: await modelProvider.getDefaultModel(),
              events,
              logger,
            });
            return { results };
          };
        },
        getSchema: () => searchSchema,
        getLlmDescription: (opts) => {
          return getFullDescription({
            description: opts.description,
            pattern: opts.config.pattern,
          });
        },
      };
    },

    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config, context: { esClient } }) => {
      await validateConfig({ config, esClient });
      return config;
    },
    validateForUpdate: async ({ update, current, context: { esClient } }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await validateConfig({ config: mergedConfig, esClient });
      return mergedConfig;
    },
  };
};

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
