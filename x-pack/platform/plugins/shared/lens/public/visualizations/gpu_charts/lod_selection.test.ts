/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  selectLodTier,
  reservoirSample,
  reservoirSampleIndices,
  calculateServerSamplingProbability,
} from './lod_selection';

describe('LOD Selection', () => {
  describe('selectLodTier', () => {
    it('should select tier 1 for small datasets', () => {
      const selection = selectLodTier(50000);

      expect(selection.tier).toBe(1);
      expect(selection.samplingRate).toBe(1.0);
    });

    it('should select tier 2 for medium datasets', () => {
      const selection = selectLodTier(200000);

      expect(selection.tier).toBe(2);
      expect(selection.samplingRate).toBeLessThan(1);
    });

    it('should select tier 3 for large datasets', () => {
      const selection = selectLodTier(1000000);

      expect(selection.tier).toBe(3);
      expect(selection.samplingRate).toBeGreaterThan(0);
      expect(selection.samplingRate).toBeLessThan(1);
    });

    it('should select tier 4 for very large datasets', () => {
      const selection = selectLodTier(10000000);

      expect(selection.tier).toBe(4);
      expect(selection.samplingRate).toBeGreaterThan(0);
      expect(selection.samplingRate).toBeLessThan(1);
    });

    it('should respect user override', () => {
      const selection = selectLodTier(50000, { tier: 3, samplingRate: 0.1 });

      expect(selection.tier).toBe(3);
      expect(selection.samplingRate).toBe(0.1);
      expect(selection.reason).toContain('User selected');
    });

    it('should provide reason for tier selection', () => {
      const selection = selectLodTier(50000);

      expect(selection.reason).toBeDefined();
      expect(selection.reason.length).toBeGreaterThan(0);
    });

    it('should calculate estimated render points', () => {
      const selection = selectLodTier(200000);

      expect(selection.estimatedRenderPoints).toBeDefined();
      expect(selection.estimatedRenderPoints).toBeLessThanOrEqual(200000);
    });
  });

  describe('reservoirSample', () => {
    it('should return all items if sample size >= data length', () => {
      const data = [1, 2, 3, 4, 5];
      const sampled = reservoirSample(data, 10);

      expect(sampled.length).toBe(5);
      expect(sampled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return correct sample size when sampling', () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);
      const sampleSize = 1000;
      const sampled = reservoirSample(data, sampleSize);

      expect(sampled.length).toBe(sampleSize);
    });

    it('should produce deterministic results with same seed', () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);
      const sampleSize = 1000;
      const seed = 42;

      const sampled1 = reservoirSample(data, sampleSize, seed);
      const sampled2 = reservoirSample(data, sampleSize, seed);

      expect(sampled1).toEqual(sampled2);
    });

    it('should produce different results with different seeds', () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);
      const sampleSize = 1000;

      const sampled1 = reservoirSample(data, sampleSize, 42);
      const sampled2 = reservoirSample(data, sampleSize, 123);

      expect(sampled1).not.toEqual(sampled2);
    });
  });

  describe('reservoirSampleIndices', () => {
    it('should return all indices if sample size >= data length', () => {
      const indices = reservoirSampleIndices(5, 10);

      expect(indices.length).toBe(5);
      expect(Array.from(indices).sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('should return correct sample size when sampling', () => {
      const dataLength = 10000;
      const sampleSize = 1000;
      const indices = reservoirSampleIndices(dataLength, sampleSize);

      expect(indices.length).toBe(sampleSize);
    });

    it('should return unique indices', () => {
      const dataLength = 10000;
      const sampleSize = 1000;
      const indices = reservoirSampleIndices(dataLength, sampleSize);

      const uniqueIndices = new Set(indices);
      expect(uniqueIndices.size).toBe(sampleSize);
    });

    it('should return indices within valid range', () => {
      const dataLength = 10000;
      const sampleSize = 1000;
      const indices = reservoirSampleIndices(dataLength, sampleSize);

      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(dataLength);
      }
    });

    it('should produce deterministic results with same seed', () => {
      const dataLength = 10000;
      const sampleSize = 1000;
      const seed = 42;

      const indices1 = reservoirSampleIndices(dataLength, sampleSize, seed);
      const indices2 = reservoirSampleIndices(dataLength, sampleSize, seed);

      expect(Array.from(indices1)).toEqual(Array.from(indices2));
    });
  });

  describe('calculateServerSamplingProbability', () => {
    it('should return 1 for small datasets', () => {
      const probability = calculateServerSamplingProbability(50000, 100000);

      expect(probability).toBe(1);
    });

    it('should return value less than 1 for large datasets', () => {
      const probability = calculateServerSamplingProbability(1000000, 100000);

      expect(probability).toBeLessThan(1);
      expect(probability).toBeGreaterThan(0);
    });

    it('should calculate correct probability based on target', () => {
      const totalRows = 1000000;
      const targetRows = 100000;
      const probability = calculateServerSamplingProbability(totalRows, targetRows);

      // Probability should be approximately targetRows / totalRows
      // Allow some tolerance for any adjustment factors
      expect(probability).toBeCloseTo(targetRows / totalRows, 1);
    });

    it('should handle edge case of very large datasets', () => {
      const probability = calculateServerSamplingProbability(100000000, 100000);

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
    });
  });
});
