/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { generateEsql, GenerateEsqlResponse } from '@kbn/onechat-genai-utils';

const nlToEsqlToolSchema = z.object({
  query: z.string().describe('The query to generate an ES|QL query from.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use the index explorer to find the best index to use.'
    ),
  context: z
    .string()
    .optional()
    .describe('(optional) Additional context that could be useful to generate the ES|QL query'),
});

export const generateEsqlTool = (): BuiltinToolDefinition<
  typeof nlToEsqlToolSchema,
  GenerateEsqlResponse
> => {
  return {
    id: builtinToolIds.generateEsql,
    description: 'Generate an ES|QL query from a natural language query.',
    schema: nlToEsqlToolSchema,
    handler: async ({ query, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      const result = await generateEsql({
        query,
        context,
        index,
        model,
        esClient: esClient.asCurrentUser,
      });
      return {
        result,
      };
    },
    tags: [builtinTags.retrieval],
  };
};
