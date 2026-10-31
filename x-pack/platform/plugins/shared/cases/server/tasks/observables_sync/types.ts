/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ObservablesCaseKey } from '../../services/observables';

export const CASES_OBSERVABLES_SYNC_TASK_TIMEOUT = '10m' as const;
export const CASES_OBSERVABLES_SYNC_TASK_TIMEOUT_MS = 10 * 60 * 1000;
/** Leaves headroom under the task timeout for the case in flight when the budget runs out. */
export const OBSERVABLES_SYNC_RUN_BUDGET_MS = Math.round(
  CASES_OBSERVABLES_SYNC_TASK_TIMEOUT_MS * 0.7
);

/** Once a full pass is complete, the task only looks for pending and orphaned observables. */
export const OBSERVABLES_SYNC_IDLE_INTERVAL = '24h' as const;

/**
 * The passes page with a Point-In-Time cursor, since from/size fails past `index.max_result_window`,
 * and stop after a fixed number of cases per run, so a deployment with many cases finishes across
 * many short runs instead of one run that times out.
 */
export const OBSERVABLES_SYNC_PAGE_SIZE = 500;
export const OBSERVABLES_SYNC_CASE_BUDGET = 10000;
export const OBSERVABLES_SYNC_PIT_KEEP_ALIVE = '5m';
export const OBSERVABLES_SYNC_CONCURRENCY = 5;

/** How many times a case is synced again after a version conflict before it is flagged pending. */
export const MAX_CASE_SYNC_ATTEMPTS = 3;

export const OBSERVABLES_SYNC_RESCHEDULE_DELAY_MS = 3000;
/** A run with failing cases backs off, and after enough in a row the task waits for its next interval. */
export const OBSERVABLES_SYNC_FAILURE_RESCHEDULE_DELAY_MS = 30000;
export const MAX_OBSERVABLES_SYNC_FAILED_RUNS = 5;

export type ObservablesSyncPhase = 'copy' | 'cleanup' | 'pending';

/** Where a scan of the cases resumes: the Point-In-Time and the last sort values seen. */
export interface CaseScanCursor {
  pitId: string;
  searchAfter?: SortResults;
}

export interface ObservablesSyncCounts {
  casesSynced: number;
  documentsCreated: number;
  documentsUpdated: number;
  documentsDeleted: number;
  casesFlaggedPending: number;
  orphanedCases: number;
}

export interface ObservablesSyncState extends Record<string, unknown> {
  /** The pass in progress. Absent before the first run. */
  passVersion?: number;
  phase?: ObservablesSyncPhase;
  /** Resume point of the copy and pending phases. */
  scan?: CaseScanCursor;
  /** Resume point of the cleanup phase. */
  cleanupAfter?: ObservablesCaseKey;
  counts?: ObservablesSyncCounts;
  /** Cases of the pending phase that could not be synced yet, so the phase is not complete. */
  phaseFailures?: number;
  /** A case failed and could not be flagged pending, so the pass starts over instead of completing. */
  rescanNeeded?: boolean;
  /** Consecutive runs that ended with failing cases. */
  failedRuns?: number;
  /** The highest pass version that finished with every case in sync. */
  completedPassVersion?: number;
  completedAt?: string;
}

export const emptyCounts = (): ObservablesSyncCounts => ({
  casesSynced: 0,
  documentsCreated: 0,
  documentsUpdated: 0,
  documentsDeleted: 0,
  casesFlaggedPending: 0,
  orphanedCases: 0,
});
