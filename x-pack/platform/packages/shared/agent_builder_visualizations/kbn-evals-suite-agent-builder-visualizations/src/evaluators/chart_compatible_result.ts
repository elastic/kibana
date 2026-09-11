/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';
import { substituteEsqlBindParams } from './esql_bind_params';

export const CHART_COMPATIBLE_RESULT_EVALUATOR_NAME = 'Chart Compatible Result';

interface EsqlColumn {
  name: string;
  type: string;
}

const NUMERIC_TYPES = new Set([
  'integer',
  'long',
  'double',
  'float',
  'unsigned_long',
  'number',
  'half_float',
  'scaled_float',
]);

const isNumericColumn = (column: EsqlColumn): boolean =>
  NUMERIC_TYPES.has(column.type.toLowerCase());

const resolveChartType = (
  visualization: ExtractedVisualization,
  expectedChartType: string | undefined
): string | undefined => {
  const candidate = expectedChartType ?? visualization.chartType;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim().toLowerCase()
    : undefined;
};

/**
 * Minimal shape rules: does the executed ES|QL result have enough columns of the
 * right kinds for the selected (or expected) chart type?
 */
export function isChartCompatibleResult(
  chartType: string,
  columns: EsqlColumn[],
  rowCount: number
): { compatible: boolean; reason?: string } {
  if (columns.length === 0) {
    return { compatible: false, reason: 'Query returned no columns' };
  }

  const numericCount = columns.filter(isNumericColumn).length;
  const nonNumericCount = columns.length - numericCount;

  switch (chartType) {
    case SupportedChartType.Metric:
    case SupportedChartType.Gauge:
      if (numericCount < 1) {
        return { compatible: false, reason: `${chartType} needs at least one numeric column` };
      }
      return { compatible: true };

    case SupportedChartType.XY:
      if (columns.length < 2 || numericCount < 1) {
        return {
          compatible: false,
          reason: 'xy needs at least one dimension and one numeric measure',
        };
      }
      return { compatible: true };

    case SupportedChartType.Pie:
    case SupportedChartType.Treemap:
    case SupportedChartType.Waffle:
    case SupportedChartType.Tagcloud:
      if (numericCount < 1 || nonNumericCount < 1) {
        return {
          compatible: false,
          reason: `${chartType} needs a category dimension and a numeric measure`,
        };
      }
      return { compatible: true };

    case SupportedChartType.Heatmap:
    case SupportedChartType.Mosaic: {
      // Heatmap axes are often numeric extracts (e.g. HOUR_OF_DAY → long). Count
      // non-measure columns as dimensions even when ES|QL types them numeric:
      // require ≥3 columns with ≥1 measure, leaving ≥2 columns for the axes.
      if (columns.length < 3 || numericCount < 1) {
        return {
          compatible: false,
          reason: `${chartType} needs at least two axis columns and one numeric measure`,
        };
      }
      return { compatible: true };
    }

    case SupportedChartType.Datatable:
      return { compatible: true };

    case SupportedChartType.RegionMap:
      if (columns.length < 2 || numericCount < 1) {
        return {
          compatible: false,
          reason: 'region_map needs a location/category column and a numeric measure',
        };
      }
      return { compatible: true };

    default:
      if (rowCount < 0) {
        return { compatible: false, reason: 'Invalid row count' };
      }
      return { compatible: true };
  }
}

/**
 * CODE evaluator: executes each visualization's ES|QL and checks the result
 * shape against chart-type compatibility rules (VisEval Validity→Legality).
 */
export function createChartCompatibleResultEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  esClient: ElasticsearchClient;
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedChartTypeExtractor?: (expected: TExample['output']) => string | string[] | undefined;
  name?: string;
  scoreOnEmptyVisualizations?: number;
}): Evaluator<TExample, TTaskOutput> {
  const {
    esClient,
    visualizationExtractor,
    expectedChartTypeExtractor,
    name = CHART_COMPATIBLE_RESULT_EVALUATOR_NAME,
    scoreOnEmptyVisualizations = 0,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let visualizations: ExtractedVisualization[];
      try {
        visualizations = visualizationExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Visualization extractor threw: ${(err as Error).message}`,
        };
      }

      if (visualizations.length === 0) {
        return {
          score: scoreOnEmptyVisualizations,
          label: 'no-visualization',
          explanation: 'No visualization produced to check result compatibility.',
        };
      }

      const expectedChartTypeRaw = expectedChartTypeExtractor?.(expected);
      const expectedChartType = Array.isArray(expectedChartTypeRaw)
        ? expectedChartTypeRaw[0]
        : expectedChartTypeRaw;

      const details = await Promise.all(
        visualizations.map(async (visualization, index) => {
          // Vega is not bound to Lens chart-type shape rules; treat as compatible
          // when the query executes with at least one column.
          if (visualization.renderer === 'vega') {
            try {
              const response = await esClient.esql.query({
                query: substituteEsqlBindParams(visualization.esql),
              });
              const columns = (response.columns ?? []) as EsqlColumn[];
              const rowCount = response.values?.length ?? 0;
              const compatible = columns.length > 0;
              return {
                index,
                chartType: visualization.chartType ?? null,
                renderer: 'vega' as const,
                compatible,
                reason: compatible ? undefined : 'Vega query returned no columns',
                columnCount: columns.length,
                rowCount,
              };
            } catch (err) {
              return {
                index,
                chartType: visualization.chartType ?? null,
                renderer: 'vega' as const,
                compatible: false,
                reason: `ES|QL execution failed: ${(err as Error).message}`,
                columnCount: 0,
                rowCount: 0,
              };
            }
          }

          const chartType = resolveChartType(visualization, expectedChartType);
          if (!chartType) {
            return {
              index,
              chartType: null,
              compatible: false,
              reason: 'No chart type available (actual or expected)',
              columnCount: 0,
              rowCount: 0,
            };
          }

          try {
            const response = await esClient.esql.query({
              query: substituteEsqlBindParams(visualization.esql),
            });
            const columns = (response.columns ?? []) as EsqlColumn[];
            const rowCount = response.values?.length ?? 0;
            const { compatible, reason } = isChartCompatibleResult(chartType, columns, rowCount);
            return {
              index,
              chartType,
              renderer: visualization.renderer ?? 'lens',
              compatible,
              reason,
              columnCount: columns.length,
              rowCount,
              columns: columns.map((column) => ({ name: column.name, type: column.type })),
            };
          } catch (err) {
            return {
              index,
              chartType,
              renderer: visualization.renderer ?? 'lens',
              compatible: false,
              reason: `ES|QL execution failed: ${(err as Error).message}`,
              columnCount: 0,
              rowCount: 0,
            };
          }
        })
      );

      const compatibleCount = details.filter((detail) => detail.compatible).length;
      const score = compatibleCount / details.length;

      return {
        score,
        label: score === 1 ? 'compatible' : score === 0 ? 'incompatible' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization result(s) fit the chart type.`
            : `${compatibleCount}/${details.length} visualization result(s) fit the chart type.`,
        metadata: {
          compatibleCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
