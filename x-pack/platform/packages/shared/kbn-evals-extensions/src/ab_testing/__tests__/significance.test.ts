/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testSignificance } from '../significance';

describe('testSignificance', () => {
  it('should return not significant for empty arrays', () => {
    const result = testSignificance([], []);
    expect(result.significant).toBe(false);
    expect(result.recommendation).toContain('Insufficient data');
  });

  it('should detect significant difference between clearly different distributions', () => {
    // A is clearly better: all scores around 0.9
    // B is clearly worse: all scores around 0.3
    const scoresA = [0.9, 0.85, 0.95, 0.88, 0.92, 0.87, 0.91, 0.93, 0.89, 0.9];
    const scoresB = [0.3, 0.25, 0.35, 0.28, 0.32, 0.27, 0.31, 0.33, 0.29, 0.3];

    const result = testSignificance(scoresA, scoresB, 0.05, 5000, 42);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.recommendation).toContain('Variant A');
    expect(result.confidenceInterval.lower).toBeGreaterThan(0);
  });

  it('should detect significant difference when B is better', () => {
    const scoresA = [0.3, 0.25, 0.35, 0.28, 0.32, 0.27, 0.31, 0.33, 0.29, 0.3];
    const scoresB = [0.9, 0.85, 0.95, 0.88, 0.92, 0.87, 0.91, 0.93, 0.89, 0.9];

    const result = testSignificance(scoresA, scoresB, 0.05, 5000, 42);
    expect(result.significant).toBe(true);
    expect(result.recommendation).toContain('Variant B');
  });

  it('should not find significance for identical distributions', () => {
    const scores = [0.5, 0.6, 0.55, 0.52, 0.58, 0.53, 0.57, 0.54, 0.56, 0.51];

    const result = testSignificance(scores, scores, 0.05, 5000, 42);
    expect(result.significant).toBe(false);
    expect(result.recommendation).toContain('No statistically significant');
  });

  it('should not find significance for similar distributions with small samples', () => {
    const scoresA = [0.5, 0.6, 0.55];
    const scoresB = [0.48, 0.58, 0.53];

    const result = testSignificance(scoresA, scoresB, 0.05, 5000, 42);
    expect(result.significant).toBe(false);
  });

  it('should return confidence interval', () => {
    const scoresA = [0.8, 0.85, 0.9, 0.82, 0.88];
    const scoresB = [0.4, 0.45, 0.5, 0.42, 0.48];

    const result = testSignificance(scoresA, scoresB);
    expect(result.confidenceInterval).toBeDefined();
    expect(result.confidenceInterval.level).toBe(0.95);
    expect(result.confidenceInterval.lower).toBeLessThan(result.confidenceInterval.upper);
    expect(result.confidenceInterval.mean).toBeCloseTo(0.4, 1);
  });

  it('should be reproducible with the same seed', () => {
    const scoresA = [0.9, 0.85, 0.95, 0.88, 0.92];
    const scoresB = [0.3, 0.25, 0.35, 0.28, 0.32];

    const result1 = testSignificance(scoresA, scoresB, 0.05, 1000, 123);
    const result2 = testSignificance(scoresA, scoresB, 0.05, 1000, 123);

    expect(result1.pValue).toBe(result2.pValue);
    expect(result1.significant).toBe(result2.significant);
  });
});
