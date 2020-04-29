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

export interface StatusByAppBucket {
  key: string;
  doc_count: number;
  jobTypes: {
    buckets: Array<{
      doc_count: number;
      key: string;
      appNames: AggregationBuckets;
    }>;
  };
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
    buckets: StatusByAppBucket[];
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

type BaseJobTypes = 'csv' | 'PNG' | 'printable_pdf';
export type JobTypes = { [K in BaseJobTypes]: AvailableTotal } & {
  printable_pdf: AvailableTotal & {
    app: {
      'canvas workpad': number;
      dashboard: number;
      visualization: number;
    };
    layout: {
      print: number;
      preserve_layout: number;
    };
  };
};

export type Statuses =
  | 'cancelled'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'pending'
  | 'processing';
type StatusCounts = {
  [S in Statuses]?: number;
};

export type ExportType = 'csv' | 'printable_pdf' | 'PNG';
export type AppNames = 'canvas workpad' | 'dashboard' | 'visualization';
type StatusByAppCounts = {
  [S in Statuses]?: {
    [J in BaseJobTypes]?: {
      [A in AppNames]: number;
    };
  };
};

export type RangeStats = JobTypes & {
  _all: number;
  status: StatusCounts;
  statuses: StatusByAppCounts;
};

export type ReportingUsageType = RangeStats & {
  available: boolean;
  browser_type: string;
  enabled: boolean;
  lastDay: RangeStats;
  last7Days: RangeStats;
};

export type FeatureAvailabilityMap = { [F in ExportType]: boolean };
