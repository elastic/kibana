/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/es-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { TimeBucketsInterval } from '@kbn/ml-time-buckets';

export interface RandomSamplingOption {
  mode: 'random_sampling';
  seed: string;
  probability: number;
}

export interface NormalSamplingOption {
  mode: 'normal_sampling';
  seed: string;
  shardSize: number;
}

export interface NoSamplingOption {
  mode: 'no_sampling';
  seed: string;
}

export type SamplingOption = RandomSamplingOption | NormalSamplingOption | NoSamplingOption;

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
  safeFieldName: string;
}

export interface Distribution {
  percentiles: Array<{ value?: number; percent: number; minValue: number; maxValue: number }>;
  minPercentile: number;
  maxPercentile: number;
}

export interface Bucket {
  doc_count: number;
}

export interface FieldStatsError {
  fieldName?: string;
  fields?: Field[];
  error: Error;
}

export const isIKibanaSearchResponse = (arg: unknown): arg is IKibanaSearchResponse => {
  return isPopulatedObject(arg, ['rawResponse']);
};

export interface NonSampledNumericFieldStats {
  fieldName: string;
  count?: number;
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  distribution?: Distribution;
}

export interface NumericFieldStats extends NonSampledNumericFieldStats {
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
}

export interface StringFieldStats {
  fieldName: string;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  sampledValues?: Bucket[];
  topValuesSampleSize?: number;
  topValuesSamplerShardSize?: number;
  /**
   * Approximate: true for when the terms are from a random subset of the source data
   * such that result/count for each term is not deterministic every time
   */
  approximate?: boolean;
}

export interface DateFieldStats {
  fieldName: string;
  count: number;
  earliest: number;
  latest: number;
}

export interface BooleanFieldStats {
  fieldName: string;
  count: number;
  trueCount: number;
  falseCount: number;
  topValues: Bucket[];
  topValuesSampleSize: number;
}

export interface DocumentCountStats {
  interval?: number;
  buckets?: { [key: string]: number };
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  totalCount: number;
  probability?: number | null;
  took?: number;
  randomlySampled?: boolean;
}

export interface FieldExamples {
  fieldName: string;
  examples: unknown[];
}

export type FieldStats =
  | NonSampledNumericFieldStats
  | NumericFieldStats
  | StringFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | FieldExamples
  | FieldStatsError;

export interface FieldStatsCommonRequestParams {
  index: string;
  projectRouting?: string;
  timeFieldName?: string;
  earliestMs?: number | string | undefined;
  latestMs?: number | string | undefined;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  intervalMs?: number;
  query: estypes.QueryDslQueryContainer;
  maxExamples?: number;
  samplingProbability: number | null;
  browserSessionSeed: number;
  samplingOption: SamplingOption;
  embeddableExecutionContext?: KibanaExecutionContext;
}

export type SupportedAggs = Set<string>;

export interface OverallStatsSearchStrategyParams {
  sessionId?: string;
  earliest?: number | string;
  latest?: number | string;
  aggInterval: TimeBucketsInterval;
  intervalMs?: number;
  searchQuery: Query['query'];
  index: string;
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  projectRouting?: string;
  aggregatableFields: Array<{
    name: string;
    supportedAggs: SupportedAggs;
  }>;
  nonAggregatableFields: string[];
  fieldsToFetch?: string[];
  browserSessionSeed: number;
  samplingOption: SamplingOption;
  embeddableExecutionContext?: KibanaExecutionContext;
}

export interface FieldStatsSearchStrategyReturnBase {
  progress: DataStatsFetchProgress;
  fieldStats: Map<string, FieldStats> | undefined;
  startFetch: () => void;
  cancelFetch: () => void;
}

export interface DataStatsFetchProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
}

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
  safeFieldName: string;
  supportedAggs?: Set<string>;
}

export interface Aggs {
  [key: string]: estypes.AggregationsAggregationContainer;
}

export function isRandomSamplingOption(arg: SamplingOption): arg is RandomSamplingOption {
  return arg.mode === 'random_sampling';
}
export function isNormalSamplingOption(arg: SamplingOption): arg is NormalSamplingOption {
  return arg.mode === 'normal_sampling';
}
