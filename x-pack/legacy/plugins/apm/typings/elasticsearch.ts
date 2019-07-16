/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap, IndexAsString } from './common';

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations

  type AggregationType =
    | 'date_histogram'
    | 'histogram'
    | 'terms'
    | 'avg'
    | 'top_hits'
    | 'max'
    | 'min'
    | 'percentiles'
    | 'sum'
    | 'extended_stats';

  type AggOptions = AggregationOptionMap & {
    [key: string]: any;
  };

  // eslint-disable-next-line @typescript-eslint/prefer-interface
  export type AggregationOptionMap = {
    aggs?: {
      [aggregationName: string]: {
        [T in AggregationType]?: AggOptions & AggregationOptionMap;
      };
    };
  };

  // eslint-disable-next-line @typescript-eslint/prefer-interface
  type BucketAggregation<SubAggregationMap, KeyType = string> = {
    buckets: Array<
      {
        key: KeyType;
        key_as_string: string;
        doc_count: number;
      } & (SubAggregationMap extends { aggs: any }
        ? AggregationResultMap<SubAggregationMap['aggs']>
        : {})
    >;
  };

  interface AggregatedValue {
    value: number | null;
  }

  type AggregationResultMap<AggregationOption> = IndexAsString<
    {
      [AggregationName in keyof AggregationOption]: {
        avg: AggregatedValue;
        max: AggregatedValue;
        min: AggregatedValue;
        sum: AggregatedValue;
        terms: BucketAggregation<AggregationOption[AggregationName]>;
        date_histogram: BucketAggregation<
          AggregationOption[AggregationName],
          number
        >;
        histogram: BucketAggregation<
          AggregationOption[AggregationName],
          number
        >;
        top_hits: {
          hits: {
            total: number;
            max_score: number | null;
            hits: Array<{
              _source: AggregationOption[AggregationName] extends {
                Mapping: any;
              }
                ? AggregationOption[AggregationName]['Mapping']
                : never;
            }>;
          };
        };
        percentiles: {
          values: {
            [key: string]: number;
          };
        };
        extended_stats: {
          count: number;
          min: number;
          max: number;
          avg: number;
          sum: number;
          sum_of_squares: number;
          variance: number;
          std_deviation: number;
          std_deviation_bounds: {
            upper: number;
            lower: number;
          };
        };
      }[AggregationType & keyof AggregationOption[AggregationName]];
    }
  >;

  export type AggregationSearchResponse<HitType, SearchParams> = Pick<
    SearchResponse<HitType>,
    Exclude<keyof SearchResponse<HitType>, 'aggregations'>
  > &
    (SearchParams extends { body: Required<AggregationOptionMap> }
      ? {
          aggregations: AggregationResultMap<SearchParams['body']['aggs']>;
        }
      : {});

  export interface ESFilter {
    [key: string]: {
      [key: string]: string | string[] | number | StringMap | ESFilter[];
    };
  }
}
