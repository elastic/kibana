/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MatrixHistogramOverTimeData } from '../../graphql/types';
import { FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface AlertsBucket {
  key: number;
  doc_count: number;
}

export interface AlertsGroupData {
  key: string;
  doc_count: number;
  alerts: {
    buckets: AlertsBucket[];
  };
}

interface AnomaliesOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AnomaliesActionGroupData {
  key: number;
  anomalies: {
    bucket: AnomaliesOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface AnomalySource {
  [field: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface AnomalyHit extends SearchHit {
  sort: string[];
  _source: AnomalySource;
  aggregations: {
    [agg: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

interface EventsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface EventsActionGroupData {
  key: number;
  events: {
    bucket: EventsOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface MatrixHistogramAdapter {
  getAlertsHistogramData(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
  getAnomaliesHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
  getAuthenticationsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
  getDnsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
  getEventsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData>;
}
