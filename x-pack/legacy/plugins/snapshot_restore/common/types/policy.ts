/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SnapshotConfig,
  SnapshotConfigEs,
  SnapshotRetention,
  SnapshotRetentionEs,
} from './snapshot';
export interface SlmPolicyPayload {
  name: string;
  snapshotName: string;
  schedule: string;
  repository: string;
  config?: SnapshotConfig;
  retention?: SnapshotRetention;
}

export interface SlmPolicy extends SlmPolicyPayload {
  version: number;
  modifiedDate: string;
  modifiedDateMillis: number;
  nextExecution: string;
  nextExecutionMillis: number;
  lastSuccess?: {
    snapshotName: string;
    timeString: string;
    time: number;
  };
  lastFailure?: {
    snapshotName: string;
    timeString: string;
    time: number;
    details: object | string;
  };
  inProgress?: {
    snapshotName: string;
  };
  stats?: {
    snapshotsTaken: number;
    snapshotsFailed: number;
    snapshotsDeleted: number;
    snapshotDeletionFailures: number;
  };
}

export interface SlmPolicyEs {
  version: number;
  modified_date: string;
  modified_date_millis: number;
  policy: {
    name: string;
    schedule: string;
    repository: string;
    config?: SnapshotConfigEs;
    retention?: SnapshotRetentionEs;
  };
  next_execution: string;
  next_execution_millis: number;
  last_success?: {
    snapshot_name: string;
    time_string: string;
    time: number;
  };
  last_failure?: {
    snapshot_name: string;
    time_string: string;
    time: number;
    details: string;
  };
  in_progress?: {
    name: string;
    uuid: string;
    state: string;
    start_time: string;
    start_time_millis: number;
  };
  stats?: {
    snapshots_taken: number;
    snapshots_failed: number;
    snapshots_deleted: number;
    snapshot_deletion_failures: number;
  };
}

export interface SlmPolicyStats {
  retentionRuns: number;
  retentionFailed: number;
  retentionTimedOut: number;
  retentionDeletionTime: string;
  retentionDeletionTimeMillis: number;
  totalSnapshotsTaken: number;
  totalSnapshotsFailed: number;
  totalSnapshotsDeleted: number;
  totalSnapshotDeletionFailures: number;
}

export interface SlmPolicyStatsEs {
  retention_runs: number;
  retention_failed: number;
  retention_timed_out: number;
  retention_deletion_time: string;
  retention_deletion_time_millis: number;
  policy_metrics: object;
  total_snapshots_taken: number;
  total_snapshots_failed: number;
  total_snapshots_deleted: number;
  total_snapshot_deletion_failures: number;
}
