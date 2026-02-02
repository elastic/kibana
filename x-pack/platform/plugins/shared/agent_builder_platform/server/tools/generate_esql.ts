/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

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
    type: ToolType.builtin,
    description: 'Generate an ES|QL query from a natural language query.',
    schema: nlToEsqlToolSchema,
    handler: async (
      { query: nlQuery, index, context },
      { esClient, modelProvider, logger, events }
    ) => {
      const model = await modelProvider.getDefaultModel();

      const esqlResponse = await generateEsql({
        nlQuery,
        index,
        additionalContext: context,
        model,
        esClient: esClient.asCurrentUser,
        logger,
        events,
      });

      const toolResults: ToolHandlerResult[] = [];

      if (esqlResponse.error) {
        toolResults.push({
          type: ToolResultType.error,
          data: {
            message: esqlResponse.error,
          },
        });
      } else {
        if (esqlResponse.query) {
          toolResults.push({
            type: ToolResultType.query,
            data: {
              esql: esqlResponse.query,
            },
          });
        }
        if (esqlResponse.answer) {
          toolResults.push({
            type: ToolResultType.other,
            data: {
              answer: esqlResponse.answer,
            },
          });
        }
      }

      return {
        results: toolResults,
      };
    },
    tags: [],
  };
};
