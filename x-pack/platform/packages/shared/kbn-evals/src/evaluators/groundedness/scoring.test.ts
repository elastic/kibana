/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';

const buildAnalysis = (
  claims: Array<Pick<GroundednessAnalysis['analysis'][number], 'verdict' | 'centrality'>>
): GroundednessAnalysis => ({
  summary_verdict: 'GROUNDED',
  analysis: claims.map((c) => ({
    claim: 'test claim',
    centrality: c.centrality,
    centrality_reason: '',
    verdict: c.verdict,
    evidence: undefined,
    explanation: '',
  })),
});

describe('calculateGroundednessScore', () => {
  it('returns 0 when analysis is empty', () => {
    expect(calculateGroundednessScore({ summary_verdict: 'GROUNDED', analysis: [] })).toBe(0);
  });

  it('returns 1 when all claims are FULLY_SUPPORTED', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'peripheral' },
    ]);
    expect(calculateGroundednessScore(analysis)).toBe(1);
  });

  it('uses peripheral weight for NOT_FOUND peripheral claim', () => {
    const analysis = buildAnalysis([{ verdict: 'NOT_FOUND', centrality: 'peripheral' }]);
    expect(calculateGroundednessScore(analysis)).toBeCloseTo(0.5);
  });

  it('uses central weight for NOT_FOUND central claim', () => {
    const analysis = buildAnalysis([{ verdict: 'NOT_FOUND', centrality: 'central' }]);
    expect(calculateGroundednessScore(analysis)).toBeCloseTo(0.1);
  });

  it('does not zero the score when LLM returns NOT_FOUND verdict (regression: schema/scoring key mismatch)', () => {
    // Reproduces the bug where the scoring map key was `NOT_IN_GROUND_TRUTH`
    // but the LLM judge schema (./prompt.ts, ./types.ts) emits `NOT_FOUND`.
    // A single peripheral NOT_FOUND alongside supported claims should not collapse
    // the geometric mean to 0.
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_FOUND', centrality: 'peripheral' },
    ]);
    expect(calculateGroundednessScore(analysis)).toBeGreaterThan(0);
  });

  it('returns 0 when a CONTRADICTED central claim is present (geometric mean zero-propagation)', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'CONTRADICTED', centrality: 'central' },
    ]);
    expect(calculateGroundednessScore(analysis)).toBe(0);
  });

  it('applies peripheral weight (0.1) for CONTRADICTED peripheral claim', () => {
    const analysis = buildAnalysis([{ verdict: 'CONTRADICTED', centrality: 'peripheral' }]);
    expect(calculateGroundednessScore(analysis)).toBeCloseTo(0.1);
  });

  it('weights UNGROUNDED_BUT_DISCLOSED less harshly than NOT_FOUND', () => {
    const ungrounded = calculateGroundednessScore(
      buildAnalysis([{ verdict: 'UNGROUNDED_BUT_DISCLOSED', centrality: 'central' }])
    );
    const notFound = calculateGroundednessScore(
      buildAnalysis([{ verdict: 'NOT_FOUND', centrality: 'central' }])
    );
    expect(ungrounded).toBeGreaterThan(notFound);
  });

  it('computes geometric mean across mixed verdicts', () => {
    // PARTIALLY_SUPPORTED central (0.9) * FULLY_SUPPORTED (1.0) -> sqrt(0.9) ≈ 0.9487
    const analysis = buildAnalysis([
      { verdict: 'PARTIALLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
    ]);
    expect(calculateGroundednessScore(analysis)).toBeCloseTo(Math.sqrt(0.9));
  });
});
