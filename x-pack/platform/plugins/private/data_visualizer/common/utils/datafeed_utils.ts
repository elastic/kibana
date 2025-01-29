/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type Datafeed = estypes.MlDatafeed;
export type Aggregation = Record<string, estypes.AggregationsAggregationContainer>;

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
