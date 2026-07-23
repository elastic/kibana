/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';

/** How many spaces the field-definition/template phase migrates in parallel. */
export const MAX_CONCURRENT_MIGRATIONS = 3;

/**
 * Case-backfill tuning. The backfill scans an unbounded number of cases, so it pages with a
 * Point-In-Time cursor (from/size pagination fails past `index.max_result_window`, ~10k) and scans
 * at most `CASE_BACKFILL_SCAN_BUDGET` cases per run before rescheduling — a space with millions of
 * cases finishes across many short runs instead of one run that times out.
 */
export const CASE_BACKFILL_PAGE_SIZE = 1000;
export const CASE_BACKFILL_SCAN_BUDGET = 25000;
export const CASE_BACKFILL_PIT_KEEP_ALIVE = '5m';
export const CASE_BACKFILL_RESCHEDULE_DELAY_MS = 3000;
// When a run can't fully backfill a space because its case updates keep failing, we back off and,
// after this many consecutive failing runs, give up (with an error log) rather than rescheduling
// forever — a single "poison" case must not spin the task or starve other spaces indefinitely.
export const CASE_BACKFILL_FAILURE_RESCHEDULE_DELAY_MS = 30000;
export const MAX_CASE_BACKFILL_FAILED_RUNS = 5;

/** A single legacy custom-field / template as stored on the `cases-configure` SO. */
export type LegacyCustomField = NonNullable<
  ConfigurationPersistedAttributes['customFields']
>[number];
export type LegacyTemplate = NonNullable<ConfigurationPersistedAttributes['templates']>[number];

/** Per-space counts from the field-definition/template phase, aggregated into the run summary. */
export interface MigrationCounts {
  fieldDefsCreated: number;
  fieldDefsReused: number;
  templatesCreated: number;
  templatesReused: number;
}

/**
 * Cross-run cursor for the existing-case backfill. Persisted in Task Manager `state` so a run that
 * hits its scan budget (or is cancelled) resumes exactly where it left off, without re-writing cases
 * already backfilled. `pitId` + `searchAfter` are an Elasticsearch Point-In-Time cursor.
 */
export interface CaseBackfillCursor {
  configureId: string;
  owner: string;
  namespace: string;
  nsOption?: string;
  pitId: string;
  searchAfter?: SortResults;
}

/**
 * Task Manager `state` shape for this task. `caseBackfill` resumes an in-progress space;
 * `failedRuns` counts consecutive runs whose backfill couldn't complete because of update failures,
 * so the task can give up instead of rescheduling a poison space forever.
 */
export interface MigrationTaskState {
  caseBackfill?: CaseBackfillCursor;
  failedRuns?: number;
}

/**
 * Outcome of backfilling one space:
 * - `complete` — fully scanned with no failed updates; the space can be flagged migrated.
 * - `paused`   — stopped early by the scan budget or cancellation; resume this space from `cursor`.
 * - `failed`   — scanned but some updates failed; leave it unflagged and retry it on a later run
 *                (the phase moves on to other spaces so one bad space can't starve the rest).
 */
export interface SpaceBackfillResult {
  outcome: 'complete' | 'paused' | 'failed';
  scanned: number;
  backfilled: number;
  cursor?: CaseBackfillCursor;
}

/**
 * Result of the whole backfill phase for a run. `hadFailures` is true when at least one space
 * couldn't complete because of update failures, which drives the give-up backoff in the task runner.
 */
export interface CaseBackfillPhaseResult {
  complete: boolean;
  backfilled: number;
  hadFailures: boolean;
  nextCursor?: CaseBackfillCursor;
}
