/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import { createVisualizationRefusalEvaluator } from './visualization_refusal';

const evaluate = ({
  visualizations,
  messages,
  prompts = [],
  refusal,
}: {
  visualizations: ExtractedVisualization[];
  messages: string[];
  prompts?: unknown[];
  refusal?: { reason: 'missing_index' | 'ambiguous' };
}) =>
  createVisualizationRefusalEvaluator({
    visualizationExtractor: () => visualizations,
    messagesExtractor: () => messages,
    promptsExtractor: () => prompts,
    expectedRefusalExtractor: () => refusal,
  }).evaluate({
    input: { question: 'q' },
    output: { errors: [], messages: [] },
    expected: {},
    metadata: {},
  });

describe('createVisualizationRefusalEvaluator', () => {
  it('skips positive examples', async () => {
    const result = await evaluate({ visualizations: [], messages: ['hi'] });
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('scores 1 when the agent refuses with an explanation', async () => {
    const result = await evaluate({
      visualizations: [],
      messages: ['That index does not exist.'],
      refusal: { reason: 'missing_index' },
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe('refused');
  });

  it('scores 1 when the agent declines by asking a clarifying question', async () => {
    const result = await evaluate({
      visualizations: [],
      messages: [''],
      prompts: [{ type: 'ask_user_question' }],
      refusal: { reason: 'ambiguous' },
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe('asked-clarification');
  });

  it('scores 0.5 when the agent refuses silently', async () => {
    const result = await evaluate({
      visualizations: [],
      messages: [''],
      refusal: { reason: 'missing_index' },
    });
    expect(result.score).toBe(0.5);
    expect(result.label).toBe('silent-refusal');
  });

  it('scores 0 when the agent draws a chart anyway', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM missing | STATS c = COUNT(*)', chartType: 'xy' }],
      messages: ['Here is your chart.'],
      refusal: { reason: 'missing_index' },
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('drew-anyway');
  });
});
