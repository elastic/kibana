/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeCompareDiff, isHigherIsBetterFromName, isImproved } from './compare_diff';

describe('compare_diff', () => {
  describe('computeCompareDiff', () => {
    it('returns target minus baseline', () => {
      expect(computeCompareDiff(0.4, 0.7)).toBeCloseTo(0.3);
      expect(computeCompareDiff(0.8, 0.5)).toBeCloseTo(-0.3);
      expect(computeCompareDiff(1, 1)).toBe(0);
    });
  });

  describe('isImproved', () => {
    it('treats positive diff as improvement when higher is better', () => {
      // Quality metric: target mean 0.9 vs baseline 0.7 → green / improved
      const diff = computeCompareDiff(0.7, 0.9);
      expect(diff).toBeGreaterThan(0);
      expect(isImproved(diff, true)).toBe(true);
      expect(isImproved(-diff, true)).toBe(false);
    });

    it('treats negative diff as improvement when lower is better', () => {
      // Latency metric: target mean 100 vs baseline 150 → green / improved
      const diff = computeCompareDiff(150, 100);
      expect(diff).toBeLessThan(0);
      expect(isImproved(diff, false)).toBe(true);
      expect(isImproved(-diff, false)).toBe(false);
    });

    it('returns false for zero diff regardless of polarity', () => {
      expect(isImproved(0, true)).toBe(false);
      expect(isImproved(0, false)).toBe(false);
    });
  });

  describe('isHigherIsBetterFromName', () => {
    it('defaults quality-style names to higher-is-better', () => {
      expect(isHigherIsBetterFromName('Correctness')).toBe(true);
      expect(isHigherIsBetterFromName('Faithfulness')).toBe(true);
    });

    it('classifies known cost/latency names as lower-is-better', () => {
      expect(isHigherIsBetterFromName('Latency')).toBe(false);
      expect(isHigherIsBetterFromName('Input Tokens')).toBe(false);
      expect(isHigherIsBetterFromName('Output Tokens')).toBe(false);
    });
  });
});
