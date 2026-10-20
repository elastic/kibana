/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toItemRate, toSeries, toValue } from './stats_values';

describe('toSeries', () => {
  const bucketMs = 60_000;

  it('formats the rows as points and totals them', () => {
    const rows = [
      { bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
      { bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
    ];

    expect(toSeries({ rows, bucketMs })).toEqual({
      series: {
        bucket_ms: bucketMs,
        points: [
          { start: '2026-10-20T10:00:00.000Z', value: 270 },
          { start: '2026-10-20T10:01:00.000Z', value: 240 },
        ],
      },
      total: 510,
    });
  });

  it('keeps the order of the rows', () => {
    const rows = [
      { bucket: 'b2', sum_items: 1 },
      { bucket: 'b1', sum_items: 2 },
    ];

    expect(toSeries({ rows, bucketMs }).series.points.map(({ start }) => start)).toEqual([
      'b2',
      'b1',
    ]);
  });

  it('leaves out a row with no items, and keeps a real zero', () => {
    const rows = [
      { bucket: 'b1', sum_items: null },
      { bucket: 'b2', sum_items: 0 },
    ];

    expect(toSeries({ rows, bucketMs })).toEqual({
      series: { bucket_ms: bucketMs, points: [{ start: 'b2', value: 0 }] },
      total: 0,
    });
  });

  it('has no points and no total for no rows', () => {
    expect(toSeries({ rows: [], bucketMs })).toEqual({
      series: { bucket_ms: bucketMs, points: [] },
      total: null,
    });
  });
});

describe('toValue', () => {
  it('carries the unit with a value', () => {
    expect(toValue(0.107, 's')).toEqual({ value: 0.107, unit: 's' });
  });

  it('keeps the unit with a zero value', () => {
    expect(toValue(0, '{item}')).toEqual({ value: 0, unit: '{item}' });
  });

  it('leaves the unit null when there is no value', () => {
    expect(toValue(null, 's')).toEqual({ value: null, unit: null });
  });
});

describe('toItemRate', () => {
  it('carries the item unit and the per second time unit', () => {
    expect(toItemRate(0.5)).toEqual({ value: 0.5, unit: '{item}', time_unit: 's' });
  });

  it('leaves both units null when there is no value', () => {
    expect(toItemRate(null)).toEqual({ value: null, unit: null, time_unit: null });
  });
});
