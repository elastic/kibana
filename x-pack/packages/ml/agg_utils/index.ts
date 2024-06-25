/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { buildSamplerAggregation } from './src/build_sampler_aggregation';
export { fetchAggIntervals } from './src/fetch_agg_intervals';
export { fetchHistogramsForFields } from './src/fetch_histograms_for_fields';
export { DEFAULT_SAMPLER_SHARD_SIZE } from './src/field_histograms';
export { getSamplerAggregationsResponsePath } from './src/get_sampler_aggregations_response_path';
export { numberValidator } from './src/validate_number';

export type {
  FieldsForHistograms,
  NumericChartData,
  NumericHistogramField,
} from './src/fetch_histograms_for_fields';
export { isMultiBucketAggregate } from './src/is_multi_bucket_aggregate';
export { isSignificantItem } from './src/type_guards';
export { SIGNIFICANT_ITEM_TYPE } from './src/types';
export type {
  AggCardinality,
  SignificantItem,
  SignificantItemGroup,
  SignificantItemGroupItem,
  SignificantItemGroupHistogram,
  SignificantItemHistogram,
  SignificantItemHistogramItem,
  SignificantItemType,
  HistogramField,
  ItemSet,
  NumericColumnStats,
  NumericColumnStatsMap,
  FieldValuePair,
} from './src/types';
export type { NumberValidationResult } from './src/validate_number';
export {
  TIME_SERIES_METRIC_TYPES,
  isCounterTimeSeriesMetric,
  isGaugeTimeSeriesMetric,
} from './src/time_series_metric_fields';
