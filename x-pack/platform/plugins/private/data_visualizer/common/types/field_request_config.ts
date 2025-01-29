/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedFieldType } from '.';

export interface Percentile {
  percent: number;
  minValue: number;
  maxValue: number;
}

export interface FieldRequestConfig {
  fieldName: string;
  type: SupportedFieldType;
  cardinality: number;
  existsInDocs: boolean;
  supportedAggs?: Set<string>;
}

export interface DocumentCountBuckets {
  [key: string]: number;
}

export interface DocumentCounts {
  buckets?: DocumentCountBuckets;
  interval?: number;
}

export interface LatLongExample {
  lat: number;
  lon: number;
}

export interface GeoPointExample {
  coordinates: number[];
  type?: string;
}

export interface FieldVisStats {
  totalDocuments?: number;
  error?: Error;
  cardinality?: number;
  count?: number;
  sampleCount?: number;
  trueCount?: number;
  falseCount?: number;
  earliest?: number;
  latest?: number;
  documentCounts?: {
    buckets?: DocumentCountBuckets;
    interval?: number;
  };
  avg?: number;
  distribution?: {
    percentiles: Percentile[];
    maxPercentile: number;
    minPercentile: 0;
  };
  fieldName?: string;
  isTopValuesSampled?: boolean;
  topValuesSampleSize?: number;
  max?: number;
  median?: number;
  min?: number;
  sampledValues?: Array<{
    key: number | string;
    doc_count: number;
    percent: number;
    key_as_string?: string;
  }>;
  topValues?: Array<{
    key: number | string;
    doc_count: number;
    percent: number;
    key_as_string?: string;
  }>;
  examples?: Array<string | GeoPointExample | object>;
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  approximate?: boolean;
}

export interface DVErrorObject {
  causedBy?: string;
  message: string;
  statusCode?: number;
  fullError?: Error;
}
