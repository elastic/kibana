/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AvailableTotal {
  available: boolean;
  total: number;
}

interface StatusCounts {
  [statusType: string]: number;
}

interface StatusByAppCounts {
  [statusType: string]: {
    [appType: string]: number;
  };
}

export interface KeyCountBucket {
  key: string;
  doc_count: number;
}

export interface AggregationBuckets {
  doc_count?: number;
  doc_count_error_upper_bound?: number;
  sum_other_doc_count?: number;
  buckets?: any;
  pdf?: {
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
    buckets: KeyCountBucket[];
  };
}

/*
 * Mapped Types and Intersection Types
 */

type AggregationKeys = 'jobTypes' | 'layoutTypes' | 'objectTypes' | 'statusTypes' | 'statusByApp';
export type AggregationResultBuckets = { [K in AggregationKeys]: AggregationBuckets } & {
  doc_count: number;
};

export interface SearchResponse {
  aggregations: {
    ranges: {
      buckets: {
        all: AggregationResultBuckets;
        last7Days: AggregationResultBuckets;
        lastDay: AggregationResultBuckets;
      };
    };
  };
}

type BaseJobTypeKeys = 'csv' | 'PNG';
export type JobTypes = { [K in BaseJobTypeKeys]: AvailableTotal } & {
  printable_pdf: AvailableTotal & {
    app: {
      visualization: number;
      dashboard: number;
    };
    layout: {
      print: number;
      preserve_layout: number;
    };
  };
};

export type RangeStats = JobTypes & {
  _all: number;
  status: StatusCounts;
  status_by_app: StatusByAppCounts;
};

export type ExportType = 'csv' | 'printable_pdf' | 'PNG';
export type FeatureAvailabilityMap = { [F in ExportType]: boolean };

export type ReportingUsage = {
  available: boolean;
  enabled: boolean;
  browser_type: string;
  csv: AvailableTotal;
  PNG: AvailableTotal;
  printable_pdf: AvailableTotal;
  last7Days: RangeStats;
  lastDay: RangeStats;
} & RangeStats;
