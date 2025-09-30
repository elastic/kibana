/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasChangedRetention, percentiles } from './utils';

describe('telemetry utils', () => {
  describe('hasChangedRetention', () => {
    it('returns false for undefined lifecycle', () => {
      expect(hasChangedRetention(undefined)).toBe(false);
    });

    it('returns false for inherit lifecycle (default retention)', () => {
      expect(hasChangedRetention({ inherit: {} })).toBe(false);
    });

    it('returns true for DSL lifecycle with custom retention', () => {
      expect(hasChangedRetention({ dsl: { data_retention: '30d' } })).toBe(true);
    });

    it('returns true for DSL lifecycle with forever retention (empty DSL)', () => {
      expect(hasChangedRetention({ dsl: {} })).toBe(true);
    });
  });

  describe('percentiles', () => {
    it('calculates percentiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = percentiles(data, [50, 95]);
      expect(result[0]).toBeCloseTo(5.5); // 50th percentile
      expect(result[1]).toBeCloseTo(9.55); // 95th percentile
    });

    it('handles empty array', () => {
      const result = percentiles([], [50, 95]);
      expect(result).toEqual([0, 0]);
    });

    it('handles single value', () => {
      const result = percentiles([5], [50, 95]);
      expect(result).toEqual([5, 5]);
    });
  });
});
