/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface KeyCountBucket {
  key: string;
  doc_count: number;
}

export interface AggregationBuckets {
  buckets: KeyCountBucket[];
}

export interface AggregationResultBuckets {
  jobTypes: AggregationBuckets;
  layoutTypes: {
    doc_count: number;
    pdf: AggregationBuckets;
  };
  objectTypes: {
    doc_count: number;
    pdf: AggregationBuckets;
  };
  statusTypes: AggregationBuckets;
  statusByApp: {
    buckets: Array<{
      key: string;
      doc_count: number;
      appNames: {
        buckets: Array<{
          doc_count: number;
          key: string;
          jobType: AggregationBuckets;
        }>;
      };
    }>;
  };
  doc_count: number;
}

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

export interface AvailableTotal {
  available: boolean;
  total: number;
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

interface StatusCounts {
  [statusType: string]: number;
}

interface StatusByAppCounts {
  [statusType: string]: {
    [appType: string]: number;
  };
}

export type RangeStats = JobTypes & {
  _all: number;
  status: StatusCounts;
  status_by_app: StatusByAppCounts;
};

export type ExportType = 'csv' | 'printable_pdf' | 'PNG';
export type FeatureAvailabilityMap = { [F in ExportType]: boolean };

export interface StatusByAppBucket {
  key: string;
  appNames: { key: string; buckets: KeyCountBucket[] };
}
