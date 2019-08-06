/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../../../../common/types/common';

import { DataFrameTransformId, DataFrameTransformPivotConfig } from '../../../../common';

export enum DATA_FRAME_INDEXER_STATE {
  FAILED = 'failed',
  STARTED = 'started',
  STOPPED = 'stopped',
}

export enum DATA_FRAME_TASK_STATE {
  FAILED = 'failed',
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

export interface DataFrameTransformStats {
  id: DataFrameTransformId;
  checkpointing: {
    last: {
      checkpoint: number;
      timestamp_millis?: number;
    };
    next?: {
      checkpoint: number;
      // indexer_state is a backend internal attribute
      // and should not be considered in the UI.
      indexer_state: DATA_FRAME_INDEXER_STATE;
      checkpoint_progress?: {
        total_docs: number;
        docs_remaining: number;
        percent_complete: number;
      };
    };
    operations_behind: number;
  };
  stats: {
    documents_indexed: number;
    documents_processed: number;
    index_failures: number;
    index_time_in_ms: number;
    index_total: number;
    pages_processed: number;
    search_failures: number;
    search_time_in_ms: number;
    search_total: number;
    trigger_count: number;
  };
  reason?: string;
  // task_state is the attribute to check against if a transform
  // is running or not.
  task_state: DATA_FRAME_TASK_STATE;
}

export function isDataFrameTransformStats(arg: any): arg is DataFrameTransformStats {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    {}.hasOwnProperty.call(arg, 'task_state') &&
    Object.values(DATA_FRAME_TASK_STATE).includes(arg.task_state)
  );
}

export interface DataFrameTransformListRow {
  id: DataFrameTransformId;
  checkpointing: object;
  stats: DataFrameTransformStats;
  config: DataFrameTransformPivotConfig;
}

// Used to pass on attribute names to table columns
export enum DataFrameTransformListColumn {
  configDestIndex = 'config.dest.index',
  configSourceIndex = 'config.source.index',
  description = 'config.description',
  id = 'id',
}

export type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

export function isCompletedBatchTransform(item: DataFrameTransformListRow) {
  // If `checkpoint=1`, `sync` is missing from the config and state is stopped,
  // then this is a completed batch data frame transform.
  return (
    item.stats.checkpointing.last.checkpoint === 1 &&
    item.config.sync === undefined &&
    item.stats.task_state === DATA_FRAME_TASK_STATE.STOPPED
  );
}
