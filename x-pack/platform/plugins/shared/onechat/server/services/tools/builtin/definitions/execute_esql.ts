/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import { executeEsql } from '@kbn/onechat-genai-utils/tools/steps/execute_esql';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const executeEsqlToolSchema = z.object({
  query: z.string().describe('The ES|QL query to execute'),
});

export const executeEsqlTool = (): BuiltinToolDefinition<typeof executeEsqlToolSchema> => {
  return {
    id: builtinToolIds.executeEsql,
    description: 'Execute an ES|QL query and return the results.',
    schema: executeEsqlToolSchema,
    handler: async ({ query }, { esClient }) => {
      const result = await executeEsql({ query, esClient: esClient.asCurrentUser });

      return {
        results: [
          {
            type: ToolResultType.tabularData,
            data: result,
          },
        ],
      };
    },
    tags: [builtinTags.retrieval],
  };
};
