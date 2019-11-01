/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import {
  InfraMetric,
  InfraMetricData,
  InfraNodeType,
  InfraTimerangeInput,
} from '../../../graphql/types';
import { InfraSourceConfiguration } from '../../sources';

export interface InfraMetricsRequestOptions {
  nodeIds: {
    nodeId: string;
    cloudId?: string | null;
  };
  nodeType: InfraNodeType;
  sourceConfiguration: InfraSourceConfiguration;
  timerange: InfraTimerangeInput;
  metrics: InfraMetric[];
}

export interface InfraMetricsAdapter {
  getMetrics(
    requestContext: RequestHandlerContext,
    options: InfraMetricsRequestOptions,
    request: KibanaRequest // NP_TODO: temporarily needed until metrics getVisData no longer needs full request
  ): Promise<InfraMetricData[]>;
}

export enum InfraMetricModelQueryType {
  lucene = 'lucene',
  kuery = 'kuery',
}

export enum InfraMetricModelMetricType {
  avg = 'avg',
  max = 'max',
  min = 'min',
  calculation = 'calculation',
  cardinality = 'cardinality',
  series_agg = 'series_agg', // eslint-disable-line @typescript-eslint/camelcase
  positive_only = 'positive_only', // eslint-disable-line @typescript-eslint/camelcase
  derivative = 'derivative',
  count = 'count',
  sum = 'sum',
  cumulative_sum = 'cumulative_sum', // eslint-disable-line @typescript-eslint/camelcase
}

export interface InfraMetricModel {
  id: InfraMetric;
  requires: string[];
  index_pattern: string | string[];
  interval: string;
  time_field: string;
  type: string;
  series: InfraMetricModelSeries[];
  filter?: string;
  map_field_to?: string;
  id_type?: 'cloud' | 'node';
}

export interface InfraMetricModelSeries {
  id: string;
  metrics: InfraMetricModelMetric[];
  split_mode: string;
  terms_field?: string;
  terms_size?: number;
  terms_order_by?: string;
  filter?: { query: string; language: InfraMetricModelQueryType };
}

export interface InfraMetricModelBasicMetric {
  id: string;
  field?: string | null;
  type: InfraMetricModelMetricType;
}

export interface InfraMetricModelSeriesAgg {
  id: string;
  function: string;
  type: InfraMetricModelMetricType.series_agg; // eslint-disable-line @typescript-eslint/camelcase
}

export interface InfraMetricModelDerivative {
  id: string;
  field: string;
  unit: string;
  type: InfraMetricModelMetricType;
}

export interface InfraMetricModelBucketScriptVariable {
  field: string;
  id: string;
  name: string;
}

export interface InfraMetricModelCount {
  id: string;
  type: InfraMetricModelMetricType.count;
}

export interface InfraMetricModelBucketScript {
  id: string;
  script: string;
  type: InfraMetricModelMetricType.calculation;
  variables: InfraMetricModelBucketScriptVariable[];
}

export type InfraMetricModelMetric =
  | InfraMetricModelCount
  | InfraMetricModelBasicMetric
  | InfraMetricModelBucketScript
  | InfraMetricModelDerivative
  | InfraMetricModelSeriesAgg;

export type InfraMetricModelCreator = (
  timeField: string,
  indexPattern: string | string[],
  interval: string
) => InfraMetricModel;
