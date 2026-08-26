/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { hasStartEndParams } from '@kbn/esql-utils';
import {
  executeEsql,
  buildTimeRangeParams,
  interpolateEsqlQuery,
} from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { resolveTimeRange } from './screen_context_utils';

/**
 * Elasticsearch caps a request body at 100MB; this is a courtesy bound well under it. It has to be
 * checked against the serialized filter, since `z.record`'s key schema bounds key names only and
 * leaves the value side unbounded.
 */
const MAX_FILTER_LENGTH = 100_000;

const executeEsqlToolSchema = z.object({
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
      '(Optional) Time range for named parameters ?_tstart and ?_tend. Falls back to screen context or last 24 hours. Only applied when the query references ?_tstart / ?_tend; otherwise the query runs without it and a warning is returned.'
    ),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('(Optional) Can be set to limit the number of results to return. Defaults to 100.'),
  filter: z
    .record(z.string().max(MAX_FILTER_LENGTH), z.unknown())
    .refine((filter) => JSON.stringify(filter).length <= MAX_FILTER_LENGTH, {
      message: `Filters must be at most ${MAX_FILTER_LENGTH} characters once serialized for agent input`,
    })
    .optional()
    .describe(
      '(Optional) An Elasticsearch Query DSL object combined with the query using AND, e.g. {"term": {"status": "open"}}. It can only narrow the results, never widen them. This is not a WHERE clause: it is pushed down to the data source, so it removes documents before any ES|QL command sees them, and it is parsed separately from the query text, so it cannot reference ?named parameters.'
    ),
});

export const executeEsqlTool = (): BuiltinToolDefinition<typeof executeEsqlToolSchema> => {
  return {
    id: platformCoreTools.executeEsql,
    type: ToolType.builtin,
    description: `Execute an ES|QL query and return the results in a tabular format.

## Usage

**IMPORTANT**: This tool only **runs** queries; it does not write them.
Think of this as the final step after a query has been prepared.

You **must** get the query from one of two sources before calling this tool:
1.  The output of the \`${platformCoreTools.generateEsql}\` tool (if the tool is available).
2.  A verbatim query provided directly by the user.

Under no circumstances should you invent, guess, or modify a query yourself for this tool.
If you need a query, use the \`${platformCoreTools.generateEsql}\` tool first.

### Using a limit

The \`limit\` parameter can be used to limit the number of results to return. It defaults to 100.
You should avoid using a higher limit value unless explicitly asked by the user or if you know for sure the length of the data will not be a problem.
Note that this option can't be used to increase the number of results if the query already defines a \`LIMIT\` clause - the lowest limit will always prevail.

### Using a filter

The \`filter\` parameter takes an Elasticsearch Query DSL object that is combined with the query using AND, and can only narrow the results.
Use it only when something outside the query itself requires the results to be narrowed; it is not a substitute for writing a \`WHERE\` clause in the query.
It is parsed separately from the query text, so it cannot reference \`?named\` parameters.
Prefer a filter that every targeted index can match: against a wildcard pattern such as \`FROM logs-*\`, a clause naming a field that only some indices have will drop the others from the results.

## API documentation
- ES|QL reference: https://www.elastic.co/docs/reference/query-languages/esql
- Query DSL reference (for the filter parameter): https://www.elastic.co/docs/reference/query-languages/querydsl`,
    annotations: {
      title: 'Execute ES|QL',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: executeEsqlToolSchema,
    handler: async (
      {
        query: esqlQuery,
        params: esqlParams = {},
        time_range: explicitTimeRange,
        limit = 100,
        filter: esqlFilter,
      },
      { esClient, attachments }
    ) => {
      const usesTimeRangeParams = hasStartEndParams(esqlQuery);
      const timeRange = resolveTimeRange(attachments, explicitTimeRange);
      const timeRangeParams = usesTimeRangeParams ? buildTimeRangeParams(timeRange) ?? [] : [];

      const params: Array<Record<string, FieldValue>> = [
        ...Object.entries(esqlParams).map(([key, value]) => {
          return { [key]: value };
        }),
        ...timeRangeParams,
      ];

      const result = await executeEsql({
        query: esqlQuery,
        params,
        esClient: esClient.asCurrentUser,
        limit,
        filter: esqlFilter as QueryDslQueryContainer | undefined,
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
              ...(usesTimeRangeParams ? { time_range: timeRange } : {}),
            },
          },
          // A caller-supplied parameter that has no effect must not fail silently.
          ...(explicitTimeRange && !usesTimeRangeParams
            ? [
                {
                  type: ToolResultType.other as const,
                  data: {
                    warning:
                      'The provided time_range was not applied: the query does not reference the ?_tstart / ?_tend named parameters, so it ran without that time filter. To apply a time range, reference the parameters in the query, e.g. WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend.',
                  },
                },
              ]
            : []),
        ],
      };
    },
    tags: [],
  };
};
