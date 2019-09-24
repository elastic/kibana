/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameAnalyticsId, DataFrameAnalyticsConfig } from '../../../../common';

export enum DATA_FRAME_TASK_STATE {
  ANALYZING = 'analyzing',
  FAILED = 'failed',
  REINDEXING = 'reindexing',
  STARTED = 'started',
  STOPPED = 'stopped',
}

export enum DATA_FRAME_MODE {
  BATCH = 'batch',
  CONTINUOUS = 'continuous',
}

export interface Clause {
  type: string;
  value: string;
  match: string;
}

export interface Query {
  ast: {
    clauses: Clause[];
  };
  text: string;
  syntax: any;
}

interface ProgressSection {
  phase: string;
  progress_percent: number;
}

export interface DataFrameAnalyticsStats {
  assignment_explanation?: string;
  id: DataFrameAnalyticsId;
  node?: {
    attributes: Record<string, any>;
    ephemeral_id: string;
    id: string;
    name: string;
    transport_address: string;
  };
  progress: ProgressSection[];
  reason?: string;
  state: DATA_FRAME_TASK_STATE;
}

export function isDataFrameAnalyticsRunning(stats: DataFrameAnalyticsStats) {
  return (
    stats.state === DATA_FRAME_TASK_STATE.ANALYZING ||
    stats.state === DATA_FRAME_TASK_STATE.STARTED ||
    stats.state === DATA_FRAME_TASK_STATE.REINDEXING
  );
}

export function isDataFrameAnalyticsStats(arg: any): arg is DataFrameAnalyticsStats {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    {}.hasOwnProperty.call(arg, 'state') &&
    Object.values(DATA_FRAME_TASK_STATE).includes(arg.state) &&
    {}.hasOwnProperty.call(arg, 'progress') &&
    Array.isArray(arg.progress)
  );
}

export function getDataFrameAnalyticsProgress(stats: DataFrameAnalyticsStats) {
  if (isDataFrameAnalyticsStats(stats)) {
    return Math.round(
      stats.progress.reduce((p, c) => p + c.progress_percent, 0) / stats.progress.length
    );
  }

  return undefined;
}

export interface DataFrameAnalyticsListRow {
  id: DataFrameAnalyticsId;
  checkpointing: object;
  config: DataFrameAnalyticsConfig;
  mode: string;
  stats: DataFrameAnalyticsStats;
}

// Used to pass on attribute names to table columns
export enum DataFrameAnalyticsListColumn {
  configDestIndex = 'config.dest.index',
  configSourceIndex = 'config.source.index',
  configCreateTime = 'config.create_time',
  // Description attribute is not supported yet by API
  // description = 'config.description',
  id = 'id',
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

export function isCompletedAnalyticsJob(stats: DataFrameAnalyticsStats) {
  const progress = getDataFrameAnalyticsProgress(stats);
  return stats.state === DATA_FRAME_TASK_STATE.STOPPED && progress === 100;
}

export function getResultsUrl(jobId: string) {
  return `ml#/data_frame_analytics/exploration?_g=(ml:(jobId:${jobId}))`;
}
