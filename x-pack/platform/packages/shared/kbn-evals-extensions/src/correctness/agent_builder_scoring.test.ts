/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrectnessAnalysis } from '@kbn/evals';
import {
  calculateAgentBuilderFactualScore,
  createAgentBuilderCorrectnessEvaluators,
} from './agent_builder_scoring';

const buildAnalysis = (
  claims: Array<{ verdict: string; centrality: 'central' | 'peripheral' }>,
  summary?: Partial<CorrectnessAnalysis['summary']>
): CorrectnessAnalysis =>
  ({
    summary: {
      factual_accuracy_summary: 'ACCURATE',
      relevance_summary: 'RELEVANT',
      sequence_accuracy_summary: 'NOT_APPLICABLE',
      ...summary,
    },
    analysis: claims.map((c) => ({
      claim: 'test claim',
      centrality: c.centrality,
      centrality_reason: '',
      verdict: c.verdict,
      sequence_match: 'NOT_APPLICABLE',
      justification_snippet: undefined,
      explanation: '',
    })),
  } as unknown as CorrectnessAnalysis);

describe('calculateAgentBuilderFactualScore', () => {
  it('returns 0 for empty analysis', () => {
    expect(calculateAgentBuilderFactualScore(buildAnalysis([]))).toBe(0);
  });

  it('returns 1 when all claims are FULLY_SUPPORTED', () => {
    expect(
      calculateAgentBuilderFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'peripheral' },
        ])
      )
    ).toBe(1);
  });

  it('tanks to 0 for a contradicted central claim (geometric-mean intent preserved)', () => {
    expect(
      calculateAgentBuilderFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'CONTRADICTED', centrality: 'central' },
        ])
      )
    ).toBe(0);
  });

  it('does not penalize extra NOT_IN_GROUND_TRUTH claims when verifiable claims are accurate', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    // Only the two FULLY_SUPPORTED claims are scored -> perfect factuality.
    expect(calculateAgentBuilderFactualScore(analysis)).toBe(1);
  });

  it('reflects verifiable-claim accuracy without dilution from extra claims', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'PARTIALLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    // Geometric mean of [1, 1, 0.9] ~= 0.965, NOT the ~0.31 the old
    // product-over-all-claims scorer produced.
    expect(calculateAgentBuilderFactualScore(analysis)).toBeCloseTo(Math.pow(0.9, 1 / 3), 5);
  });

  it('falls back to scoring unverifiable claims when no claim can be checked (avoids rewarding an off-reference answer)', () => {
    const analysis = buildAnalysis([
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    expect(calculateAgentBuilderFactualScore(analysis)).toBeCloseTo(0.1, 5);
  });
});

describe('createAgentBuilderCorrectnessEvaluators', () => {
  it('produces the same evaluator names as the shared correctness set', () => {
    const names = createAgentBuilderCorrectnessEvaluators().map((e) => e.name);
    expect(names).toEqual(['Factuality', 'Relevance', 'Sequence Accuracy']);
  });

  it('scores Factuality with the NOT_IN_GROUND_TRUTH-excluded scorer', async () => {
    const factuality = createAgentBuilderCorrectnessEvaluators().find(
      (e) => e.name === 'Factuality'
    );
    expect(factuality).toBeDefined();

    const correctnessAnalysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);

    const result = await factuality!.evaluate({
      input: {},
      expected: {},
      output: { correctnessAnalysis },
      metadata: {},
    } as any);

    // With the shared scorer this would be ~0.46; the agent-builder scorer
    // excludes the unverifiable claim and returns a perfect score.
    expect(result.score).toBe(1);
  });

  it('returns an unavailable label when no correctness analysis is attached', async () => {
    const factuality = createAgentBuilderCorrectnessEvaluators().find(
      (e) => e.name === 'Factuality'
    );

    const result = await factuality!.evaluate({
      input: {},
      expected: {},
      output: {},
      metadata: {},
    } as any);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });
});
