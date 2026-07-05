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

const claim = (overrides: Partial<Claim>): Claim => ({
  claim: 'c',
  centrality: 'central',
  centrality_reason: '',
  verdict: 'FULLY_SUPPORTED',
  sequence_match: 'NOT_APPLICABLE',
  justification_snippet: undefined,
  explanation: '',
  ...overrides,
});

const analysisOf = (claims: Array<Partial<Claim>>): CorrectnessAnalysis => ({
  summary: {
    factual_accuracy_summary: 'ACCURATE',
    relevance_summary: 'RELEVANT',
    sequence_accuracy_summary: 'NOT_APPLICABLE',
  },
  analysis: claims.map(claim),
});

describe('calculateFactualScore', () => {
  it('returns 0 for empty / missing analysis', () => {
    expect(calculateFactualScore(analysisOf([]))).toBe(0);
    expect(calculateFactualScore({ ...analysisOf([]), analysis: [] })).toBe(0);
  });

  it('returns 1.0 when every claim is fully supported', () => {
    expect(
      calculateFactualScore(
        analysisOf([{ verdict: 'FULLY_SUPPORTED' }, { verdict: 'FULLY_SUPPORTED' }])
      )
    ).toBeCloseTo(1.0, 5);
  });

  it('keeps CONTRADICTED central as a hard fail (single wrong claim collapses to 0)', () => {
    // This is the property we must NOT regress: a verified-wrong central claim
    // still zeroes the geometric mean regardless of the other claims.
    expect(
      calculateFactualScore(
        analysisOf([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'CONTRADICTED', centrality: 'central' },
        ])
      )
    ).toBe(0);
  });

  it('does NOT near-zero a grounded answer whose central claims are merely absent from a thin reference', () => {
    // The artifact fix: NOT_IN_GROUND_TRUTH central was 0.1 (→ geometric mean ~0.1
    // = "MAJOR_INACCURACIES"); it is now 0.8 so an unverifiable-but-not-contradicted
    // answer is not treated as a factual error.
    const score = calculateFactualScore(
      analysisOf([
        { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
        { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
        { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      ])
    );
    expect(score).toBeCloseTo(0.8, 5);
    expect(score).toBeGreaterThan(0.5);
  });

  it('scores a mostly-supported answer with one extra grounded central claim highly', () => {
    const score = calculateFactualScore(
      analysisOf([
        { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
        { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
        { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      ])
    );
    expect(score).toBeGreaterThan(0.9);
  });
});

describe('calculateRelevanceScore', () => {
  it('is the proportion of central claims', () => {
    expect(
      calculateRelevanceScore(analysisOf([{ centrality: 'central' }, { centrality: 'peripheral' }]))
    ).toBeCloseTo(0.5, 5);
  });
});

describe('calculateProceduralFidelityScore', () => {
  it('is 1.0 when sequence is not applicable', () => {
    const a = analysisOf([{ centrality: 'central', sequence_match: 'MATCH' }]);
    a.summary.sequence_accuracy_summary = 'NOT_APPLICABLE';
    expect(calculateProceduralFidelityScore(a)).toBe(1.0);
  });

  it('is the fraction of central claims in the correct sequence', () => {
    const a = analysisOf([
      { centrality: 'central', sequence_match: 'MATCH' },
      { centrality: 'central', sequence_match: 'MISMATCH' },
    ]);
    a.summary.sequence_accuracy_summary = 'MISMATCH';
    expect(calculateProceduralFidelityScore(a)).toBeCloseTo(0.5, 5);
  });
});
