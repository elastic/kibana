/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { IndexSearchToolConfig } from '@kbn/onechat-common/tools';
import { runSearchTool } from '@kbn/onechat-genai-utils';
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
            const { pattern } = config;
            const results = await runSearchTool({
              nlQuery,
              index: pattern,
              esClient: esClient.asCurrentUser,
              model: await modelProvider.getDefaultModel(),
              events,
              logger,
            });
            return { results };
          };
        },
        getSchema: () => searchSchema,
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
