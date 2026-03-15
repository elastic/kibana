/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { downsampleFn } from './downsample_fn';
import type { DownsampleExpressionFunction } from '../../defs/downsample/types';

type FnType = DownsampleExpressionFunction['fn'];

const createDatatable = (rowCount: number): Datatable => {
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    timestamp: i * 1000,
    value: Math.sin(i / 10) * 100,
    count: i,
  }));

  return {
    type: 'datatable',
    columns: [
      { id: 'timestamp', name: 'timestamp', meta: { type: 'date' } },
      { id: 'value', name: 'value', meta: { type: 'number' } },
      { id: 'count', name: 'count', meta: { type: 'number' } },
    ],
    rows,
  };
};

describe('downsampleFn', () => {
  const fn = downsampleFn as FnType;

  it('should return input unchanged when targetPoints <= 0', () => {
    const input = createDatatable(100);
    const result = fn(input, { targetPoints: 0 }, {} as never);
    expect(result).toBe(input);
  });

  it('should return input unchanged when rows <= targetPoints', () => {
    const input = createDatatable(10);
    const result = fn(input, { targetPoints: 20 }, {} as never);
    expect(result).toBe(input);
  });

  it('should downsample to approximately targetPoints rows', () => {
    const input = createDatatable(1000);
    const result = fn(input, { targetPoints: 100 }, {} as never) as Datatable;
    expect(result.rows.length).toBeLessThanOrEqual(200);
    expect(result.rows.length).toBeGreaterThanOrEqual(100);
  });

  it('should preserve all columns', () => {
    const input = createDatatable(100);
    const result = fn(input, { targetPoints: 10 }, {} as never) as Datatable;
    expect(result.columns).toEqual(input.columns);
  });

  it('should return input unchanged when there is no date column', () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'name', name: 'name', meta: { type: 'string' } },
        { id: 'value', name: 'value', meta: { type: 'number' } },
      ],
      rows: Array.from({ length: 100 }, (_, i) => ({ name: `item_${i}`, value: i })),
    };
    const result = fn(input, { targetPoints: 10 }, {} as never);
    expect(result).toBe(input);
  });

  it('should preserve the first and last timestamps', () => {
    const input = createDatatable(100);
    const result = fn(input, { targetPoints: 10 }, {} as never) as Datatable;
    const timestamps = result.rows.map((r) => r.timestamp);
    expect(timestamps[0]).toBe(0);
    expect(timestamps[timestamps.length - 1]).toBe(99 * 1000);
  });

  it('should maintain temporal order in output', () => {
    const input = createDatatable(500);
    const result = fn(input, { targetPoints: 50 }, {} as never) as Datatable;
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].timestamp).toBeGreaterThanOrEqual(result.rows[i - 1].timestamp);
    }
  });
});
