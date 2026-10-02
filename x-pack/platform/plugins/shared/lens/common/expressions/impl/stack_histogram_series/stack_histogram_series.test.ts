/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { parseInterval } from '@kbn/data-plugin/common';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import {
  TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META,
  TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META,
} from '@kbn/lens-common';
import { getStackHistogramSeries } from '../../defs/stack_histogram_series';
import type { StackHistogramInterval } from './stack_histogram_series';
import { stackHistogramSeries } from './stack_histogram_series';

const histogramInterval = (value: string, timeZone = 'UTC'): StackHistogramInterval => {
  const parsed = parseInterval(value);

  if (!parsed) {
    throw new Error(`Could not parse interval ${value}`);
  }

  return { interval: parsed, timeZone };
};

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
      args,
      histogramInterval('1h')
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
      { ...args, values: [8] },
      histogramInterval('1h')
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
      },
      histogramInterval('1y')
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

  it('infers equal spacing when histogram metadata is unavailable', () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'timestamp', name: 'timestamp', meta: { type: 'date' } },
        { id: 'results', name: 'results', meta: { type: 'number' } },
      ],
      rows: [
        { timestamp: '2020-01-01T00:00:00.000Z', results: 5 },
        { timestamp: '2020-01-01T01:00:00.000Z', results: 3 },
      ],
    };

    const result = stackHistogramSeries(input, args);

    expect(result.rows.map((row) => row.overlay)).toEqual([2, 3]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });

  it('uses the timezone calendar day across a daylight-saving transition', () => {
    const from = '2020-03-08T05:00:00.000Z';
    const to = '2020-03-09T04:00:00.000Z';
    const result = stackHistogramSeries(
      table([{ timestamp: from, results: 23 }]),
      { ...args, from, to, values: [23] },
      histogramInterval('1d', 'America/New_York')
    );

    expect(result.rows[0]).toMatchObject({ overlay: 23, remainder: 0 });
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]).toBe(false);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });
});

describe('stack histogram series expression', () => {
  const expressionArgs = {
    ...args,
    values: JSON.stringify(args.values),
  };

  it('uses the interval resolved from the histogram column', async () => {
    const result: Datatable = await functionWrapper(
      getStackHistogramSeries(createDatatableUtilitiesMock, () => 'UTC')
    )(
      table([
        { timestamp: '2020-01-01T00:00:00.000Z', results: 5 },
        { timestamp: '2020-01-01T01:00:00.000Z', results: 3 },
      ]),
      expressionArgs
    );

    expect(result.rows.map((row) => row.overlay)).toEqual([2, 3]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(true);
  });

  it('keeps a renderable table when interval resolution throws', async () => {
    const input = table([{ timestamp: '2020-01-01T00:30:00.000Z', results: 7 }]);
    const result: Datatable = await functionWrapper(
      getStackHistogramSeries(
        () => {
          throw new Error('missing KibanaRequest');
        },
        () => {
          throw new Error('missing KibanaRequest');
        }
      )
    )(input, expressionArgs);

    expect(result.columns.map((column) => column.id)).toEqual([
      'timestamp',
      'results',
      'remainder',
      'overlay',
    ]);
    expect(result.rows).toEqual([
      {
        timestamp: '2020-01-01T00:30:00.000Z',
        results: 7,
        overlay: 0,
        remainder: 7,
      },
    ]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(false);
  });

  it('emits a zero overlay for malformed expression arguments', async () => {
    const input = table([{ timestamp: '2020-01-01T00:00:00.000Z', results: 1 }]);
    const result: Datatable = await functionWrapper(
      getStackHistogramSeries(createDatatableUtilitiesMock, () => 'UTC')
    )(input, { ...expressionArgs, values: 'not-json' });

    expect(result.rows).toEqual([
      {
        timestamp: '2020-01-01T00:00:00.000Z',
        results: 1,
        overlay: 0,
        remainder: 1,
      },
    ]);
    expect(result.meta?.[TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]).toBe(false);
    expect(result).not.toBe(input);
  });
});
