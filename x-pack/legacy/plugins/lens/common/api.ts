/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BucketedAggregation<KeyType = string> {
  buckets: Array<{
    key: KeyType;
    count: number;
  }>;
}

export interface NumberStatsResult {
  count: number;
  histogram: BucketedAggregation<number>;
  topValues: BucketedAggregation<number>;
}

export interface TopValuesResult {
  count: number;
  topValues: BucketedAggregation<string>;
}

export interface FieldStatsResponse<KeyType> {
  count?: number;
  histogram?: BucketedAggregation<KeyType>;
  topValues?: BucketedAggregation<KeyType>;
}
