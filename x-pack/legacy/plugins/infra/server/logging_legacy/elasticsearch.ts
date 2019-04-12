/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MSearchParams, MSearchResponse, SearchParams, SearchResponse } from 'elasticsearch';

export interface ESCluster {
  callWithRequest(
    request: any,
    endpoint: 'msearch',
    clientOptions: MSearchParams,
    options?: object
  ): Promise<MSearchResponse<object>>;
  callWithRequest(
    request: any,
    endpoint: 'search',
    clientOptions: SearchParams,
    options?: object
  ): Promise<SearchResponse<object>>;
  callWithRequest(
    request: any,
    endpoint: string,
    clientOptions?: object,
    options?: object
  ): Promise<never>;
}

export type Hit = SearchResponse<object>['hits']['hits'][0];

export interface SortedHit extends Hit {
  sort: any[];
  _source: {
    [field: string]: any;
  };
}

export interface HighlightedHit extends SortedHit {
  highlight?: {
    [field: string]: string[];
  };
}

export const isHighlightedHit = (hit: Hit): hit is HighlightedHit => !!hit.highlight;

export interface DateHistogramBucket {
  key: number;
  key_as_string: string;
  doc_count: number;
}

export interface HitsBucket {
  hits: {
    total: number;
    max_score: number | null;
    hits: SortedHit[];
  };
}

export interface DateHistogramResponse {
  buckets: DateHistogramBucket[];
}

export type WithSubAggregation<
  SubAggregationType,
  SubAggregationName extends string,
  BucketType
> = BucketType & { [subAggregationName in SubAggregationName]: SubAggregationType };

export const isBucketWithAggregation = <
  SubAggregationType extends object,
  SubAggregationName extends string = any,
  BucketType extends object = {}
>(
  bucket: BucketType,
  aggregationName: SubAggregationName
): bucket is WithSubAggregation<SubAggregationType, SubAggregationName, BucketType> =>
  aggregationName in bucket;
