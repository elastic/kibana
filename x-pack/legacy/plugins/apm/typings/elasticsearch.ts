/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { StringMap } from './common';
import { Aggregations } from '../public/es/aggregations';

export interface BoolQuery {
  must_not: Array<Record<string, any>>;
  should: Array<Record<string, any>>;
  filter: Array<Record<string, any>>;
}

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations

  // type AggregationType =
  //   | 'percentiles'

  export type APMSearchParams = Omit<SearchParams, 'body'> & {
    body: {
      query?: any;
      size?: number;
      aggs?: AggsInput;
    };
  };

  export type APMSearchResponse<
    T extends APMSearchParams,
    U extends t.Type<any, any, any> = t.NullType
  > = (Omit<
    SearchResponse<GetRight<ReturnType<U['decode']>>>,
    'aggregations'
  >) &
    ({
      hits: {
        hits: Array<{ _source: GetRight<ReturnType<U['decode']>> }>;
      };
    }) &
    (T extends { body: { aggs: AggsInput } }
      ? {
          aggregations: AggregationResponseMap<T['body']['aggs']>;
        }
      : {});

  export interface ESFilter {
    [key: string]: {
      [key: string]: string | string[] | number | StringMap | ESFilter[];
    };
  }

  export type APMAggregationInput = AggsInput;
  export type APMAggregationInputTypes = AggregationInputTypes;
}

interface SubAggregationMergeStrategies<T extends AggsInput, U> {
  bucket: U extends { buckets: Array<infer V> }
    ? (Omit<U, 'buckets'> & {
        buckets: Array<V & AggregationResponseMap<T>>;
      })
    : never;
}

type AggregationInputTypes = {
  [key in keyof Aggregations]: t.TypeOf<Aggregations[key]['in']>;
};

type AggsInput = Partial<
  Record<string, Partial<AggregationInputTypes> & { aggs?: AggsInput }>
>;

type GetRight<T> = T extends Either<any, infer R> ? R : never;

type AggregationResponseValue<T extends keyof Aggregations> = GetRight<
  ReturnType<Aggregations[T]['out']['decode']>
>;

type AggregationResponse<
  T extends keyof Aggregations,
  U extends { aggs?: AggsInput } | undefined
> = U extends { aggs: AggsInput }
  ? (Aggregations[T] extends {
      aggs: keyof SubAggregationMergeStrategies<
        U['aggs'],
        AggregationResponseValue<T>
      >;
    }
      ? SubAggregationMergeStrategies<
          U['aggs'],
          AggregationResponseValue<T>
        >[Aggregations[T]['aggs']]
      : never)
  : AggregationResponseValue<T>;

type AggregationResponseMap<
  T extends AggsInput | undefined
> = T extends AggsInput
  ? {
      [aggregationName in keyof T]: AggregationResponse<
        keyof Aggregations & keyof T[aggregationName],
        T[aggregationName]
      >;
    }
  : {};
