/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getXDomain } from '@kbn/expression-xy-plugin/public/components/x_domain';
import { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { dateHistogramTextBasedFn } from '@kbn/lens-plugin/common/expressions/impl/date_histogram/date_histogram_fn_textbased';
import { esqlTable } from './__fixtures__/esql_table';
import { dateMinInterval, prepareEsqlDateHistogram, timeXDomain } from './time_domain';

const utilities = new DatatableUtilitiesService({} as never, {} as never, {} as never);

const DAY = 86_400_000;

/** An ES|QL table bucketed by `BUCKET(@timestamp, <interval> <unit>)`, as the esql executor returns it. */
const bucketTable = (
  starts: string[],
  bucket: { interval: number; unit: string },
  timeRange: { from: string; to: string }
): Datatable => {
  const table = esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'day', type: 'date' },
    ],
    starts.map((start, index) => [index + 1, start]),
    'FROM logs | STATS count = COUNT(*) BY day = BUCKET(@timestamp, 1 day)'
  );
  return {
    ...table,
    columns: table.columns.map((column) =>
      column.id === 'day'
        ? {
            ...column,
            meta: {
              ...column.meta,
              esMeta: { bucket },
              sourceParams: { ...column.meta.sourceParams, appliedTimeRange: timeRange },
            },
          }
        : column
    ),
  };
};

const lensPrepared = (table: Datatable, timeZone: string) =>
  dateHistogramTextBasedFn(
    () => utilities,
    () => timeZone
  )(table, {}, {} as never) as Promise<Datatable>;

describe('Lens ES|QL date histograms', () => {
  const partial = bucketTable(
    ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z', '2024-01-03T00:00:00.000Z'],
    { interval: 1, unit: 'day' },
    { from: '2024-01-01T12:00:00.000Z', to: '2024-01-04T00:00:00.000Z' }
  );

  it.each(['UTC', 'America/Toronto'])(
    'prepares a table as `lens_date_histogram_textbased` does, in %s',
    async (timeZone) => {
      expect(prepareEsqlDateHistogram(partial, timeZone)).toEqual(
        await lensPrepared(partial, timeZone)
      );
    }
  );

  it('drops the partial first bucket and states the domain', () => {
    const prepared = prepareEsqlDateHistogram(partial, 'UTC');
    expect(prepared.rows.map(({ day }) => day)).toEqual([
      '2024-01-02T00:00:00.000Z',
      '2024-01-03T00:00:00.000Z',
    ]);
    expect(prepared.columns[1].meta.sourceParams?.computedDomain).toEqual({
      min: Date.parse('2024-01-02T00:00:00.000Z'),
      max: Date.parse('2024-01-03T00:00:00.000Z'),
    });
  });

  it('leaves a table without a bucketed date column alone', () => {
    const table = esqlTable([{ name: 'count', type: 'long' }], [[1]]);
    expect(prepareEsqlDateHistogram(table)).toBe(table);
  });
});

describe("Lens's time x domain", () => {
  const cases: Array<[string, Datatable, boolean]> = [
    [
      'daily lines',
      bucketTable(
        ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z', '2024-01-03T00:00:00.000Z'],
        { interval: 1, unit: 'day' },
        { from: '2024-01-01T00:00:00.000Z', to: '2024-01-04T00:00:00.000Z' }
      ),
      false,
    ],
    [
      'daily bars',
      bucketTable(
        ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z'],
        { interval: 1, unit: 'day' },
        { from: '2024-01-01T00:00:00.000Z', to: '2024-01-03T00:00:00.000Z' }
      ),
      true,
    ],
    [
      'monthly bars, with months of different lengths',
      bucketTable(
        ['2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'],
        { interval: 1, unit: 'month' },
        { from: '2024-01-01T00:00:00.000Z', to: '2024-04-01T00:00:00.000Z' }
      ),
      true,
    ],
    [
      'hourly lines',
      bucketTable(
        ['2024-01-01T00:00:00.000Z', '2024-01-01T01:00:00.000Z'],
        { interval: 1, unit: 'hour' },
        { from: '2024-01-01T00:00:00.000Z', to: '2024-01-01T02:00:00.000Z' }
      ),
      false,
    ],
  ];

  it.each(cases)("is `getXDomain`'s extended domain for %s", (_, raw, hasBars) => {
    const table = prepareEsqlDateHistogram(raw, 'UTC');
    const column = table.columns.find(({ id }) => id === 'day');
    const minInterval = dateMinInterval(column);
    const { extendedDomain } = getXDomain(
      utilities,
      [{ xAccessor: 'day', table } as never],
      minInterval,
      true,
      false,
      hasBars,
      'UTC'
    );
    expect(timeXDomain([{ table, x: 'day' }], minInterval, hasBars, 'UTC')).toEqual(extendedDomain);
  });

  it("keeps a month bucket's own duration for ES|QL's ISO dates, as Lens's `getXValues` leaves them", () => {
    const table = prepareEsqlDateHistogram(cases[2][1], 'UTC');
    const minInterval = dateMinInterval(table.columns[1]);
    expect(timeXDomain([{ table, x: 'day' }], minInterval, true, 'UTC')?.minInterval).toBe(
      30 * DAY
    );
  });
});
