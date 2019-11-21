/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ML_JOB_AGGREGATION {
  // count
  COUNT = 'count',
  HIGH_COUNT = 'high_count',
  LOW_COUNT = 'low_count',
  NON_ZERO_COUNT = 'non_zero_count',
  HIGH_NON_ZERO_COUNT = 'high_non_zero_count',
  LOW_NON_ZERO_COUNT = 'low_non_zero_count',
  DISTINCT_COUNT = 'distinct_count',
  HIGH_DISTINCT_COUNT = 'high_distinct_count',
  LOW_DISTINCT_COUNT = 'low_distinct_count',

  // metric
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  LOW_MEDIAN = 'low_median',
  HIGH_MEAN = 'high_mean',
  MEAN = 'mean',
  LOW_MEAN = 'low_mean',
  HIGH_MEDIAN = 'high_median',
  METRIC = 'metric',
  VARP = 'varp',
  HIGH_VARP = 'high_varp',
  LOW_VARP = 'low_varp',

  // sum
  SUM = 'sum',
  HIGH_SUM = 'high_sum',
  LOW_SUM = 'low_sum',
  NON_NULL_SUM = 'non_null_sum',
  HIGH_NON_NULL_SUM = 'high_non_null_sum',
  LOW_NON_NULL_SUM = 'low_non_null_sum',

  // rare
  RARE = 'rare',
  FREQ_RARE = 'freq_rare',

  // information content
  INFO_CONTENT = 'info_content',
  HIGH_INFO_CONTENT = 'high_info_content',
  LOW_INFO_CONTENT = 'low_info_content',

  // time
  TIME_OF_DAY = 'time_of_day',
  TIME_OF_WEEK = 'time_of_week',

  // geo
  LAT_LONG = 'lat_long',
}

export const SPARSE_DATA_AGGREGATIONS = [
  ML_JOB_AGGREGATION.NON_ZERO_COUNT,
  ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT,
  ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT,
  ML_JOB_AGGREGATION.NON_NULL_SUM,
  ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM,
  ML_JOB_AGGREGATION.LOW_NON_NULL_SUM,
];

export enum KIBANA_AGGREGATION {
  COUNT = 'count',
  AVG = 'avg',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  MEDIAN = 'median',
  CARDINALITY = 'cardinality',
}

export enum ES_AGGREGATION {
  COUNT = 'count',
  AVG = 'avg',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  PERCENTILES = 'percentiles',
  CARDINALITY = 'cardinality',
}
