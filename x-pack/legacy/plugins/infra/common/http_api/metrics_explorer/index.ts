/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const METRIC_EXPLORER_AGGREGATIONS = [
  'avg',
  'max',
  'min',
  'cardinality',
  'rate',
  'count',
] as const;

type MetricExplorerAggregations = typeof METRIC_EXPLORER_AGGREGATIONS[number];

const metricsExplorerAggregationKeys = METRIC_EXPLORER_AGGREGATIONS.reduce<
  Record<MetricExplorerAggregations, null>
>((acc, agg) => ({ ...acc, [agg]: null }), {} as Record<MetricExplorerAggregations, null>);

export const metricsExplorerAggregationRT = rt.keyof(metricsExplorerAggregationKeys);

export const metricsExplorerMetricRequiredFieldsRT = rt.type({
  aggregation: metricsExplorerAggregationRT,
});

export const metricsExplorerMetricOptionalFieldsRT = rt.partial({
  field: rt.union([rt.string, rt.undefined]),
});

export const metricsExplorerMetricRT = rt.intersection([
  metricsExplorerMetricRequiredFieldsRT,
  metricsExplorerMetricOptionalFieldsRT,
]);

export const timeRangeRT = rt.type({
  field: rt.string,
  from: rt.number,
  to: rt.number,
  interval: rt.string,
});

export const metricsExplorerRequestBodyRequiredFieldsRT = rt.type({
  timerange: timeRangeRT,
  indexPattern: rt.string,
  metrics: rt.array(metricsExplorerMetricRT),
});

export const metricsExplorerRequestBodyOptionalFieldsRT = rt.partial({
  groupBy: rt.union([rt.string, rt.null, rt.undefined]),
  afterKey: rt.union([rt.string, rt.null, rt.undefined]),
  limit: rt.union([rt.number, rt.null, rt.undefined]),
  filterQuery: rt.union([rt.string, rt.null, rt.undefined]),
});

export const metricsExplorerRequestBodyRT = rt.intersection([
  metricsExplorerRequestBodyRequiredFieldsRT,
  metricsExplorerRequestBodyOptionalFieldsRT,
]);

export const metricsExplorerPageInfoRT = rt.type({
  total: rt.number,
  afterKey: rt.union([rt.string, rt.null]),
});

export const metricsExplorerColumnTypeRT = rt.keyof({
  date: null,
  number: null,
  string: null,
});

export const metricsExplorerColumnRT = rt.type({
  name: rt.string,
  type: metricsExplorerColumnTypeRT,
});

export const metricsExplorerRowRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.record(rt.string, rt.union([rt.string, rt.number, rt.null, rt.undefined])),
]);

export const metricsExplorerSeriesRT = rt.type({
  id: rt.string,
  columns: rt.array(metricsExplorerColumnRT),
  rows: rt.array(metricsExplorerRowRT),
});

export const metricsExplorerResponseRT = rt.type({
  series: rt.array(metricsExplorerSeriesRT),
  pageInfo: metricsExplorerPageInfoRT,
});
