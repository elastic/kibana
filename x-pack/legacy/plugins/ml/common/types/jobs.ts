/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

// TS TODO: This is not yet a fully fledged representation of the job data structure,
// but it fulfills some basic TypeScript related needs.
export interface MlJob {
  analysis_config: {
    bucket_span: string;
    detectors: object[];
    influencers: string[];
  };
  analysis_limits: {
    categorization_examples_limit: number;
    model_memory_limit: string;
  };
  create_time: number;
  custom_settings: object;
  data_counts: object;
  data_description: {
    time_field: string;
    time_format: string;
  };
  datafeed_config: object;
  description: string;
  established_model_memory: number;
  finished_time: number;
  job_id: string;
  job_type: string;
  job_version: string;
  model_plot_config: object;
  model_size_stats: object;
  model_snapshot_id: string;
  model_snapshot_min_version: string;
  model_snapshot_retention_days: number;
  results_index_name: string;
  state: string;
}

export interface MlSummaryJob {
  id: string;
  description: string;
  groups: string[];
  processed_record_count: number;
  memory_status?: string;
  jobState: string;
  hasDatafeed: boolean;
  datafeedId?: string;
  datafeedIndices: any[];
  datafeedState?: string;
  latestTimestampMs: number;
  earliestTimestampMs?: number;
  latestResultsTimestampMs: number;
  isSingleMetricViewerJob: boolean;
  nodeName?: string;
  deleting?: boolean;
  fullJob?: any;
  auditMessage?: any;
  latestTimestampSortValue?: number;
}

export type MlSummaryJobs = MlSummaryJob[];

export interface MlJobWithTimeRange extends MlJob {
  groups: string[];
  timeRange: {
    from: number;
    to: number;
    fromPx: number;
    toPx: number;
    fromMoment: Moment;
    toMoment: Moment;
    widthPx: number;
    label: string;
  };
}

export function isMlJob(arg: any): arg is MlJob {
  return typeof arg.job_id === 'string';
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MlJobs extends Array<MlJob> {}

export function isMlJobs(arg: any): arg is MlJobs {
  if (Array.isArray(arg) === false) {
    return false;
  }
  return arg.every((d: MlJob) => isMlJob(d));
}
