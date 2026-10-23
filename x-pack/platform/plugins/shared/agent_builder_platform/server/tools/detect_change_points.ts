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
  hasStartEndParams,
  getChangePointSeriesColumns,
  getChangePointOutputColumnNames,
  getChangePointByColumns,
  buildChangePointLineDataQuery,
  appendEntityFiltersToChangePointLineEsql,
} from '@kbn/esql-utils';
import { resolveTimeRange } from './screen_context_utils';

const VISUALIZATION_ATTACHMENT_TYPE = 'visualization';
const EXAMPLE_CHANGE_POINT_QUERY =
  'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket BY host';
const TIME_RANGE_NOT_APPLIED_MESSAGE =
  'The provided time_range was not applied: the query does not reference the ?_tstart / ?_tend named parameters, so it ran without that time filter. To apply a time range, add WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend.';

const detectChangePointsSchema = z.object({
  query: z
    .string()
    .max(4096)
    .describe('ES|QL query containing a CHANGE_POINT command and ?_tstart / ?_tend'),
  time_range: z
    .object({
      from: z
        .string()
        .max(128)
        .describe('Start of the time range, e.g. "now-24h" or "2026-01-01T00:00:00Z"'),
      to: z
        .string()
        .max(128)
        .describe('End of the time range, e.g. "now" or "2026-01-31T23:59:59Z"'),
    })
    .optional()
    .describe(
      '(Optional) Values for ?_tstart / ?_tend. Applied only when the query references those parameters. Falls back to screen context or last 24 hours.'
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
  save_charts: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      '(Optional) When true, each entity chart is persisted as a visualization attachment so it can be added to a dashboard. ' +
        'Set to true ONLY when the user explicitly asks to save the charts or add them to a dashboard. Defaults to false.'
    ),
});

export const detectChangePointsTool = (): BuiltinToolDefinition<
  typeof detectChangePointsSchema
> => {
  return {
    id: platformCoreTools.detectChangePoints,
    type: ToolType.builtin,
    description: `Detect change points in a time-series metric and render an annotated area chart for each entity group.

## Usage

Call this tool only when the user explicitly requests change point analysis or asks to detect sudden shifts or abrupt trend breaks in a metric.

The tool requires an ES|QL query that includes a \`CHANGE_POINT\` command and \`?_tstart\` / \`?_tend\`, e.g.:
  \`${EXAMPLE_CHANGE_POINT_QUERY}\`

The tool will:
1. Execute the CHANGE_POINT query to find significant change points.
2. For each entity group (up to max_charts), build an annotated Lens area chart showing the metric trend with change-point markers.
3. Return one visualization result per entity group. If save_charts is true, each chart is also persisted as a visualization attachment (attachment_id included in the result) that can be added to a dashboard.

Set save_charts = true ONLY when the user explicitly asks to save charts or add them to a dashboard.

Do NOT call this tool unless the user explicitly requests change point analysis.`,
    annotations: {
      title: 'Detect Change Points',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: detectChangePointsSchema,
    tags: [],
    excludeFromMcp: true,
    handler: async (
      {
        query,
        time_range: explicitTimeRange,
        max_charts: maxCharts = 6,
        save_charts: saveCharts = false,
      },
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
      const entityColumns = getChangePointByColumns(query) ?? [];

      const usesTimeRangeParams = hasStartEndParams(query);
      const timeRange = resolveTimeRange(attachments, explicitTimeRange);
      const timeRangeParams = usesTimeRangeParams ? buildTimeRangeParams(timeRange) ?? [] : [];
      const appliedTimeRange = usesTimeRangeParams ? { time_range: timeRange } : {};
      const timeRangeNotApplied =
        explicitTimeRange && !usesTimeRangeParams
          ? [{ type: ToolResultType.other, data: { message: TIME_RANGE_NOT_APPLIED_MESSAGE } }]
          : [];

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
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`detect_change_points: CHANGE_POINT query failed: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to execute CHANGE_POINT query: ${message}`,
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
                message: usesTimeRangeParams
                  ? 'No change points detected for this query and time range.'
                  : 'No change points detected for this query.',
              },
            },
            ...timeRangeNotApplied,
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
      const { groups: entityGroups, totalGroupCount } = groupByEntity(
        changePointRows,
        entityColumns,
        maxCharts
      );

      // Phase 3: Build one Lens visualization per entity group
      const unsavedEntityLabels: string[] = [];
      const results = await Promise.all(
        entityGroups.map(async ({ representativeRow, groupRows, entityLabel }) => {
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
                events: groupRows.map((row) => {
                  const rawTs = row[timeColumn];
                  const timestamp =
                    typeof rawTs === 'number' ? new Date(rawTs).toISOString() : String(rawTs);
                  return {
                    type: 'point' as const,
                    timestamp,
                    label: `${row[typeColumn]} (p=${row[pvalueColumn]})`,
                    text: { visible: true },
                  };
                }),
              },
            ],
          };

          // Persist as a visualization attachment only when the user explicitly requested it.
          // Each saved attachment becomes part of conversation state, so we avoid creating them
          // during ordinary analysis.
          let attachmentId: string | undefined;
          if (saveCharts) {
            try {
              const att = await attachments.add({
                type: VISUALIZATION_ATTACHMENT_TYPE,
                data: {
                  query: `Change point analysis for ${entityLabel}`,
                  visualization: lensConfig as Record<string, unknown>,
                  chart_type: SupportedChartType.XY,
                  esql: resolvedLineQuery,
                  ...appliedTimeRange,
                },
                description: `Change point: ${entityLabel}`,
              });
              attachmentId = att.id;
            } catch (err) {
              unsavedEntityLabels.push(entityLabel);
              const message = err instanceof Error ? err.message : String(err);
              logger.warn(
                `detect_change_points: could not persist attachment for "${entityLabel}": ${message}`
              );
            }
          }

          return {
            tool_result_id: getToolResultId(),
            type: ToolResultType.visualization,
            data: {
              visualization: lensConfig,
              chart_type: SupportedChartType.XY,
              esql: resolvedLineQuery,
              ...appliedTimeRange,
              ...(attachmentId && { attachment_id: attachmentId }),
            },
          };
        })
      );

      const saveFailureNotice =
        unsavedEntityLabels.length > 0
          ? [
              {
                type: ToolResultType.other,
                data: {
                  message: `Charts were returned but not saved for ${unsavedEntityLabels.join(
                    ', '
                  )}.`,
                },
              },
            ]
          : [];

      if (totalGroupCount <= maxCharts) {
        return { results: [...results, ...saveFailureNotice, ...timeRangeNotApplied] };
      }

      const omitted = totalGroupCount - maxCharts;
      return {
        results: [
          ...results,
          ...saveFailureNotice,
          ...timeRangeNotApplied,
          {
            type: ToolResultType.other,
            data: {
              message:
                `Results are capped at ${maxCharts} entity groups. ` +
                `${omitted} additional ${
                  omitted === 1 ? 'entity was' : 'entities were'
                } omitted. ` +
                `Increase max_charts or narrow the query to see more.`,
            },
          },
        ],
      };
    },
  };
};

/**
 * Groups CHANGE_POINT result rows by unique entity (BY-column combination) and returns
 * at most `maxGroups` groups alongside the total count of distinct groups found.
 */
function groupByEntity(
  rows: Array<Record<string, unknown>>,
  entityColumns: readonly string[],
  maxGroups: number
): {
  groups: Array<{
    representativeRow: Record<string, unknown>;
    groupRows: Array<Record<string, unknown>>;
    entityLabel: string;
  }>;
  totalGroupCount: number;
} {
  if (entityColumns.length === 0) {
    return {
      groups: [
        {
          representativeRow: rows[0],
          groupRows: rows,
          entityLabel: 'Change Points',
        },
      ],
      totalGroupCount: 1,
    };
  }

  const groupMap = new Map<
    string,
    { representativeRow: Record<string, unknown>; groupRows: Array<Record<string, unknown>> }
  >();

  for (const row of rows) {
    const key = JSON.stringify(entityColumns.map((col) => row[col] ?? null));
    const existing = groupMap.get(key);
    if (existing) {
      existing.groupRows.push(row);
    } else {
      groupMap.set(key, { representativeRow: row, groupRows: [row] });
    }
  }

  const totalGroupCount = groupMap.size;
  const groups = Array.from(groupMap.entries())
    .slice(0, maxGroups)
    .map(([, { representativeRow, groupRows }]) => {
      const entityLabel = entityColumns
        .map((col) => `${col}: ${representativeRow[col] ?? 'unknown'}`)
        .join(', ');
      return { representativeRow, groupRows, entityLabel };
    });

  return { groups, totalGroupCount };
}
