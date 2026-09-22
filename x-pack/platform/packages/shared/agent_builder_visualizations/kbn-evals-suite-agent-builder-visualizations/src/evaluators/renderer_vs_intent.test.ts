/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import { createRendererVsIntentEvaluator } from './renderer_vs_intent';

const evaluate = async ({
  visualizations,
  expectedRenderer,
}: {
  visualizations: ExtractedVisualization[];
  expectedRenderer?: 'lens' | 'vega';
}) => {
  const evaluator = createRendererVsIntentEvaluator({
    visualizationExtractor: () => visualizations,
    expectedRendererExtractor: (expected) =>
      (expected as { renderer?: 'lens' | 'vega' } | undefined)?.renderer,
  });

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: { renderer: expectedRenderer },
    metadata: {},
  });
};

describe('createRendererVsIntentEvaluator', () => {
  it('scores 1 when the renderer matches intent', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', renderer: 'vega' }],
      expectedRenderer: 'vega',
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('treats omitted renderer as lens', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a' }],
      expectedRenderer: 'lens',
    });

    expect(result.score).toBe(1);
  });

  it('scores 0 on renderer mismatch', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', renderer: 'lens' }],
      expectedRenderer: 'vega',
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
  });

  it('skips when no renderer is expected', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', renderer: 'vega' }],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });
});
