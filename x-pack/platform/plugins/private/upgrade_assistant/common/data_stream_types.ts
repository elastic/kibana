/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataStreamsAction {
  type: 'dataStream';
  metadata: {
    totalBackingIndices: number;
    indicesRequiringUpgradeCount: number;
    indicesRequiringUpgrade: string[];
    reindexRequired: boolean;
  };
}

export interface DataStreamMetadata {
  lastBackingIndexCreationDate: number;
  dataStreamTotalIndicesCount: number;
  dataStreamTotalIndicesRequireUpgradeCount: number;
  dataStreamDocSize: number;
  dataStreamDocCount: number;
  backingIndices: string[];
}

export interface DataStreamReindexStatusResponse {
  meta: DataStreamMetadata;
  warnings?: DataStreamReindexWarning[];
  reindexOp?: DataStreamReindexOperation;
  hasRequiredPrivileges?: boolean;
}

export type DataStreamReindexWarningTypes = 'incompatibleDataStream';

export interface DataStreamReindexWarning {
  warningType: DataStreamReindexWarningTypes;
  /**
   * Optional metadata for deprecations
   *
   * @remark
   * For "indexSetting" we want to surface the deprecated settings.
   */
  meta?: {
    [key: string]: string | string[];
  };
}

export enum DataStreamReindexStatus {
  notStarted,
  inProgress,
  completed,
  failed,
  cancelled,
  // Used by the UI to differentiate if there was a failure retrieving
  // the status from the server API
  fetchFailed,
}

export interface DataStreamReindexStatusNotStarted {
  status: DataStreamReindexStatus.notStarted;
}

export interface DataStreamProgressDetails {
  successCount: number;
  pendingCount: number;
  inProgressCount: number;
  errorsCount: number;
}

export interface DataStreamReindexStatusInProgress {
  status: DataStreamReindexStatus.inProgress;
  reindexTaskPercComplete: number;
  progressDetails: DataStreamProgressDetails;
}

export interface DataStreamReindexStatusCompleted {
  status: DataStreamReindexStatus.completed;
  reindexTaskPercComplete: number;
  progressDetails: DataStreamProgressDetails;
}

export interface DataStreamReindexStatusFailed {
  status: DataStreamReindexStatus.failed;
  errorMessage: string;
}

export type DataStreamReindexOperation =
  | DataStreamReindexStatusNotStarted
  | DataStreamReindexStatusInProgress
  | DataStreamReindexStatusCompleted
  | DataStreamReindexStatusFailed;

/**
 * ES Requests Types (untyped in the ES Client)
 */

// Merged but not into our client version yet.
// https://github.com/elastic/elasticsearch-specification/blob/main/specification/migrate/get_reindex_status/MigrateGetReindexStatusResponse.ts
export interface DataStreamReindexTaskStatusResponse {
  start_time?: number;
  start_time_millis: number;
  complete: boolean;
  total_indices_in_data_stream: number;
  total_indices_requiring_upgrade: number;
  successes: number;
  in_progress: Array<{
    index: string;
    total_doc_count: number;
    reindexed_doc_count: number;
  }>;
  pending: number;
  errors: Array<{
    index: string;
    message: string;
  }>;
  exception?: string;
}
