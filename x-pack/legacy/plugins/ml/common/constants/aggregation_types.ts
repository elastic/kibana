/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ML_JOB_AGGREGATION {
  COUNT = 'count',
  HIGH_COUNT = 'high_count',
  LOW_COUNT = 'low_count',
  MEAN = 'mean',
  HIGH_MEAN = 'high_mean',
  LOW_MEAN = 'low_mean',
  SUM = 'sum',
  HIGH_SUM = 'high_sum',
  LOW_SUM = 'low_sum',
  MEDIAN = 'median',
  HIGH_MEDIAN = 'high_median',
  LOW_MEDIAN = 'low_median',
  MIN = 'min',
  MAX = 'max',
  DISTINCT_COUNT = 'distinct_count',
  HIGH_DISTINCT_COUNT = 'high_distinct_count',
  LOW_DISTINCT_COUNT = 'low_distinct_count',
  NON_ZERO_COUNT = 'non_zero_count',
  HIGH_NON_ZERO_COUNT = 'high_non_zero_count',
  LOW_NON_ZERO_COUNT = 'low_non_zero_count',
}

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
