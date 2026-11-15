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

const withoutAnalysis = {
  summary: {
    factual_accuracy_summary: 'ACCURATE',
    relevance_summary: 'RELEVANT',
    sequence_accuracy_summary: 'MATCH',
  },
} as unknown as CorrectnessAnalysis;

describe('correctness scoring', () => {
  it('returns null for factuality when the judge output has no analysis array', () => {
    expect(calculateFactualScore(withoutAnalysis)).toBeNull();
  });

  it('returns null for relevance when the judge output has no analysis array', () => {
    expect(calculateRelevanceScore(withoutAnalysis)).toBeNull();
  });

  it('returns null instead of a perfect sequence score when the judge output has no analysis array', () => {
    expect(calculateProceduralFidelityScore(withoutAnalysis)).toBeNull();
  });

  it('scores a judged answer with no claims as 0', () => {
    const empty = { ...withoutAnalysis, analysis: [] } as unknown as CorrectnessAnalysis;

    expect(calculateFactualScore(empty)).toBe(0);
    expect(calculateRelevanceScore(empty)).toBe(0);
  });
});
