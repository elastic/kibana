/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import { generateEsql } from './nl_to_esql';
import { executeEsql, ExecuteEsqlResponse } from './execute_esql';

// smart search
const searchDslSchema = z.object({
  query: z.string().describe('A natural language query expressing the search request'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use the index explorer to find the best index to use.'
    ),
  context: z
    .string()
    .optional()
    .describe('(optional) Additional context that could be useful to perform the search'),
});

export type SearchDslResponse = ExecuteEsqlResponse | { success: false; reason: string };

export const searchDslTool = (): RegisteredTool<typeof searchDslSchema, SearchDslResponse> => {
  return {
    id: OnechatToolIds.searchDsl,
    description: 'Run a DSL search query on one index and return matching documents.',
    schema: searchDslSchema,
    handler: async ({ query, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();

      const generateResponse = await generateEsql({
        query,
        context,
        index,
        model,
        esClient: esClient.asCurrentUser,
      });

      if (generateResponse.queries.length < 1) {
        return { success: false, reason: 'No query was generated' };
      }

      const executeResponse = await executeEsql({
        query: generateResponse.queries[0],
        esClient: esClient.asCurrentUser,
      });

      return executeResponse;
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};
