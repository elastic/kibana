/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataStreamsActionMetadata {
  excludedActions?: Array<'readOnly' | 'reindex'>;
  totalBackingIndices: number;
  indicesRequiringUpgradeCount: number;
  indicesRequiringUpgrade: string[];
  ignoredIndicesRequiringUpgrade: string[];
  ignoredIndicesRequiringUpgradeCount: number;
  reindexRequired: boolean;
}

export type DataStreamResolutionType = 'readonly' | 'reindex' | 'delete';
export interface DataStreamsAction {
  type: 'dataStream';
  metadata: DataStreamsActionMetadata;
}

export interface DataStreamMetadata {
  dataStreamName: string;
  documentationUrl: string;

  lastIndexRequiringUpgradeCreationDate: number;
  allIndices: string[];
  allIndicesCount: number;
  indicesRequiringUpgradeCount: number;
  indicesRequiringUpgrade: string[];

  indicesRequiringUpgradeDocsSize: number;
  indicesRequiringUpgradeDocsCount: number;
  oldestIncompatibleDocTimestamp?: number;
}

export interface DataStreamReindexStatusResponse {
  warnings?: DataStreamMigrationWarning[];
  migrationOp?: DataStreamMigrationOperation;
  hasRequiredPrivileges?: boolean;
}

export type DataStreamWarningTypes = 'incompatibleDataStream' | 'affectExistingSetups';

export interface DataStreamMigrationWarning {
  warningType: DataStreamWarningTypes;
  resolutionType: DataStreamResolutionType;
  meta?: {
    [key: string]: string | string[];
  };
}

export enum DataStreamMigrationStatus {
  notStarted,
  inProgress,
  completed,
  failed,
  cancelled,
  fetchFailed,
}

export interface DataStreamProgressDetails {
  startTimeMs: number;
  successCount: number;
  pendingCount: number;
  inProgressCount: number;
  errorsCount: number;
}

export interface DataStreamReindexStatusNotStarted {
  status: DataStreamMigrationStatus.notStarted;
}

export interface DataStreamReindexStatusInProgress {
  resolutionType: 'reindex' | 'readonly' | 'delete';
  status: DataStreamMigrationStatus.inProgress;
  taskPercComplete: number;
  progressDetails: DataStreamProgressDetails;
}

export interface DataStreamReindexStatusCompleted {
  resolutionType: 'reindex' | 'readonly' | 'delete';
  status: DataStreamMigrationStatus.completed;
  taskPercComplete: number;
  progressDetails: DataStreamProgressDetails;
}

export interface DataStreamReindexStatusFailed {
  resolutionType: 'reindex' | 'readonly' | 'delete';
  status: DataStreamMigrationStatus.failed;
  errorMessage: string;
}

export interface DataStreamReindexStatusCancelled {
  resolutionType: 'reindex' | 'readonly' | 'delete';
  status: DataStreamMigrationStatus.cancelled;
}

export type DataStreamMigrationOperation =
  | DataStreamReindexStatusNotStarted
  | DataStreamReindexStatusInProgress
  | DataStreamReindexStatusCompleted
  | DataStreamReindexStatusCancelled
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
