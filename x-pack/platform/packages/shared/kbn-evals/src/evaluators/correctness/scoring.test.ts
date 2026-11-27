/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateFactualScore,
  calculateProceduralFidelityScore,
  calculateRelevanceScore,
} from './scoring';
import type { CorrectnessAnalysis } from './types';

const buildAnalysis = (
  analysis: CorrectnessAnalysis['analysis'] | undefined,
  sequenceSummary: CorrectnessAnalysis['summary']['sequence_accuracy_summary'] = 'MATCH'
): CorrectnessAnalysis =>
  ({
    summary: {
      factual_accuracy_summary: 'ACCURATE',
      relevance_summary: 'RELEVANT',
      sequence_accuracy_summary: sequenceSummary,
    },
    analysis,
  } as CorrectnessAnalysis);

const claim = (
  overrides: Partial<CorrectnessAnalysis['analysis'][number]>
): CorrectnessAnalysis['analysis'][number] =>
  ({
    claim: 'c',
    centrality: 'central',
    centrality_reason: '',
    verdict: 'FULLY_SUPPORTED',
    sequence_match: 'MATCH',
    explanation: '',
    ...overrides,
  } as CorrectnessAnalysis['analysis'][number]);

describe('correctness scoring', () => {
  describe('calculateFactualScore', () => {
    it('returns null when the judge output has no analysis array', () => {
      expect(calculateFactualScore(buildAnalysis(undefined))).toBeNull();
      expect(
        calculateFactualScore(buildAnalysis('nope' as unknown as CorrectnessAnalysis['analysis']))
      ).toBeNull();
    });

    it('scores a judged answer with no claims as 0', () => {
      expect(calculateFactualScore(buildAnalysis([]))).toBe(0);
    });

    it('scores supported claims as 1', () => {
      expect(calculateFactualScore(buildAnalysis([claim({})]))).toBe(1);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('returns null when the judge output has no analysis array', () => {
      expect(calculateRelevanceScore(buildAnalysis(undefined))).toBeNull();
    });

    it('scores a judged answer with no claims as 0', () => {
      expect(calculateRelevanceScore(buildAnalysis([]))).toBe(0);
    });

    it('returns the share of central claims', () => {
      expect(
        calculateRelevanceScore(buildAnalysis([claim({}), claim({ centrality: 'peripheral' })]))
      ).toBe(0.5);
    });
  });

  describe('calculateProceduralFidelityScore', () => {
    it('returns null instead of a perfect score when the judge output has no analysis array', () => {
      expect(calculateProceduralFidelityScore(buildAnalysis(undefined))).toBeNull();
    });

    it('keeps 1 when sequence is not applicable, even without an analysis array', () => {
      expect(calculateProceduralFidelityScore(buildAnalysis(undefined, 'NOT_APPLICABLE'))).toBe(1);
    });

    it('keeps 1 when there are no central claims to order', () => {
      expect(
        calculateProceduralFidelityScore(buildAnalysis([claim({ centrality: 'peripheral' })]))
      ).toBe(1);
    });

    it('returns the share of central claims in order', () => {
      expect(
        calculateProceduralFidelityScore(
          buildAnalysis([claim({}), claim({ sequence_match: 'MISMATCH' })])
        )
      ).toBe(0.5);
    });
  });
});
