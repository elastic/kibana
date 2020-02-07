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

export interface KeyCountBucket {
  key: string;
  doc_count: number;
}

export interface AggregationBuckets {
  buckets: KeyCountBucket[];
  pdf?: {
    buckets: KeyCountBucket[];
  };
}

/*
 * Mapped Types and Intersection Types
 */

type AggregationKeys = 'jobTypes' | 'layoutTypes' | 'objectTypes' | 'statusTypes';
export type AggregationResults = { [K in AggregationKeys]: AggregationBuckets } & {
  doc_count: number;
};

type RangeAggregationKeys = 'all' | 'lastDay' | 'last7Days';
export type RangeAggregationResults = { [K in RangeAggregationKeys]?: AggregationResults };

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
};

export type ExportType = 'csv' | 'printable_pdf' | 'PNG';
export type FeatureAvailabilityMap = { [F in ExportType]: boolean };
