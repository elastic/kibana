/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { executeEsql, buildTimeRangeParams } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { resolveTimeRange } from './screen_context_utils';

const executeEsqlToolSchema = z.object({
  query: z.string().describe('The ES|QL query to execute'),
  time_range: z
    .object({
      from: z
        .string()
        .describe('Start of the time range, e.g. "now-24h" or "2026-01-01T00:00:00Z"'),
      to: z.string().describe('End of the time range, e.g. "now" or "2026-01-31T23:59:59Z"'),
    })
    .optional()
    .describe(
      '(optional) Time range for named parameters ?_tstart and ?_tend. Falls back to screen context or last 24 hours.'
    ),
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
    handler: async (
      { query: esqlQuery, time_range: explicitTimeRange },
      { esClient, attachments }
    ) => {
      const timeRange = resolveTimeRange(attachments, explicitTimeRange);

      const result = await executeEsql({
        query: esqlQuery,
        params: buildTimeRangeParams(timeRange),
        esClient: esClient.asCurrentUser,
      });

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
              time_range: timeRange,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
