/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META,
  TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META,
} from '@kbn/lens-common';
import { stackHistogramSeriesFn } from './stack_histogram_series_fn';
import { stackHistogramSeries } from './stack_histogram_series';

const table = (rows: Datatable['rows'], interval = { interval: 1, unit: 'hour' }): Datatable => ({
  type: 'datatable',
  columns: [
    {
      id: 'timestamp',
      name: 'timestamp',
      meta: { type: 'date', esMeta: { bucket: interval } },
    },
    { id: 'results', name: 'results', meta: { type: 'number' } },
  ],
  rows,
});

const args = {
  timeColumn: 'timestamp',
  totalColumn: 'results',
  overlayColumn: 'overlay',
  remainderColumn: 'remainder',
  label: 'Selected pattern',
  from: '2020-01-01T00:00:00.000Z',
  to: '2020-01-01T02:00:00.000Z',
  values: [2, 4],
  isSampled: false,
};

describe('stackHistogramSeries', () => {
  it('splits equal buckets into remainder and overlay', () => {
    const result = stackHistogramSeries(
      table([
        { timestamp: '2020-01-01T00:00:00.000Z', results: 5 },
        { timestamp: '2020-01-01T01:00:00.000Z', results: 3 },
      ]),
      args
    );

    expect(result.rows).toEqual([
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        results: 5,
        overlay: 2,
        remainder: 3,
      },
      {
        timestamp: '2020-01-01T01:00:00.000Z',
        results: 3,
        overlay: 3,
        remainder: 0,
      },
    ]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(false);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });

  it('resamples a shorter array across the range', () => {
    const result = stackHistogramSeries(
      table([
        { timestamp: '2020-01-01T00:00:00.000Z', results: 10 },
        { timestamp: '2020-01-01T01:00:00.000Z', results: 10 },
      ]),
      { ...args, values: [8] }
    );

    expect(result.rows.map((row) => row.overlay)).toEqual([4, 4]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(true);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });

  it('uses calendar intervals for a year bucket', () => {
    const result = stackHistogramSeries(
      table([{ timestamp: '2020-01-01T00:00:00.000Z', results: 5 }], { interval: 1, unit: 'year' }),
      {
        ...args,
        from: '2020-01-01T00:00:00.000Z',
        to: '2021-01-01T00:00:00.000Z',
        values: [2],
      }
    );

    expect(result.rows[0]).toMatchObject({ overlay: 2, remainder: 3 });
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(false);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });

  const expectZeroOverlay = (result: Datatable, totals: number[]) => {
    expect(result.columns.map((column) => column.id)).toEqual([
      'timestamp',
      'results',
      'remainder',
      'overlay',
    ]);
    expect(result.rows.map((row) => row.overlay)).toEqual(totals.map(() => 0));
    expect(result.rows.map((row) => row.remainder)).toEqual(totals);
    result.rows.forEach((row, index) => {
      expect(Number(row.overlay) + Number(row.remainder)).toBe(totals[index]);
    });
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(false);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(false);
  };

  it('emits a zero overlay for malformed values', () => {
    expectZeroOverlay(stackHistogramSeries(table([]), { ...args, values: [] }), []);
    expectZeroOverlay(stackHistogramSeries(table([{ timestamp: 'nope', results: 1 }]), args), [1]);
    expectZeroOverlay(
      stackHistogramSeries(table([{ timestamp: '2020-01-01T00:00:00.000Z', results: 4 }]), {
        ...args,
        values: [Number.NaN],
      }),
      [4]
    );
  });

  it('emits a zero overlay when the ranges do not overlap', () => {
    expectZeroOverlay(
      stackHistogramSeries(table([{ timestamp: '2019-01-01T00:00:00.000Z', results: 5 }]), args),
      [5]
    );
  });

  it('emits a zero overlay for empty rows', () => {
    expectZeroOverlay(stackHistogramSeries(table([]), args), []);
  });

  it('emits a zero overlay when the bucket interval cannot be determined', () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'timestamp', name: 'timestamp', meta: { type: 'date' } },
        { id: 'results', name: 'results', meta: { type: 'number' } },
      ],
      rows: [{ timestamp: '2020-01-01T00:30:00.000Z', results: 7 }],
    };

    expectZeroOverlay(stackHistogramSeries(input, args), [7]);
  });

  it('emits a zero overlay when the total column is missing', () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [{ id: 'timestamp', name: 'timestamp', meta: { type: 'date' } }],
      rows: [{ timestamp: '2020-01-01T00:00:00.000Z' }],
    };
    const result = stackHistogramSeries(input, args);

    expect(result.columns.map((column) => column.id)).toEqual([
      'timestamp',
      'remainder',
      'overlay',
    ]);
    expect(result.rows).toEqual([
      { timestamp: '2020-01-01T00:00:00.000Z', overlay: 0, remainder: 0 },
    ]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(false);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(false);
  });

  it('emits a zero overlay for malformed expression arguments', () => {
    const input = table([{ timestamp: '2020-01-01T00:00:00.000Z', results: 1 }]);
    const result = stackHistogramSeriesFn(input, {
      ...args,
      values: 'not-json',
      isSampled: false,
    });

    expectZeroOverlay(result, [1]);
    expect(result).not.toBe(input);
  });
});
