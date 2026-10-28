/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import {
  executeEsql,
  buildTimeRangeParams,
  interpolateEsqlQuery,
} from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { DynamicSchemaBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { resolveTimeRange } from './screen_context_utils';
import { createIncludeFrozenSchema, getIncludeFrozenByDefault } from './include_frozen_schema';

const createExecuteEsqlToolSchema = memoize((includeFrozenByDefault: boolean) =>
  z.object({
    query: z.string().describe('The ES|QL query to execute'),
    params: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .describe('(Optional) The parameter values to use for the query'),
    time_range: z
      .object({
        from: z
          .string()
          .describe('Start of the time range, e.g. "now-24h" or "2026-01-01T00:00:00Z"'),
        to: z.string().describe('End of the time range, e.g. "now" or "2026-01-31T23:59:59Z"'),
      })
      .optional()
      .describe(
        '(Optional) Time range for named parameters ?_tstart and ?_tend. Falls back to screen context or last 24 hours.'
      ),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe('(Optional) Can be set to limit the number of results to return. Defaults to 100.'),
    include_frozen: createIncludeFrozenSchema(includeFrozenByDefault),
  })
);

type ExecuteEsqlToolSchema = ReturnType<typeof createExecuteEsqlToolSchema>;

const generateEsqlTool = sanitizeToolId(platformCoreTools.generateEsql);

export const executeEsqlTool = (): DynamicSchemaBuiltinToolDefinition<ExecuteEsqlToolSchema> => {
  return {
    id: platformCoreTools.executeEsql,
    type: ToolType.builtin,
    description: `Execute an ES|QL query and return the results in a tabular format.

## Usage

This tool runs an ES|QL query; it does not write one.

### Where the query comes from

By default, when you need a new query, use the \`${generateEsqlTool}\` tool rather than writing it yourself: it inspects the target data and applies ES|QL guidance that is easy to get wrong when writing a query from memory.
Adapting an earlier query to a new question, such as another metric or field, counts as writing a new query: call \`${generateEsqlTool}\` again for each new question.

You can run a query as-is when it comes from:
- the user,
- your instructions or a skill you loaded, such as a query template,
- the result of another tool, or an attachment.

These are default guidelines. If your instructions or a skill you loaded tell you to write ES|QL queries yourself and run them with this tool, do so. Do the same if the \`${generateEsqlTool}\` tool is not available to you.

### Using a limit

The \`limit\` parameter can be used to limit the number of results to return. It defaults to 100.
You should avoid using a higher limit value unless explicitly asked by the user or if you know for sure the length of the data will not be a problem.
Note that this option can't be used to increase the number of results if the query already defines a \`LIMIT\` clause - the lowest limit will always prevail.

### Data tiers

The \`include_frozen\` parameter controls whether indices on the frozen tier are queried; its description states the default.
Querying the frozen tier requires recovering searchable snapshots from object storage and can take several minutes, so expect such queries to be slow or to time out.
If results look incomplete for a time range that reaches far into the past and frozen tier data was excluded, tell the user that frozen tier data was not searched.`,
    getSchema: async (schemaContext) =>
      createExecuteEsqlToolSchema(await getIncludeFrozenByDefault(schemaContext)),
    handler: async (
      {
        query: esqlQuery,
        params: esqlParams = {},
        time_range: explicitTimeRange,
        limit = 100,
        include_frozen: includeFrozen,
      },
      { esClient, attachments }
    ) => {
      const timeRange = resolveTimeRange(attachments, explicitTimeRange);

      const params: Array<Record<string, FieldValue>> = [
        ...Object.entries(esqlParams).map(([key, value]) => {
          return { [key]: value };
        }),
        ...(buildTimeRangeParams(timeRange) ?? []),
      ];

      const result = await executeEsql({
        query: esqlQuery,
        params,
        esClient: esClient.asCurrentUser,
        limit,
        includeFrozen,
      });

      // need the interpolated query to return in the results / to display in the UI
      const interpolatedQuery = params.length
        ? interpolateEsqlQuery(
            esqlQuery,
            params.reduce((acc, curr) => ({ ...acc, ...curr }), {})
          )
        : esqlQuery;

      return {
        results: [
          {
            type: ToolResultType.query,
            data: {
              esql: interpolatedQuery,
            },
          },
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.esqlResults,
            data: {
              source: 'esql',
              query: interpolatedQuery,
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
