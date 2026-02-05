/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

const executeEsqlToolSchema = z.object({
  query: z.string().describe('The ES|QL query to execute'),
});

export const executeEsqlTool = (): BuiltinToolDefinition<typeof executeEsqlToolSchema> => {
  return {
    id: platformCoreTools.executeEsql,
    type: ToolType.builtin,
    description: `Execute an ES|QL query and return the results in a tabular format.

**IMPORTANT**: This tool only **runs** queries; it does not write them.
Think of this as the final step after a query has been prepared.

You **must** get the query from one of two sources before calling this tool:
1.  The output of the \`${platformCoreTools.generateEsql}\` tool (if the tool is available).
2.  A verbatim query provided directly by the user.

Under no circumstances should you invent, guess, or modify a query yourself for this tool.
If you need a query, use the \`${platformCoreTools.generateEsql}\` tool first.`,
    schema: executeEsqlToolSchema,
    handler: async ({ query: esqlQuery }, { esClient }) => {
      const result = await executeEsql({ query: esqlQuery, esClient: esClient.asCurrentUser });

      return {
        results: [
          {
            type: ToolResultType.query,
            data: {
              esql: esqlQuery,
            },
          },
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.esqlResults,
            data: {
              source: 'esql',
              query: esqlQuery,
              columns: result.columns,
              values: result.values,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
