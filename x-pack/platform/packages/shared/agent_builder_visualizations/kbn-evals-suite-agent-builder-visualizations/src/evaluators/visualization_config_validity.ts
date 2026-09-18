/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import {
  datatableConfigSchemaESQL,
  gaugeConfigSchemaESQL,
  heatmapConfigSchemaESQL,
  metricConfigSchemaESQL,
  mosaicConfigSchemaESQL,
  pieConfigSchemaESQL,
  regionMapConfigSchemaESQL,
  tagcloudConfigSchemaESQL,
  treemapConfigSchemaESQL,
  waffleConfigSchemaESQL,
  xyConfigSchemaESQL,
} from '@kbn/lens-embeddable-utils';
import type { z } from '@kbn/zod';
import type { ExtractedVisualization } from '../extract_visualization';

export const VISUALIZATION_CONFIG_VALIDITY_EVALUATOR_NAME = 'Visualization Config Validity';

const lensSchemaByChartType: Record<SupportedChartType, z.ZodType> = {
  [SupportedChartType.Metric]: metricConfigSchemaESQL,
  [SupportedChartType.Gauge]: gaugeConfigSchemaESQL,
  [SupportedChartType.Tagcloud]: tagcloudConfigSchemaESQL,
  [SupportedChartType.XY]: xyConfigSchemaESQL,
  [SupportedChartType.RegionMap]: regionMapConfigSchemaESQL,
  [SupportedChartType.Heatmap]: heatmapConfigSchemaESQL,
  [SupportedChartType.Datatable]: datatableConfigSchemaESQL,
  [SupportedChartType.Pie]: pieConfigSchemaESQL,
  [SupportedChartType.Treemap]: treemapConfigSchemaESQL,
  [SupportedChartType.Waffle]: waffleConfigSchemaESQL,
  [SupportedChartType.Mosaic]: mosaicConfigSchemaESQL,
};

const isSupportedChartType = (value: string): value is SupportedChartType =>
  Object.values(SupportedChartType).includes(value as SupportedChartType);

const validateVegaSpec = (
  visualization: ExtractedVisualization['visualization']
): { valid: boolean; error?: string } => {
  const spec = visualization?.spec;
  if (typeof spec !== 'string' || spec.trim().length === 0) {
    return { valid: false, error: 'Vega visualization is missing a non-empty spec string' };
  }

  try {
    const parsed = JSON.parse(spec) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Vega spec must parse to a JSON object' };
    }

    const record = parsed as Record<string, unknown>;
    const hasVisualRoot =
      'mark' in record ||
      'layer' in record ||
      'hconcat' in record ||
      'vconcat' in record ||
      'concat' in record ||
      'facet' in record ||
      'repeat' in record;

    if (!hasVisualRoot) {
      return {
        valid: false,
        error: 'Vega-Lite spec is missing a visual root (mark/layer/concat/facet/repeat)',
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Vega spec is not valid JSON: ${(err as Error).message}`,
    };
  }
};

const validateLensConfig = (
  visualization: ExtractedVisualization
): { valid: boolean; error?: string } => {
  const chartType = visualization.chartType;
  if (!chartType || !isSupportedChartType(chartType)) {
    return {
      valid: false,
      error: `Lens visualization is missing a supported chart_type (got ${
        chartType ?? 'undefined'
      })`,
    };
  }

  if (!visualization.visualization || typeof visualization.visualization !== 'object') {
    return { valid: false, error: 'Lens visualization payload is missing' };
  }

  const parsed = lensSchemaByChartType[chartType].safeParse(visualization.visualization);
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    };
  }

  return { valid: true };
};

const validateVisualizationConfig = (
  visualization: ExtractedVisualization
): { valid: boolean; error?: string; renderer: string } => {
  const renderer = visualization.renderer ?? 'lens';
  if (renderer === 'vega') {
    return { ...validateVegaSpec(visualization.visualization), renderer };
  }
  return { ...validateLensConfig(visualization), renderer };
};

/**
 * CODE evaluator: validates the returned Lens config against the chart-type ESQL
 * schema, or checks that a Vega-Lite spec parses and has a visual root.
 */
export function createVisualizationConfigValidityEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  name?: string;
  scoreOnEmptyVisualizations?: number;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    name = VISUALIZATION_CONFIG_VALIDITY_EVALUATOR_NAME,
    scoreOnEmptyVisualizations = 0,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }): Promise<EvaluationResult> => {
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
          explanation: 'No visualization produced to validate config.',
        };
      }

      const details = visualizations.map((visualization, index) => {
        const result = validateVisualizationConfig(visualization);
        return {
          index,
          renderer: result.renderer,
          chartType: visualization.chartType ?? null,
          valid: result.valid,
          error: result.error,
        };
      });

      const validCount = details.filter((detail) => detail.valid).length;
      const score = validCount / details.length;

      return {
        score,
        label: score === 1 ? 'valid' : score === 0 ? 'invalid' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization config(s) are valid.`
            : `${validCount}/${details.length} visualization config(s) are valid.`,
        metadata: {
          validCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
