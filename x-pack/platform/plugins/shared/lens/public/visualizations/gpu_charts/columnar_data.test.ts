/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { datatableToColumnar, normalizeColumnarData, esqlColumnarToGpu } from './columnar_data';

describe('Columnar Data Utilities', () => {
  describe('datatableToColumnar', () => {
    it('should convert a datatable with numeric columns to columnar format', () => {
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
        ],
        rows: [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
          { x: 3, y: 30 },
        ],
      };

      const columnar = datatableToColumnar(datatable, { x: 'x', y: 'y' });

      expect(columnar.length).toBe(3);
      expect(columnar.x).toBeInstanceOf(Float32Array);
      expect(columnar.y).toBeInstanceOf(Float32Array);
      expect(Array.from(columnar.x)).toEqual([1, 2, 3]);
      expect(Array.from(columnar.y)).toEqual([10, 20, 30]);
    });

    it('should track bounds for normalization', () => {
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
        ],
        rows: [
          { x: 0, y: 10 },
          { x: 50, y: 20 },
          { x: 100, y: 30 },
        ],
      };

      const columnar = datatableToColumnar(datatable, { x: 'x', y: 'y' });

      expect(columnar.bounds.x).toEqual({ min: 0, max: 100 });
      expect(columnar.bounds.y).toEqual({ min: 10, max: 30 });
    });

    it('should handle 3D data with z accessor', () => {
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
          { id: 'z', name: 'Z', meta: { type: 'number' } },
        ],
        rows: [
          { x: 1, y: 10, z: 100 },
          { x: 2, y: 20, z: 200 },
        ],
      };

      const columnar = datatableToColumnar(datatable, { x: 'x', y: 'y', z: 'z' });

      expect(columnar.z).toBeInstanceOf(Float32Array);
      expect(Array.from(columnar.z!)).toEqual([100, 200]);
      expect(columnar.bounds.z).toEqual({ min: 100, max: 200 });
    });

    it('should handle color and size accessors', () => {
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
          { id: 'col', name: 'Color', meta: { type: 'number' } },
          { id: 'sz', name: 'Size', meta: { type: 'number' } },
        ],
        rows: [
          { x: 1, y: 10, col: 5, sz: 2 },
          { x: 2, y: 20, col: 10, sz: 4 },
        ],
      };

      const columnar = datatableToColumnar(datatable, {
        x: 'x',
        y: 'y',
        color: 'col',
        size: 'sz',
      });

      expect(columnar.color).toBeInstanceOf(Float32Array);
      expect(columnar.size).toBeInstanceOf(Float32Array);
      expect(Array.from(columnar.color!)).toEqual([5, 10]);
      expect(Array.from(columnar.size!)).toEqual([2, 4]);
    });

    it('should handle group accessor by mapping to numeric indices', () => {
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
          { id: 'grp', name: 'Group', meta: { type: 'string' } },
        ],
        rows: [
          { x: 1, y: 10, grp: 'A' },
          { x: 2, y: 20, grp: 'B' },
          { x: 3, y: 30, grp: 'A' },
        ],
      };

      const columnar = datatableToColumnar(datatable, {
        x: 'x',
        y: 'y',
        group: 'grp',
      });

      expect(columnar.group).toBeInstanceOf(Uint32Array);
      const groupIndices = Array.from(columnar.group!);
      // Same group should have same index
      expect(groupIndices[0]).toBe(groupIndices[2]);
      // Different group should have different index
      expect(groupIndices[0]).not.toBe(groupIndices[1]);
    });

    it('should sample data when exceeding max points', () => {
      const rows = Array.from({ length: 2000 }, (_, i) => ({ x: i, y: i * 2 }));
      const datatable: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X', meta: { type: 'number' } },
          { id: 'y', name: 'Y', meta: { type: 'number' } },
        ],
        rows,
      };

      const columnar = datatableToColumnar(datatable, { x: 'x', y: 'y' }, { maxPoints: 1000 });

      expect(columnar.length).toBe(1000);
    });
  });

  describe('normalizeColumnarData', () => {
    it('should normalize data to 0-1 range in place', () => {
      const data = {
        x: new Float32Array([0, 50, 100]),
        y: new Float32Array([10, 20, 30]),
        length: 3,
        bounds: {
          x: { min: 0, max: 100 },
          y: { min: 10, max: 30 },
        },
      };

      normalizeColumnarData(data);

      // Values should be normalized to 0-1 range
      expect(data.x[0]).toBeCloseTo(0);
      expect(data.x[1]).toBeCloseTo(0.5);
      expect(data.x[2]).toBeCloseTo(1);

      expect(data.y[0]).toBeCloseTo(0);
      expect(data.y[1]).toBeCloseTo(0.5);
      expect(data.y[2]).toBeCloseTo(1);
    });

    it('should handle constant values (min === max) by setting to 0.5', () => {
      const data = {
        x: new Float32Array([5, 5, 5]),
        y: new Float32Array([10, 20, 30]),
        length: 3,
        bounds: {
          x: { min: 5, max: 5 },
          y: { min: 10, max: 30 },
        },
      };

      normalizeColumnarData(data);

      // When min === max, all values should be 0.5
      expect(data.x[0]).toBeCloseTo(0.5);
      expect(data.x[1]).toBeCloseTo(0.5);
      expect(data.x[2]).toBeCloseTo(0.5);
    });

    it('should normalize optional z, color, and size arrays', () => {
      const data = {
        x: new Float32Array([0, 100]),
        y: new Float32Array([0, 100]),
        z: new Float32Array([0, 200]),
        color: new Float32Array([0, 50]),
        size: new Float32Array([1, 5]),
        length: 2,
        bounds: {
          x: { min: 0, max: 100 },
          y: { min: 0, max: 100 },
          z: { min: 0, max: 200 },
          color: { min: 0, max: 50 },
          size: { min: 1, max: 5 },
        },
      };

      normalizeColumnarData(data);

      expect(data.z![0]).toBeCloseTo(0);
      expect(data.z![1]).toBeCloseTo(1);
      expect(data.color![0]).toBeCloseTo(0);
      expect(data.color![1]).toBeCloseTo(1);
      expect(data.size![0]).toBeCloseTo(0);
      expect(data.size![1]).toBeCloseTo(1);
    });
  });

  describe('esqlColumnarToGpu', () => {
    it('should convert ES|QL columnar response to GPU format', () => {
      const columns = [
        { name: 'x', values: [1, 2, 3] },
        { name: 'y', values: [10, 20, 30] },
      ];

      const result = esqlColumnarToGpu(columns, { x: 'x', y: 'y' });

      expect(result.length).toBe(3);
      expect(result.x).toBeInstanceOf(Float32Array);
      expect(result.y).toBeInstanceOf(Float32Array);
      expect(Array.from(result.x)).toEqual([1, 2, 3]);
      expect(Array.from(result.y)).toEqual([10, 20, 30]);
    });

    it('should calculate bounds from ES|QL data', () => {
      const columns = [
        { name: 'x', values: [0, 50, 100] },
        { name: 'y', values: [10, 20, 30] },
      ];

      const result = esqlColumnarToGpu(columns, { x: 'x', y: 'y' });

      expect(result.bounds.x).toEqual({ min: 0, max: 100 });
      expect(result.bounds.y).toEqual({ min: 10, max: 30 });
    });

    it('should handle optional z, color, and size columns', () => {
      const columns = [
        { name: 'x', values: [1, 2] },
        { name: 'y', values: [10, 20] },
        { name: 'z', values: [100, 200] },
        { name: 'col', values: [5, 10] },
        { name: 'sz', values: [2, 4] },
      ];

      const result = esqlColumnarToGpu(columns, {
        x: 'x',
        y: 'y',
        z: 'z',
        color: 'col',
        size: 'sz',
      });

      expect(result.z).toBeDefined();
      expect(result.color).toBeDefined();
      expect(result.size).toBeDefined();
      expect(Array.from(result.z!)).toEqual([100, 200]);
      expect(Array.from(result.color!)).toEqual([5, 10]);
      expect(Array.from(result.size!)).toEqual([2, 4]);
    });

    it('should throw error when required columns are missing', () => {
      const columns = [{ name: 'x', values: [1, 2, 3] }];

      expect(() => esqlColumnarToGpu(columns, { x: 'x', y: 'y' })).toThrow(
        'Required x and y columns not found'
      );
    });
  });
});
