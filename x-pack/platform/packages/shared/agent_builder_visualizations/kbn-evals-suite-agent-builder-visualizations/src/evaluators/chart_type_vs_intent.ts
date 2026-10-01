/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';

export const CHART_TYPE_VS_INTENT_EVALUATOR_NAME = 'Chart Type vs Intent';

type ExpectedChartType = string | string[];

const normalizeExpected = (expected: ExpectedChartType | undefined): string[] => {
  if (expected === undefined) {
    return [];
  }
  return (Array.isArray(expected) ? expected : [expected])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

const matchesExpectedChartType = (actual: string | undefined, expected: string[]): boolean => {
  if (!actual) {
    return false;
  }
  return expected.includes(actual.trim().toLowerCase());
};

/**
 * CODE evaluator: checks create_visualization's `chart_type` against the example's
 * expected chart type(s). Skips when the example does not declare an expectation
 * (Vega-only cases often omit Lens chart types).
 */
export function createChartTypeVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedChartTypeExtractor: (expected: TExample['output']) => ExpectedChartType | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedChartTypeExtractor,
    name = CHART_TYPE_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const expectedChartTypes = normalizeExpected(expectedChartTypeExtractor(expected));
      if (expectedChartTypes.length === 0) {
        return {
          score: 1,
          label: 'skipped',
          explanation: 'No expected chart type declared for this example.',
        };
      }

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
          score: 0,
          label: 'no-visualization',
          explanation: 'No visualization produced to compare chart type against intent.',
          metadata: { expectedChartTypes },
        };
      }

      const details = visualizations.map((visualization, index) => {
        const matched = matchesExpectedChartType(visualization.chartType, expectedChartTypes);
        return {
          index,
          actualChartType: visualization.chartType ?? null,
          renderer: visualization.renderer ?? null,
          matched,
        };
      });

      const matchedCount = details.filter((detail) => detail.matched).length;
      const score = matchedCount / details.length;

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${
                details.length
              } visualization(s) used expected chart type (${expectedChartTypes.join(' | ')}).`
            : `${matchedCount}/${
                details.length
              } visualization(s) matched expected chart type (${expectedChartTypes.join(' | ')}).`,
        metadata: {
          expectedChartTypes,
          matchedCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
