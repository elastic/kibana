/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools } from '@kbn/onechat-common';
import { generateEsql } from '@kbn/onechat-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const nlToEsqlToolSchema = z.object({
  query: z.string().describe('A natural language query to generate an ES|QL query from.'),
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

export const generateEsqlTool = (): BuiltinToolDefinition<typeof nlToEsqlToolSchema> => {
  return {
    id: platformCoreTools.generateEsql,
    description: 'Generate an ES|QL query from a natural language query.',
    schema: nlToEsqlToolSchema,
    handler: async ({ query: nlQuery, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      const esqlResponse = await generateEsql({
        nlQuery,
        context,
        index,
        model,
        esClient: esClient.asCurrentUser,
      });

      const toolResults: ToolResult[] = esqlResponse.queries.map((esqlQuery) => ({
        type: ToolResultType.query,
        data: {
          esql: esqlQuery,
        },
      }));

      if (esqlResponse.answer) {
        toolResults.push({
          type: ToolResultType.other,
          data: {
            answer: esqlResponse.answer,
            nlQuery,
            context,
            index,
          },
        });
      }

      return {
        results: toolResults,
      };
    },
    tags: [],
  };
};
