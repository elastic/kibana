/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeCompositeScore } from '../composite';
import type { CompositeScoreConfig } from '../../types';

describe('computeCompositeScore', () => {
  const config: CompositeScoreConfig = {
    weights: {
      safety: 0.3,
      accuracy: 0.4,
      style: 0.3,
    },
    dimensions: {
      safety: ['skill-safety', 'skill-pii'],
      accuracy: ['skill-accuracy'],
      style: ['skill-relevance', 'skill-specificity'],
    },
  };

  it('should compute weighted composite score', () => {
    const results = [
      { evaluator: 'skill-safety', score: 1.0 },
      { evaluator: 'skill-pii', score: 1.0 },
      { evaluator: 'skill-accuracy', score: 0.8 },
      { evaluator: 'skill-relevance', score: 0.9 },
      { evaluator: 'skill-specificity', score: 0.7 },
    ];

    const result = computeCompositeScore(results, config);

    // safety dimension = (1.0 + 1.0) / 2 = 1.0
    // accuracy dimension = 0.8
    // style dimension = (0.9 + 0.7) / 2 = 0.8
    // weighted = (1.0*0.3 + 0.8*0.4 + 0.8*0.3) / (0.3+0.4+0.3) = 0.86
    expect(result.compositeScore).toBeCloseTo(0.86, 2);
    expect(result.compositeGrade).toBe('B');
  });

  it('should assign grade A for scores >= 0.9', () => {
    const results = [
      { evaluator: 'skill-safety', score: 1.0 },
      { evaluator: 'skill-pii', score: 1.0 },
      { evaluator: 'skill-accuracy', score: 0.95 },
      { evaluator: 'skill-relevance', score: 0.9 },
      { evaluator: 'skill-specificity', score: 0.9 },
    ];

    const result = computeCompositeScore(results, config);
    expect(result.compositeGrade).toBe('A');
  });

  it('should assign grade F for very low scores', () => {
    const results = [
      { evaluator: 'skill-safety', score: 0.1 },
      { evaluator: 'skill-pii', score: 0.2 },
      { evaluator: 'skill-accuracy', score: 0.1 },
      { evaluator: 'skill-relevance', score: 0.2 },
      { evaluator: 'skill-specificity', score: 0.1 },
    ];

    const result = computeCompositeScore(results, config);
    expect(result.compositeGrade).toBe('F');
  });

  it('should handle null scores by excluding them from dimension average', () => {
    const results = [
      { evaluator: 'skill-safety', score: 1.0 },
      { evaluator: 'skill-pii', score: null },
      { evaluator: 'skill-accuracy', score: 0.8 },
      { evaluator: 'skill-relevance', score: 0.9 },
      { evaluator: 'skill-specificity', score: null },
    ];

    const result = computeCompositeScore(results, config);
    // safety dimension = 1.0 (only skill-safety counted)
    // accuracy dimension = 0.8
    // style dimension = 0.9 (only skill-relevance counted)
    expect(result.dimensionScores.safety).toBe(1.0);
    expect(result.dimensionScores.accuracy).toBe(0.8);
    expect(result.dimensionScores.style).toBe(0.9);
  });

  it('should handle missing evaluators gracefully', () => {
    const results = [{ evaluator: 'skill-accuracy', score: 0.8 }];
    const result = computeCompositeScore(results, config);

    expect(result.dimensionScores.accuracy).toBe(0.8);
    // safety and style have no matching evaluators → dimension score = 0
    expect(result.dimensionScores.safety).toBe(0);
    expect(result.dimensionScores.style).toBe(0);
  });

  it('should renormalize weights for missing dimensions', () => {
    // Config with a dimension that has no evaluators in results
    const singleResult = [{ evaluator: 'skill-accuracy', score: 0.8 }];
    const result = computeCompositeScore(singleResult, config);
    // All dimensions exist in config, but safety/style have score 0
    // weighted = (0*0.3 + 0.8*0.4 + 0*0.3) / 1.0 = 0.32
    expect(result.compositeScore).toBeCloseTo(0.32, 2);
  });

  it('should return 0 for empty results', () => {
    const result = computeCompositeScore([], config);
    expect(result.compositeScore).toBe(0);
    expect(result.compositeGrade).toBe('F');
  });
});
