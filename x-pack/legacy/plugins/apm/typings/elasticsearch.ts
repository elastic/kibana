/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap, IndexAsString } from './common';

export interface BoolQuery {
  must_not: Array<Record<string, any>>;
  should: Array<Record<string, any>>;
  filter: Array<Record<string, any>>;
}

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
    | 'extended_stats'
    | 'filter'
    | 'filters'
    | 'cardinality';

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

  type SubAggregation<T> = T extends { aggs: any }
    ? AggregationResultMap<T['aggs']>
    : {};

  // eslint-disable-next-line @typescript-eslint/prefer-interface
  type BucketAggregation<SubAggregationMap, KeyType = string> = {
    buckets: Array<
      {
        key: KeyType;
        key_as_string: string;
        doc_count: number;
      } & (SubAggregation<SubAggregationMap>)
    >;
  };

  type FilterAggregation<SubAggregationMap> = {
    doc_count: number;
  } & SubAggregation<SubAggregationMap>;

  // eslint-disable-next-line @typescript-eslint/prefer-interface
  type FiltersAggregation<SubAggregationMap> = {
    buckets: Array<
      {
        doc_count: number;
      } & SubAggregation<SubAggregationMap>
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
          min: number | null;
          max: number | null;
          avg: number | null;
          sum: number;
          sum_of_squares: number | null;
          variance: number | null;
          std_deviation: number | null;
          std_deviation_bounds: {
            upper: number | null;
            lower: number | null;
          };
        };
        filter: FilterAggregation<AggregationOption[AggregationName]>;
        filters: FiltersAggregation<AggregationOption[AggregationName]>;
        cardinality: {
          value: number;
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
          aggregations?: AggregationResultMap<SearchParams['body']['aggs']>;
        }
      : {});

  export interface ESFilter {
    [key: string]: {
      [key: string]: string | string[] | number | StringMap | ESFilter[];
    };
  }
}
