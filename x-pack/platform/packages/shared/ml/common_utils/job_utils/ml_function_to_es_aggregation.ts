/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_AGGREGATION } from '@kbn/ml-anomaly-utils/es_aggregation';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils/aggregation_types';

// Takes an ML detector 'function' and returns the corresponding ES aggregation name
// for querying metric data. Returns null if there is no suitable ES aggregation.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
export function mlFunctionToESAggregation(
  functionName?: ML_JOB_AGGREGATION | string
): ES_AGGREGATION | null {
  if (
    functionName === ML_JOB_AGGREGATION.MEAN ||
    functionName === ML_JOB_AGGREGATION.HIGH_MEAN ||
    functionName === ML_JOB_AGGREGATION.LOW_MEAN ||
    functionName === ML_JOB_AGGREGATION.METRIC
  ) {
    return ES_AGGREGATION.AVG;
  }

  if (
    functionName === ML_JOB_AGGREGATION.SUM ||
    functionName === ML_JOB_AGGREGATION.HIGH_SUM ||
    functionName === ML_JOB_AGGREGATION.LOW_SUM ||
    functionName === ML_JOB_AGGREGATION.NON_NULL_SUM ||
    functionName === ML_JOB_AGGREGATION.LOW_NON_NULL_SUM ||
    functionName === ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM
  ) {
    return ES_AGGREGATION.SUM;
  }

  if (
    functionName === ML_JOB_AGGREGATION.COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_COUNT ||
    functionName === ML_JOB_AGGREGATION.NON_ZERO_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT
  ) {
    return ES_AGGREGATION.COUNT;
  }

  if (
    functionName === ML_JOB_AGGREGATION.DISTINCT_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_DISTINCT_COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_DISTINCT_COUNT
  ) {
    return ES_AGGREGATION.CARDINALITY;
  }

  if (
    functionName === ML_JOB_AGGREGATION.MEDIAN ||
    functionName === ML_JOB_AGGREGATION.HIGH_MEDIAN ||
    functionName === ML_JOB_AGGREGATION.LOW_MEDIAN
  ) {
    return ES_AGGREGATION.PERCENTILES;
  }

  if (functionName === ML_JOB_AGGREGATION.MIN || functionName === ML_JOB_AGGREGATION.MAX) {
    return functionName as unknown as ES_AGGREGATION;
  }

  if (functionName === ML_JOB_AGGREGATION.RARE) {
    return ES_AGGREGATION.COUNT;
  }

  // Return null if ML function does not map to an ES aggregation.
  // i.e. median, low_median, high_median, freq_rare,
  // varp, low_varp, high_varp, time_of_day, time_of_week, lat_long,
  // info_content, low_info_content, high_info_content
  return null;
}
