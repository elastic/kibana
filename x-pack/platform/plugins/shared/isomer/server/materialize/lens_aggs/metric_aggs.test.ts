/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import { getAggTypesFunctions } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { GenericIndexPatternColumn } from '@kbn/lens-common';
import { serializeAgg, toMetricAgg } from './metric_aggs';

/**
 * The agg config the data plugin's own `agg*` expression function serializes for `args`: what
 * `esaggs` receives when Lens's `toEsAggsFn` builds that function call.
 */
const kibanaAgg = (fn: string, args: Record<string, unknown>): AggConfigSerialized => {
  const definition = getAggTypesFunctions()
    .map((factory) => factory())
    .find(({ name }) => name === fn);
  if (!definition) {
    throw new Error(`No ${fn} function`);
  }
  const defined = Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined)
  );
  return (
    definition.fn as (input: null, args: object, context: ExecutionContext) => { value: object }
  )(null, defined, {} as ExecutionContext).value as AggConfigSerialized;
};

const base = { dataType: 'number' as const, isBucketed: false, label: '', customLabel: false };

// Each case's arguments are the ones the operation's `toEsAggsFn` passes, read from
// `lens/public/datasources/form_based/operations/definitions`.
const cases: Array<[string, object, string, Record<string, unknown>]> = [
  [
    'count of records (count.tsx, document field)',
    {
      ...base,
      operationType: 'count',
      sourceField: '___records___',
      params: { emptyAsNull: false },
    },
    'aggCount',
    { id: '1', enabled: true, schema: 'metric', timeShift: undefined, emptyAsNull: false },
  ],
  [
    'count of a field (count.tsx)',
    { ...base, operationType: 'count', sourceField: 'bytes', params: { emptyAsNull: true } },
    'aggValueCount',
    {
      id: '1',
      enabled: true,
      schema: 'metric',
      field: 'bytes',
      timeShift: undefined,
      emptyAsNull: true,
    },
  ],
  [
    'unique count (cardinality.tsx)',
    { ...base, operationType: 'unique_count', sourceField: 'host', params: { emptyAsNull: true } },
    'aggCardinality',
    { id: '1', enabled: true, schema: 'metric', field: 'host', emptyAsNull: true },
  ],
  [
    'sum, with its zero option (metrics.tsx)',
    { ...base, operationType: 'sum', sourceField: 'bytes', params: { emptyAsNull: false } },
    'aggSum',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes', emptyAsNull: false },
  ],
  [
    'average (metrics.tsx)',
    { ...base, operationType: 'average', sourceField: 'bytes' },
    'aggAvg',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes' },
  ],
  [
    'minimum (metrics.tsx)',
    { ...base, operationType: 'min', sourceField: 'bytes' },
    'aggMin',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes' },
  ],
  [
    'maximum (metrics.tsx)',
    { ...base, operationType: 'max', sourceField: 'bytes' },
    'aggMax',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes' },
  ],
  [
    'median (metrics.tsx)',
    { ...base, operationType: 'median', sourceField: 'bytes' },
    'aggMedian',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes' },
  ],
  [
    'standard deviation, without bounds (metrics.tsx)',
    { ...base, operationType: 'standard_deviation', sourceField: 'bytes' },
    'aggStdDeviation',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes', showBounds: false },
  ],
  [
    'percentile (percentile.tsx)',
    { ...base, operationType: 'percentile', sourceField: 'bytes', params: { percentile: 95 } },
    'aggSinglePercentile',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes', percentile: 95 },
  ],
  [
    'percentile rank (percentile_ranks.tsx)',
    { ...base, operationType: 'percentile_rank', sourceField: 'bytes', params: { value: 1024 } },
    'aggSinglePercentileRank',
    { id: '1', enabled: true, schema: 'metric', field: 'bytes', value: 1024 },
  ],
  [
    'last value (last_value.tsx)',
    {
      ...base,
      operationType: 'last_value',
      sourceField: 'bytes',
      params: { sortField: '@timestamp', showArrayValues: false },
    },
    'aggTopMetrics',
    {
      id: '1',
      enabled: true,
      schema: 'metric',
      field: 'bytes',
      size: 1,
      sortOrder: 'desc',
      sortField: '@timestamp',
    },
  ],
  [
    'last value with array values (last_value.tsx)',
    {
      ...base,
      operationType: 'last_value',
      sourceField: 'tags',
      params: { sortField: '@timestamp', showArrayValues: true },
    },
    'aggTopHit',
    {
      id: '1',
      enabled: true,
      schema: 'metric',
      field: 'tags',
      size: 1,
      sortOrder: 'desc',
      sortField: '@timestamp',
      aggregate: 'concat',
    },
  ],
];

describe('toMetricAgg', () => {
  it.each(cases)('builds the agg Lens builds for %s', (_name, column, fn, args) => {
    const lensAgg = toMetricAgg(column as GenericIndexPatternColumn, '1');

    expect(lensAgg.fn).toBe(fn);
    expect(serializeAgg(lensAgg)).toEqual(kibanaAgg(fn, args));
  });

  it("keys aggs as Lens's getGroupByKey does: function, arguments, then time shift", () => {
    const sum = { ...base, operationType: 'sum', sourceField: 'bytes', params: {} };
    const median = { ...base, operationType: 'median', sourceField: 'bytes' };

    expect(toMetricAgg(sum, '1').groupKey).toBe('sum-aggSum-bytes-false-undefined');
    expect(toMetricAgg(sum, '2').groupKey).toBe(toMetricAgg(sum, '1').groupKey);
    expect(toMetricAgg(median, '1').groupKey).not.toBe(toMetricAgg(sum, '1').groupKey);
  });

  it('leaves percentile ranks unkeyed, since Lens never dedupes them', () => {
    expect(
      toMetricAgg(
        {
          ...base,
          operationType: 'percentile_rank',
          sourceField: 'bytes',
          params: { value: 1 },
        } as GenericIndexPatternColumn,
        '1'
      ).groupKey
    ).toBeUndefined();
  });
});
