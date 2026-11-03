/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inferMetricType } from './metric_type';

describe('inferMetricType', () => {
  describe('binary', () => {
    it('infers binary when every observed score is 0 or 1', () => {
      expect(inferMetricType([1, 0, 1, 1], [0, 0, 1, 1])).toBe('binary');
    });

    it('infers binary even when only one of the two levels is observed', () => {
      expect(inferMetricType([1, 1], [1, 1])).toBe('binary');
    });
  });

  describe('ordinal_k', () => {
    it('infers ordinal_k for a dense 1-5 scale re-used across examples', () => {
      expect(inferMetricType([1, 3, 5, 4, 2, 3], [2, 3, 3, 5, 1, 4])).toBe('ordinal_k');
    });

    it('infers ordinal_k for a 1-3 scale when the unique ratio is at the limit', () => {
      // 3 distinct values over 6 observations = 0.5
      expect(inferMetricType([1, 2, 3], [1, 2, 3])).toBe('ordinal_k');
    });

    it('still misclassifies a small count as ordinal_k (documented limitation)', () => {
      // See the TODO in metric_type.ts: `Chat Calls` observed as a dense run from 1.
      expect(inferMetricType([1, 2, 3], [1, 2, 3, 1, 2])).toBe('ordinal_k');
    });
  });

  describe('count', () => {
    it('infers count when zero is observed alongside other integers', () => {
      expect(inferMetricType([0, 2, 3], [1, 0, 4])).toBe('count');
    });

    it('infers count for sparse integers that are not contiguous from 1', () => {
      expect(inferMetricType([3, 17, 240], [12, 3, 98])).toBe('count');
    });

    it('infers count for a dense run that does not start at 1', () => {
      expect(inferMetricType([2, 3, 4], [3, 2, 4])).toBe('count');
    });

    it('infers count when nearly every observation is a distinct integer', () => {
      // 5 distinct values over 6 observations = 0.83 > 0.5
      expect(inferMetricType([1, 2, 3], [4, 5, 1])).toBe('count');
    });

    it('infers count for a single repeated integer level above 1', () => {
      expect(inferMetricType([3], [3])).toBe('count');
    });
  });

  describe('continuous_bounded', () => {
    it('infers continuous_bounded when every score lies within [0, 1]', () => {
      expect(inferMetricType([0.25, 0.5, 1], [0, 0.75, 0.9])).toBe('continuous_bounded');
    });

    it('infers continuous_bounded when one arm is binary and the other is fractional', () => {
      expect(inferMetricType([0, 1, 1], [0.5, 0.75, 1])).toBe('continuous_bounded');
    });
  });

  describe('continuous_unbounded', () => {
    it('infers continuous_unbounded for non-integer values outside [0, 1]', () => {
      expect(inferMetricType([1.5, 2.25], [0.5, 150.4])).toBe('continuous_unbounded');
    });

    it('infers continuous_unbounded for negative integers', () => {
      expect(inferMetricType([-1, 2, 3], [0, 1, 2])).toBe('continuous_unbounded');
    });

    it('infers continuous_unbounded for negative fractions', () => {
      expect(inferMetricType([-0.5, 0.5], [0.25, 0.75])).toBe('continuous_unbounded');
    });
  });

  it('returns undefined when no scores are observed', () => {
    expect(inferMetricType([], [])).toBeUndefined();
  });

  it('considers the union of both arms', () => {
    // Target alone would be binary; the baseline pushes the slice to count.
    expect(inferMetricType([0, 1, 1], [0, 3, 7])).toBe('count');
  });
});
