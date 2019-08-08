/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameAnalyticsId, DataFrameAnalyticsOutlierConfig } from '../../../../common';

export enum DATA_FRAME_TASK_STATE {
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
  progress_percent?: number;
  reason?: string;
  state: DATA_FRAME_TASK_STATE;
}

export function isDataFrameAnalyticsStats(arg: any): arg is DataFrameAnalyticsStats {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    {}.hasOwnProperty.call(arg, 'state') &&
    Object.values(DATA_FRAME_TASK_STATE).includes(arg.state)
  );
}

export interface DataFrameAnalyticsListRow {
  id: DataFrameAnalyticsId;
  checkpointing: object;
  config: DataFrameAnalyticsOutlierConfig;
  mode: string;
  stats: DataFrameAnalyticsStats;
}

// Used to pass on attribute names to table columns
export enum DataFrameAnalyticsListColumn {
  configDestIndex = 'config.dest.index',
  configSourceIndex = 'config.source.index',
  // Description attribute is not supported yet by API
  // description = 'config.description',
  id = 'id',
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

export function isCompletedBatchAnalytics(item: DataFrameAnalyticsListRow) {
  // For now all analytics jobs are batch jobs.
  return false;
}
