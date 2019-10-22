/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap, IndexAsString } from './common';

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations

  type ESSearchHit<T> = SearchResponse<T>['hits']['hits'][0];

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
    | 'cardinality'
    | 'sampler'
    | 'value_count'
    | 'derivative'
    | 'bucket_script';

  type AggOptions = AggregationOptionMap & {
    [key: string]: any;
  };

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type FiltersAggregation<SubAggregationMap> = {
    // The filters aggregation can have named filters or anonymous filters,
    // which changes the structure of the return
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-filters-aggregation.html
    buckets: SubAggregationMap extends {
      filters: { filters: Record<string, unknown> };
    }
      ? {
          [key in keyof SubAggregationMap['filters']['filters']]: {
            doc_count: number;
          } & SubAggregation<SubAggregationMap>;
        }
      : Array<
          {
            doc_count: number;
          } & SubAggregation<SubAggregationMap>
        >;
  };

  type SamplerAggregation<SubAggregationMap> = SubAggregation<
    SubAggregationMap
  > & {
    doc_count: number;
  };

  interface AggregatedValue {
    value: number | null;
  }

  interface HitsTotal {
    value: number;
    relation: 'eq' | 'gte';
  }

  type AggregationResultMap<AggregationOption> = IndexAsString<
    {
      [AggregationName in keyof AggregationOption]: {
        avg: AggregatedValue;
        max: AggregatedValue;
        min: AggregatedValue;
        sum: AggregatedValue;
        value_count: AggregatedValue;
        // Elasticsearch might return terms with numbers, but this is a more limited type
        terms: BucketAggregation<AggregationOption[AggregationName], string>;
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
            total: HitsTotal;
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
        sampler: SamplerAggregation<AggregationOption[AggregationName]>;
        derivative: BucketAggregation<
          AggregationOption[AggregationName],
          number
        >;
        bucket_script: {
          value: number | null;
        };
      }[AggregationType & keyof AggregationOption[AggregationName]];
    }
  >;

  export type AggregationSearchResponseWithTotalHitsAsInt<
    HitType,
    SearchParams
  > = Pick<
    SearchResponse<HitType>,
    Exclude<keyof SearchResponse<HitType>, 'aggregations'>
  > &
    (SearchParams extends { body: Required<AggregationOptionMap> }
      ? {
          aggregations?: AggregationResultMap<SearchParams['body']['aggs']>;
        }
      : {});

  type Hits<HitType> = Pick<
    SearchResponse<HitType>['hits'],
    Exclude<keyof SearchResponse<HitType>['hits'], 'total'>
  > & {
    total: HitsTotal;
  };

  export type AggregationSearchResponseWithTotalHitsAsObject<
    HitType,
    SearchParams
  > = Pick<
    AggregationSearchResponseWithTotalHitsAsInt<HitType, SearchParams>,
    Exclude<
      keyof AggregationSearchResponseWithTotalHitsAsInt<HitType, SearchParams>,
      'hits'
    >
  > & { hits: Hits<HitType> };

  export interface ESFilter {
    [key: string]: {
      [key: string]: string | string[] | number | StringMap | ESFilter[];
    };
  }
}
