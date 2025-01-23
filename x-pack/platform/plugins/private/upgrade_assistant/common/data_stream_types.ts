/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import type { ReindexStatus } from './types';

export const DATA_STREAM_REINDEX_OP_TYPE = 'upgrade-assistant-data-stream-reindex-operation';

export type DataStreamReindexSavedObject = SavedObject<DataStreamReindexOperation>;

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
  indexName: string;

  lastIndexCreationDate?: number;
  dataStreamTotalIndicesCount?: number;
  dataStreamTotalIndicesRequireUpgradeCount?: number;
  dataStreamDocSize?: number;
  dataStreamDocCount?: number;
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

export enum DataStreamReindexStep {
  created = 0,
  reindexStarted = 10,
  reindexCompleted = 100,
}

export interface DataStreamReindexOperation {
  indexName: string;

  status: ReindexStatus;
  lastCompletedStep: DataStreamReindexStep;
  locked: string | null;
  reindexTaskId: string | null;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;

  taskStatus?: {
    successCount: number;
    pendingCount: number;
    inProgressCount: number;
    errorsCount: number;
  };
}

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
