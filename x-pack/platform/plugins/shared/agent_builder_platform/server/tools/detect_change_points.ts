/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import {
  executeEsql,
  buildTimeRangeParams,
  interpolateEsqlQuery,
} from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import {
  hasChangePointCommand,
  getChangePointSeriesColumns,
  getChangePointOutputColumnNames,
  getChangePointEntityColumns,
  buildChangePointLineDataQuery,
  appendEntityFiltersToChangePointLineEsql,
} from '@kbn/esql-utils';
import { resolveTimeRange } from './screen_context_utils';

const detectChangePointsSchema = z.object({
  query: z.string().describe('ES|QL query containing a CHANGE_POINT command'),
  time_range: z
    .object({
      from: z
        .string()
        .describe('Start of the time range, e.g. "now-24h" or "2026-01-01T00:00:00Z"'),
      to: z.string().describe('End of the time range, e.g. "now" or "2026-01-31T23:59:59Z"'),
    })
    .optional()
    .describe(
      '(Optional) Time range for ?_tstart / ?_tend named parameters. Falls back to screen context or last 24 hours.'
    ),
  max_charts: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(6)
    .describe(
      '(Optional) Maximum number of per-entity charts to render. Must be between 1 and 10. Defaults to 6.'
    ),
});

export const detectChangePointsTool = (): BuiltinToolDefinition<
  typeof detectChangePointsSchema
> => {
  return {
    id: platformCoreTools.detectChangePoints,
    type: ToolType.builtin,
    description: `Detect change points in a time-series metric and render an annotated line chart for each entity group.

## Usage

Call this tool when the user asks about change points, anomalies, trend shifts, or sudden changes in a metric.

The tool requires an ES|QL query that includes a \`CHANGE_POINT\` command, e.g.:
  \`FROM logs-* | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket BY host\`

The tool will:
1. Execute the CHANGE_POINT query to find significant change points.
2. For each entity group (up to max_charts), build an annotated Lens line chart showing the metric trend with change-point markers.
3. Return one visualization result per entity group.

Do NOT call this tool unless the user explicitly requests change point analysis.`,
    schema: detectChangePointsSchema,
    tags: [],
    handler: async (
      { query, time_range: explicitTimeRange, max_charts: maxCharts = 6 },
      { esClient, logger, attachments }
    ) => {
      // Validate: query must contain a top-level CHANGE_POINT command
      if (!hasChangePointCommand(query)) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'The provided query does not contain a top-level CHANGE_POINT command. ' +
                  'Build a query ending with `CHANGE_POINT <value> ON <time> [BY <entity>]` and try again.',
              },
            },
          ],
        };
      }

      // Extract column names from AST — errors here mean the query is unusable
      const seriesColumns = getChangePointSeriesColumns(query);
      const outputColumns = getChangePointOutputColumnNames(query);

      if (!seriesColumns || !outputColumns) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'Could not derive column names from the CHANGE_POINT query. ' +
                  'Ensure the query follows the pattern: CHANGE_POINT <value> ON <time> [BY <entity>].',
              },
            },
          ],
        };
      }

      const { valueColumn, timeColumn } = seriesColumns;
      const { typeColumn, pvalueColumn } = outputColumns;
      const entityColumns = getChangePointEntityColumns(query);

      const timeRange = resolveTimeRange(attachments, explicitTimeRange);
      const timeRangeParams = buildTimeRangeParams(timeRange) ?? [];

      // Phase 1: Execute the CHANGE_POINT query
      let rows: Array<Record<string, unknown>>;
      try {
        const result = await executeEsql({
          query,
          params: timeRangeParams,
          esClient: esClient.asCurrentUser,
        });

        // Convert columnar result to row objects
        const columns = result.columns.map((c) => c.name);
        rows = result.values.map((row) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } catch (error) {
        logger.error(`detect_change_points: CHANGE_POINT query failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to execute CHANGE_POINT query: ${error.message}`,
              },
            },
          ],
        };
      }

      // Filter to actual change-point rows: the CHANGE_POINT command returns the full time series
      // with type=null and pvalue=null on non-change-point buckets. Only rows with a non-empty
      // type and a defined pvalue represent detected change points.
      const changePointRows = rows.filter((row) => {
        const t = row[typeColumn];
        if (t === null || t === undefined || String(t).length === 0) return false;
        const p = row[pvalueColumn];
        return p !== null && p !== undefined;
      });

      // No change points found — valid analytical outcome, not an error
      if (changePointRows.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: 'No change points detected for this query and time range.',
              },
            },
          ],
        };
      }

      // Phase 2: Build the base line-series query (pipeline before CHANGE_POINT, trailing SORT stripped)
      const lineBaseQuery = buildChangePointLineDataQuery(query);
      if (!lineBaseQuery) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'Could not build a line-series query from the CHANGE_POINT query. ' +
                  'FORK-based queries are not supported.',
              },
            },
          ],
        };
      }

      // Group rows by entity (each unique combination of BY-column values)
      const entityGroups = groupByEntity(changePointRows, entityColumns, maxCharts);

      // Phase 3: Build one Lens visualization per entity group
      const results = entityGroups.map(({ representativeRow, groupRows, entityLabel }) => {
        const entityLineQuery = entityColumns.length
          ? appendEntityFiltersToChangePointLineEsql(
              lineBaseQuery,
              representativeRow,
              entityColumns
            )
          : lineBaseQuery;

        // Resolve named time-range params so Lens receives an executable query string
        const resolvedLineQuery = timeRangeParams.length
          ? interpolateEsqlQuery(
              entityLineQuery,
              timeRangeParams.reduce<Record<string, EsqlToolParamValue | null>>(
                (acc, p) => ({ ...acc, ...p }),
                {}
              )
            )
          : entityLineQuery;

        const lensConfig = {
          type: 'xy',
          title: entityLabel,
          layers: [
            {
              data_source: { type: 'esql' as const, query: resolvedLineQuery },
              type: 'area' as const,
              ignore_global_filters: false,
              sampling: 1,
              x: { column: timeColumn },
              y: [{ column: valueColumn }],
            },
            {
              type: 'annotations' as const,
              ignore_global_filters: false,
              events: groupRows.map((row) => ({
                type: 'point' as const,
                timestamp: String(row[timeColumn]),
                label: `${row[typeColumn]} (p=${row[pvalueColumn]})`,
                text: { visible: true },
              })),
            },
          ],
        };

        return {
          tool_result_id: getToolResultId(),
          type: ToolResultType.visualization,
          data: {
            visualization: lensConfig,
            chart_type: SupportedChartType.XY,
            esql: resolvedLineQuery,
            ...(timeRange && { time_range: timeRange }),
          },
        };
      });

      return { results };
    },
  };
};

/**
 * Groups CHANGE_POINT result rows by unique entity (BY-column combination) and returns
 * at most `maxGroups` groups.
 */
function groupByEntity(
  rows: Array<Record<string, unknown>>,
  entityColumns: readonly string[],
  maxGroups: number
): Array<{
  representativeRow: Record<string, unknown>;
  groupRows: Array<Record<string, unknown>>;
  entityLabel: string;
}> {
  if (entityColumns.length === 0) {
    return [
      {
        representativeRow: rows[0],
        groupRows: rows,
        entityLabel: 'Change Points',
      },
    ];
  }

  const groupMap = new Map<
    string,
    { representativeRow: Record<string, unknown>; groupRows: Array<Record<string, unknown>> }
  >();

  for (const row of rows) {
    const key = entityColumns.map((col) => String(row[col] ?? '')).join('::');
    const existing = groupMap.get(key);
    if (existing) {
      existing.groupRows.push(row);
    } else {
      groupMap.set(key, { representativeRow: row, groupRows: [row] });
    }
  }

  return Array.from(groupMap.entries())
    .slice(0, maxGroups)
    .map(([, { representativeRow, groupRows }]) => {
      const entityLabel = entityColumns
        .map((col) => `${col}: ${representativeRow[col] ?? 'unknown'}`)
        .join(', ');
      return { representativeRow, groupRows, entityLabel };
    });
}
