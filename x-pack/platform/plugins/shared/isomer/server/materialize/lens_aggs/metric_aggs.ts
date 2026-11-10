/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import type {
  CardinalityIndexPatternColumn,
  CountIndexPatternColumn,
  GenericIndexPatternColumn,
  LastValueIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  SumIndexPatternColumn,
} from '@kbn/lens-common';
import { LENS_DOCUMENT_FIELD_NAME, isColumnOfType } from '@kbn/lens-common';

/** The arguments of a data plugin `agg*` expression function. */
export type AggArgs = Record<string, string | number | boolean | number[] | undefined> & {
  id: string;
  enabled: boolean;
  schema: string;
};

/** The `agg*` function call Lens builds for a column, and the key Lens dedupes it by. */
export interface LensAgg {
  /** The data plugin function, such as `aggAvg`. */
  fn: string;
  args: AggArgs;
  /** Aggs with the same key are one agg, as Lens's `dedupeAggs` merges them. */
  groupKey?: string;
}

/** The agg types the data plugin's `agg*` functions serialize to. */
const AGG_TYPES: Readonly<Record<string, string>> = {
  aggAvg: 'avg',
  aggCardinality: 'cardinality',
  aggCount: 'count',
  aggMax: 'max',
  aggMedian: 'median',
  aggMin: 'min',
  aggPercentiles: 'percentiles',
  aggSinglePercentile: 'single_percentile',
  aggSinglePercentileRank: 'single_percentile_rank',
  aggStdDeviation: 'std_dev',
  aggSum: 'sum',
  aggTopHit: 'top_hits',
  aggTopMetrics: 'top_metrics',
  aggValueCount: 'value_count',
};

/**
 * The agg config the data plugin's `fn` function serializes for `args`. Undefined arguments are
 * left out, as `buildExpressionFunction` leaves them out of the expression.
 */
export const serializeAgg = ({
  fn,
  args: { id, enabled, schema, ...params },
}: Pick<LensAgg, 'fn' | 'args'>): AggConfigSerialized => ({
  id,
  enabled,
  schema,
  type: AGG_TYPES[fn],
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
});

/** Lens's `getGroupByKey`: the function, its distinguishing arguments, then the time shift. */
const groupKey = (
  operationType: string,
  fn: string,
  args: Record<string, unknown>,
  keyArgs: Array<{ name: string; transform?: (value: unknown) => string }>
): string =>
  [
    operationType,
    fn,
    ...keyArgs.map(({ name, transform }) => (transform ? transform(args[name]) : args[name])),
    args.timeShift,
  ]
    .map(String)
    .join('-');

const asBoolean = (value: unknown) => String(Boolean(value));

const metricAgg = (
  operationType: string,
  fn: string,
  aggId: string,
  args: Record<string, string | number | boolean | undefined>,
  keyArgs?: Array<{ name: string; transform?: (value: unknown) => string }>
): LensAgg => ({
  fn,
  args: { id: aggId, enabled: true, schema: 'metric', ...args },
  ...(keyArgs ? { groupKey: groupKey(operationType, fn, args, keyArgs) } : {}),
});

const FIELD_AND_EMPTY_AS_NULL = [
  { name: 'field' },
  { name: 'emptyAsNull', transform: asBoolean },
] as const;

/** The data plugin functions of Lens's `buildMetricOperation` operations, from `metrics.tsx`. */
const BASIC_METRIC_FNS: Readonly<Record<string, string>> = {
  min: 'aggMin',
  max: 'aggMax',
  average: 'aggAvg',
  sum: 'aggSum',
  median: 'aggMedian',
  standard_deviation: 'aggStdDeviation',
};

/** The metric operations whose agg Lens builds with `toEsAggsFn`. */
export const METRIC_OPERATIONS: ReadonlySet<string> = new Set([
  'count',
  'unique_count',
  'last_value',
  'percentile',
  'percentile_rank',
  ...Object.keys(BASIC_METRIC_FNS),
]);

/**
 * The agg Lens's `toEsAggsFn` builds for a metric column, from each operation's definition in
 * `lens/public/datasources/form_based/operations/definitions`.
 */
export const toMetricAgg = (column: GenericIndexPatternColumn, aggId: string): LensAgg => {
  // Lens moves a filtered column's time shift onto the agg that wraps it.
  const timeShift = column.filter ? undefined : column.timeShift;

  if (isColumnOfType<CountIndexPatternColumn>('count', column)) {
    const isDocumentCount = column.sourceField === LENS_DOCUMENT_FIELD_NAME;
    return metricAgg(
      column.operationType,
      isDocumentCount ? 'aggCount' : 'aggValueCount',
      aggId,
      {
        ...(isDocumentCount ? {} : { field: column.sourceField }),
        timeShift: column.filter || column.reducedTimeRange ? undefined : column.timeShift,
        emptyAsNull: column.params?.emptyAsNull,
      },
      [...FIELD_AND_EMPTY_AS_NULL]
    );
  }
  if (isColumnOfType<CardinalityIndexPatternColumn>('unique_count', column)) {
    return metricAgg(
      column.operationType,
      'aggCardinality',
      aggId,
      { field: column.sourceField, timeShift, emptyAsNull: column.params?.emptyAsNull },
      [...FIELD_AND_EMPTY_AS_NULL]
    );
  }
  if (isColumnOfType<PercentileIndexPatternColumn>('percentile', column)) {
    return metricAgg(
      column.operationType,
      'aggSinglePercentile',
      aggId,
      { field: column.sourceField, percentile: column.params.percentile, timeShift },
      [{ name: 'field' }, { name: 'percentile' }]
    );
  }
  if (isColumnOfType<PercentileRanksIndexPatternColumn>('percentile_rank', column)) {
    return metricAgg(column.operationType, 'aggSinglePercentileRank', aggId, {
      field: column.sourceField,
      value: column.params.value,
      timeShift,
    });
  }
  if (isColumnOfType<LastValueIndexPatternColumn>('last_value', column)) {
    const args = {
      field: column.sourceField,
      size: 1,
      sortOrder: 'desc',
      sortField: column.params.sortField,
      timeShift,
    };
    return column.params.showArrayValues
      ? metricAgg(column.operationType, 'aggTopHit', aggId, { ...args, aggregate: 'concat' }, [
          { name: 'field' },
          { name: 'sortField' },
        ])
      : metricAgg(column.operationType, 'aggTopMetrics', aggId, args, [
          { name: 'field' },
          { name: 'sortField' },
        ]);
  }
  const fn = BASIC_METRIC_FNS[column.operationType];
  if (fn && 'sourceField' in column) {
    return metricAgg(
      column.operationType,
      fn,
      aggId,
      {
        field: column.sourceField,
        timeShift,
        emptyAsNull: isColumnOfType<SumIndexPatternColumn>('sum', column)
          ? column.params?.emptyAsNull
          : undefined,
        ...(column.operationType === 'standard_deviation' ? { showBounds: false } : {}),
      },
      [...FIELD_AND_EMPTY_AS_NULL]
    );
  }
  throw new Error(`"${column.operationType}" is not a metric operation.`);
};
