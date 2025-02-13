/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Aggregation, Datafeed } from '../types/anomaly_detection_jobs';

export function getAggregations<T>(obj: any): T | undefined {
  if (obj?.aggregations !== undefined) return obj.aggregations;
  if (obj?.aggs !== undefined) return obj.aggs;
  return undefined;
}

export const getDatafeedAggregations = (
  datafeedConfig: Partial<Datafeed> | undefined
): Aggregation | undefined => {
  return getAggregations<Aggregation>(datafeedConfig);
};

export function getIndicesOptions(datafeedConfig?: Datafeed) {
  // remove ignore_throttled from indices_options to avoid deprecation warnings in the logs
  return datafeedConfig?.indices_options
    ? omit(datafeedConfig.indices_options, 'ignore_throttled')
    : {};
}
