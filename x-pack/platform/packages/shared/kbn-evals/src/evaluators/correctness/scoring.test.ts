/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateFactualScore,
  calculateRelevanceScore,
  calculateProceduralFidelityScore,
} from './scoring';
import type { CorrectnessAnalysis } from './types';

type Claim = CorrectnessAnalysis['analysis'][number];

const buildAnalysis = (
  claims: Array<Pick<Claim, 'verdict' | 'centrality'> & Partial<Pick<Claim, 'sequence_match'>>>,
  summary?: Partial<CorrectnessAnalysis['summary']>
): CorrectnessAnalysis => ({
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
    sequence_match: c.sequence_match ?? 'NOT_APPLICABLE',
    justification_snippet: undefined,
    explanation: '',
  })),
});

describe('calculateFactualScore', () => {
  it('returns 0 when analysis is empty', () => {
    expect(calculateFactualScore(buildAnalysis([]))).toBe(0);
  });

  it('returns 1 when all claims are FULLY_SUPPORTED', () => {
    expect(
      calculateFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'peripheral' },
        ])
      )
    ).toBe(1);
  });

  it('tanks to 0 for a contradicted central claim (geometric-mean intent preserved)', () => {
    expect(
      calculateFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'CONTRADICTED', centrality: 'central' },
        ])
      )
    ).toBe(0);
  });

  it('a contradicted central claim still tanks the score even when extra unverifiable claims are present', () => {
    expect(
      calculateFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'CONTRADICTED', centrality: 'central' },
          { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
          { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'peripheral' },
        ])
      )
    ).toBe(0);
  });

  // Core artifact fix: a grounded, accurate answer that is richer than a thin
  // reference must not be crushed by the extra (NOT_IN_GROUND_TRUTH) claims.
  it('does not penalize extra NOT_IN_GROUND_TRUTH claims when verifiable claims are accurate', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    // Only the two FULLY_SUPPORTED claims are scored -> perfect factuality.
    expect(calculateFactualScore(analysis)).toBe(1);
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
    // geometric mean of [1, 1, 0.9] ~= 0.965, NOT the ~0.31 the old product-of-all produced.
    expect(calculateFactualScore(analysis)).toBeCloseTo(Math.pow(0.9, 1 / 3), 5);
  });

  it('falls back to scoring unverifiable claims when no claim can be checked (avoids rewarding an off-reference answer)', () => {
    const analysis = buildAnalysis([
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    // All central NOT_IN_GROUND_TRUTH -> 0.1 each -> geometric mean 0.1 (NOT a perfect 1.0).
    expect(calculateFactualScore(analysis)).toBeCloseTo(0.1, 5);
  });
});

describe('calculateRelevanceScore', () => {
  it('returns 0 for empty analysis', () => {
    expect(calculateRelevanceScore(buildAnalysis([]))).toBe(0);
  });

  it('is the proportion of central claims', () => {
    expect(
      calculateRelevanceScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'peripheral' },
          { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'peripheral' },
        ])
      )
    ).toBe(0.5);
  });
});

describe('calculateProceduralFidelityScore', () => {
  it('returns 1 when sequence is not applicable', () => {
    expect(
      calculateProceduralFidelityScore(
        buildAnalysis([{ verdict: 'FULLY_SUPPORTED', centrality: 'central' }], {
          sequence_accuracy_summary: 'NOT_APPLICABLE',
        })
      )
    ).toBe(1);
  });

  it('is the proportion of central claims whose sequence matches', () => {
    expect(
      calculateProceduralFidelityScore(
        buildAnalysis(
          [
            { verdict: 'FULLY_SUPPORTED', centrality: 'central', sequence_match: 'MATCH' },
            { verdict: 'FULLY_SUPPORTED', centrality: 'central', sequence_match: 'MISMATCH' },
            { verdict: 'FULLY_SUPPORTED', centrality: 'peripheral', sequence_match: 'MATCH' },
          ],
          { sequence_accuracy_summary: 'PARTIAL' }
        )
      )
    ).toBe(0.5);
  });
});
