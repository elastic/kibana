/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lttb, lttbMultiMetric } from './lttb';

describe('lttb', () => {
  it('should return all indices when data length <= threshold', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 20, 30, 40, 50];
    expect(lttb(x, y, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(lttb(x, y, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it('should return all indices when threshold < 3', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 20, 30, 40, 50];
    expect(lttb(x, y, 2)).toEqual([0, 1, 2, 3, 4]);
  });

  it('should always include the first and last points', () => {
    const x = Array.from({ length: 100 }, (_, i) => i);
    const y = x.map((v) => Math.sin(v));
    const result = lttb(x, y, 10);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(99);
  });

  it('should return exactly threshold number of indices', () => {
    const x = Array.from({ length: 1000 }, (_, i) => i);
    const y = x.map((v) => Math.sin(v / 10));
    const result = lttb(x, y, 50);
    expect(result).toHaveLength(50);
  });

  it('should return sorted indices', () => {
    const x = Array.from({ length: 200 }, (_, i) => i);
    const y = x.map((v) => Math.sin(v / 5) * 100);
    const result = lttb(x, y, 20);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('should preserve peaks in a simple spike pattern', () => {
    const x = Array.from({ length: 100 }, (_, i) => i);
    const y = x.map((v) => (v === 50 ? 1000 : 0));
    const result = lttb(x, y, 10);
    expect(result).toContain(50);
  });
});

describe('lttbMultiMetric', () => {
  it('should return all indices when data is shorter than threshold', () => {
    const x = [1, 2, 3];
    const yColumns = [[10, 20, 30]];
    expect(lttbMultiMetric(x, yColumns, 5)).toEqual([0, 1, 2]);
  });

  it('should keep indices significant to any metric', () => {
    const x = Array.from({ length: 100 }, (_, i) => i);
    const y1 = x.map((v) => (v === 25 ? 1000 : 0));
    const y2 = x.map((v) => (v === 75 ? 1000 : 0));
    const result = lttbMultiMetric(x, [y1, y2], 10);
    expect(result).toContain(25);
    expect(result).toContain(75);
  });

  it('should handle empty yColumns by using x as y', () => {
    const x = Array.from({ length: 100 }, (_, i) => i);
    const result = lttbMultiMetric(x, [], 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(99);
  });

  it('should return sorted indices even with multiple metrics', () => {
    const x = Array.from({ length: 200 }, (_, i) => i);
    const y1 = x.map((v) => Math.sin(v / 5));
    const y2 = x.map((v) => Math.cos(v / 5));
    const result = lttbMultiMetric(x, [y1, y2], 20);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});
