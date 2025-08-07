/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/types';

// 8.0 -> 9.0 warnings
export type IndexWarningType = 'indexSetting' | 'replaceIndexWithAlias' | 'makeIndexReadonly';

export interface IndexWarning {
  warningType: IndexWarningType;
  flow: 'reindex' | 'readonly' | 'all';
  /**
   * Optional metadata for deprecations
   *
   * @remark
   * For "indexSetting" we want to surface the deprecated settings.
   */
  meta?: {
    [key: string]: string | string[] | boolean;
  };
}

export interface QueueSettings {
  /**
   * A Unix timestamp of when the reindex operation was enqueued.
   *
   * @remark
   * This is used by the reindexing scheduler to determine execution
   * order.
   */
  queuedAt: number;

  /**
   * A Unix timestamp of when the reindex operation was started.
   *
   * @remark
   * Updating this field is useful for _also_ updating the saved object "updated_at" field
   * which is used to determine stale or abandoned reindex operations.
   *
   * For now this is used by the reindex worker scheduler to determine whether we have
   * A queue item at the start of the queue.
   *
   */
  startedAt?: number;
}

export interface ReindexOptions {
  /**
   * Whether to treat the index as if it were closed. This instructs the
   * reindex strategy to first open the index, perform reindexing and
   * then close the index again.
   */
  openAndClose?: boolean;

  /**
   * Set this key to configure a reindex operation as part of a
   * batch to be run in series.
   */
  queueSettings?: QueueSettings;
}

export interface ReindexStatusResponse {
  meta: {
    indexName: string;
    reindexName: string;
    // Array of aliases pointing to the index being reindexed
    aliases: string[];
    isReadonly: boolean;
    isFrozen: boolean;
    isInDataStream: boolean;
    isFollowerIndex: boolean;
  };
  warnings?: IndexWarning[];
  reindexOp?: ReindexOperation;
  hasRequiredPrivileges?: boolean;
}

export interface ReindexOperation {
  indexName: string;
  newIndexName: string;
  status: ReindexStatus;
  lastCompletedStep: ReindexStep;
  locked: string | null;
  reindexTaskId: string | null;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  // This field is only used for the singleton IndexConsumerType documents.
  runningReindexCount: number | null;
  rollupJob?: string;

  /**
   * The original index settings to set after reindex is completed.
   * The target index is created with other defaults to improve reindexing performance.
   * https://github.com/elastic/kibana/issues/201605
   */
  backupSettings?: {
    'index.number_of_replicas'?: number;
    'index.refresh_interval'?: number;
  };

  /**
   * Options for the reindexing strategy.
   *
   * @remark
   * Marked as optional for backwards compatibility. We should still
   * be able to handle older ReindexOperation objects.
   */
  reindexOptions?: ReindexOptions;
}

export interface ReindexOperationCancelResponse {
  acknowledged: true;
}

export enum ReindexStep {
  // Enum values are spaced out by 10 to give us room to insert steps in between.
  created = 0,
  readonly = 20,
  newIndexCreated = 30,
  reindexStarted = 40,
  reindexCompleted = 50,
  indexSettingsRestored = 55,
  aliasCreated = 60,
  originalIndexDeleted = 70,
  existingAliasesUpdated = 80,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
  cancelled,
  // Used by the UI to differentiate if there was a failure retrieving
  // the status from the server API
  fetchFailed,
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;
