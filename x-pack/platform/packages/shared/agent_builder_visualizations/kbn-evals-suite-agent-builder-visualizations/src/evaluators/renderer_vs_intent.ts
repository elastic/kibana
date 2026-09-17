/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';

export const RENDERER_VS_INTENT_EVALUATOR_NAME = 'Renderer vs Intent';

/**
 * CODE evaluator: checks create_visualization's `renderer` against the example's
 * expected renderer. Skips when the example does not declare one (most Lens cases).
 */
export function createRendererVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedRendererExtractor: (expected: TExample['output']) => 'lens' | 'vega' | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedRendererExtractor,
    name = RENDERER_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const expectedRenderer = expectedRendererExtractor(expected);
      if (!expectedRenderer) {
        return {
          score: 1,
          label: 'skipped',
          explanation: 'No expected renderer declared for this example.',
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
          explanation: 'No visualization produced to compare renderer against intent.',
          metadata: { expectedRenderer },
        };
      }

      const details = visualizations.map((visualization, index) => {
        const actualRenderer = visualization.renderer ?? 'lens';
        return {
          index,
          actualRenderer,
          matched: actualRenderer === expectedRenderer,
        };
      });

      const matchedCount = details.filter((detail) => detail.matched).length;
      const score = matchedCount / details.length;

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization(s) used expected renderer (${expectedRenderer}).`
            : `${matchedCount}/${details.length} visualization(s) matched expected renderer (${expectedRenderer}).`,
        metadata: {
          expectedRenderer,
          matchedCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
