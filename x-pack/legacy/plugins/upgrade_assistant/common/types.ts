/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes } from 'src/core/server';

export enum ReindexStep {
  // Enum values are spaced out by 10 to give us room to insert steps in between.
  created = 0,
  indexGroupServicesStopped = 10,
  readonly = 20,
  newIndexCreated = 30,
  reindexStarted = 40,
  reindexCompleted = 50,
  aliasCreated = 60,
  indexGroupServicesStarted = 70,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
  cancelled,
}

export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';
export interface ReindexOperation extends SavedObjectAttributes {
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
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

export enum ReindexWarning {
  // 6.0 -> 7.0 warnings, now unused
  allField = 0,
  booleanFields = 1,

  // 7.0 -> 8.0 warnings
  apmReindex,

  // 8.0 -> 9.0 warnings
}

export enum IndexGroup {
  ml = '___ML_REINDEX_LOCK___',
  watcher = '___WATCHER_REINDEX_LOCK___',
}

// Telemetry types
export const UPGRADE_ASSISTANT_TYPE = 'upgrade-assistant-telemetry';
export const UPGRADE_ASSISTANT_DOC_ID = 'upgrade-assistant-telemetry';
export type UIOpenOption = 'overview' | 'cluster' | 'indices';
export type UIReindexOption = 'close' | 'open' | 'start' | 'stop';

export interface UIOpen {
  overview: boolean;
  cluster: boolean;
  indices: boolean;
}

export interface UIReindex {
  close: boolean;
  open: boolean;
  start: boolean;
  stop: boolean;
}

export interface UpgradeAssistantTelemetrySavedObject {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
  };
  ui_reindex: {
    close: number;
    open: number;
    start: number;
    stop: number;
  };
}

export interface UpgradeAssistantTelemetry {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
  };
  ui_reindex: {
    close: number;
    open: number;
    start: number;
    stop: number;
  };
  features: {
    deprecation_logging: {
      enabled: boolean;
    };
  };
}

export interface UpgradeAssistantTelemetrySavedObjectAttributes {
  [key: string]: any;
}
