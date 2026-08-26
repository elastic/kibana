/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeCompareDiff, isImproved } from './compare_diff';

describe('compare_diff', () => {
  describe('computeCompareDiff', () => {
    it('returns target minus baseline', () => {
      expect(computeCompareDiff(0.7, 0.4)).toBeCloseTo(0.3);
      expect(computeCompareDiff(0.5, 0.8)).toBeCloseTo(-0.3);
      expect(computeCompareDiff(1, 1)).toBe(0);
    });
  });

  describe('isImproved', () => {
    it('treats positive diff as improvement when direction is maximize', () => {
      // Quality metric: target mean 0.9 vs baseline 0.7 → green / improved
      const diff = computeCompareDiff(0.9, 0.7);
      expect(diff).toBeGreaterThan(0);
      expect(isImproved(diff, 'maximize')).toBe(true);
      expect(isImproved(-diff, 'maximize')).toBe(false);
    });

    it('treats negative diff as improvement when direction is minimize', () => {
      // Latency metric: target mean 100 vs baseline 150 → green / improved
      const diff = computeCompareDiff(100, 150);
      expect(diff).toBeLessThan(0);
      expect(isImproved(diff, 'minimize')).toBe(true);
      expect(isImproved(-diff, 'minimize')).toBe(false);
    });

    it('returns false for zero diff regardless of direction', () => {
      expect(isImproved(0, 'maximize')).toBe(false);
      expect(isImproved(0, 'minimize')).toBe(false);
    });

    it('always returns false for a neutral direction', () => {
      expect(isImproved(5, 'neutral')).toBe(false);
      expect(isImproved(-5, 'neutral')).toBe(false);
      expect(isImproved(0, 'neutral')).toBe(false);
    });
  });
});
