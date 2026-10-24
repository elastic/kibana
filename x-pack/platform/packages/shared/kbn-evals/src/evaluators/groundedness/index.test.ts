/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorParams, TaskOutput } from '../../types';
import { createQuantitativeGroundednessEvaluator } from '.';
import type { GroundednessAnalysis } from './types';

describe('createQuantitativeGroundednessEvaluator', () => {
  const evaluator = createQuantitativeGroundednessEvaluator();

  const evaluate = (groundednessAnalysis: unknown, metadata?: Record<string, unknown>) =>
    evaluator.evaluate({
      input: {},
      output: { groundednessAnalysis } as unknown as TaskOutput,
      metadata: metadata ?? null,
    } as unknown as EvaluatorParams<any, any>);

  it('marks the cell unavailable instead of scoring 0 when the judge returned no claim analysis', async () => {
    const result = await evaluate({ summary_verdict: 'GROUNDED', analysis: [] });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.explanation).toContain('GROUNDED');
  });

  it('keeps the empty analysis in metadata so the missing claims stay inspectable', async () => {
    const analysis: GroundednessAnalysis = { summary_verdict: 'GROUNDED', analysis: [] };
    const result = await evaluate(analysis);

    expect(result.metadata).toEqual({ groundednessAnalysis: analysis });
  });

  it('still scores a verdict that carries a claim analysis', async () => {
    const result = await evaluate({
      summary_verdict: 'GROUNDED',
      analysis: [
        {
          claim: 'The watchlist contains 2 entities.',
          centrality: 'central',
          centrality_reason: 'It answers the question directly.',
          verdict: 'FULLY_SUPPORTED',
          evidence: undefined,
          explanation: 'Shown in the watchlist tool result.',
        },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('GROUNDED');
  });
});
