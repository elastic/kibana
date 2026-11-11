/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateSetMetrics } from './set_metrics';

describe('calculateSetMetrics', () => {
  it('should return perfect scores for a full match', () => {
    const result = calculateSetMetrics(new Set(['A', 'B', 'C']), new Set(['A', 'B', 'C']));
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
    expect(result.f1).toBe(1);
  });

  it('should compute correct scores for a partial overlap', () => {
    // predicted {A,B,D}, expected {A,B,C}: 2 true positives
    // precision = 2/3, recall = 2/3, f1 = 2/3
    const result = calculateSetMetrics(new Set(['A', 'B', 'D']), new Set(['A', 'B', 'C']));
    expect(result.precision).toBeCloseTo(2 / 3);
    expect(result.recall).toBeCloseTo(2 / 3);
    expect(result.f1).toBeCloseTo(2 / 3);
  });

  it('should return zero scores for no overlap', () => {
    const result = calculateSetMetrics(new Set(['X', 'Y']), new Set(['A', 'B']));
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.f1).toBe(0);
  });

  it('should return asymmetric scores when predicted is a subset of expected', () => {
    // predicted {A}, expected {A,B,C}: precision = 1, recall = 1/3, f1 = 0.5
    const result = calculateSetMetrics(new Set(['A']), new Set(['A', 'B', 'C']));
    expect(result.precision).toBe(1);
    expect(result.recall).toBeCloseTo(1 / 3);
    expect(result.f1).toBeCloseTo(0.5);
  });

  it('should return asymmetric scores when predicted is a superset of expected', () => {
    // predicted {A,B,C,D}, expected {A,B,C}: precision = 3/4, recall = 1, f1 = 6/7
    const result = calculateSetMetrics(new Set(['A', 'B', 'C', 'D']), new Set(['A', 'B', 'C']));
    expect(result.precision).toBeCloseTo(3 / 4);
    expect(result.recall).toBe(1);
    expect(result.f1).toBeCloseTo(6 / 7);
  });

  it('should return {1,1,1} when both sets are empty', () => {
    const result = calculateSetMetrics(new Set<string>(), new Set<string>());
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
    expect(result.f1).toBe(1);
  });

  it('should return {0,0,0} when predicted is empty and expected is non-empty', () => {
    const result = calculateSetMetrics(new Set<string>(), new Set(['A', 'B']));
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.f1).toBe(0);
  });

  it('should return {0,0,0} when expected is empty and predicted is non-empty', () => {
    // Predicting entities that were never expected: precision is genuinely 0/n.
    const result = calculateSetMetrics(new Set(['A', 'B']), new Set<string>());
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.f1).toBe(0);
  });

  it('should work with number sets', () => {
    // exercises the <T extends string | number> constraint with numbers
    // predicted {1,2,3}, expected {2,3,4}: 2 true positives
    // precision = 2/3, recall = 2/3
    const result = calculateSetMetrics(new Set([1, 2, 3]), new Set([2, 3, 4]));
    expect(result.precision).toBeCloseTo(2 / 3);
    expect(result.recall).toBeCloseTo(2 / 3);
    expect(result.f1).toBeCloseTo(2 / 3);
  });
});
