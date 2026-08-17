/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
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
// When a run can't fully backfill a space because its case updates keep failing, or a space is
// stuck on an unresolved Phase-1 (field-definitions/templates) error, we back off and, after this
// many consecutive failing runs, give up (with an error log) rather than rescheduling forever — a
// single "poison" space must not spin the task or starve other spaces indefinitely.
export const CASE_BACKFILL_FAILURE_RESCHEDULE_DELAY_MS = 30000;
export const MAX_CASE_BACKFILL_FAILED_RUNS = 5;

/**
 * Field-value reconciliation tuning (plan Unit 2 §7 / addendum A3). The task is
 * a low-frequency permanent singleton: the interval picks up stale
 * reconciliation markers even when a configuration change's best-effort
 * `runSoon` nudge was lost (e.g. it raced a running instance).
 */
export const MIGRATION_TASK_INTERVAL = '12h';
export const RECONCILE_SCAN_BUDGET = 25000;
/** Cap on per-case diagnostic log lines per space per run (A5) — the rest is summarized. */
export const MAX_RECONCILE_DIAGNOSTICS_PER_SPACE = 50;

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
  /**
   * The phase-completion flags as of the end of this call — either already true from a prior run,
   * or just persisted this run, or still false (an unexpected error withheld them). The task
   * runner merges these into its in-memory configure snapshot so the case-backfill phase (gated
   * on both being true) can run in the SAME cycle right after a fresh migration, instead of
   * waiting a full extra run for the next `findAllConfigurations` read to see the persisted flags.
   */
  legacyCustomFieldsMigrated: boolean;
  legacyTemplatesMigrated: boolean;
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
 * Cross-run cursor for the field-value reconciliation phase. Same PIT shape as
 * the backfill cursor, plus the active-link fingerprint the scan started under:
 * when the recomputed fingerprint differs on resume, the links changed
 * mid-scan and the space restarts from a fresh snapshot (addendum A3).
 */
export interface ReconcileCursor extends CaseBackfillCursor {
  linkFingerprint: string;
}

/**
 * Task Manager `state` shape for this task. `caseBackfill` / `reconcile` resume an in-progress
 * space; `failedRuns` counts consecutive runs that couldn't complete because of update failures,
 * so the task can back off to the interval instead of hot-rescheduling a poison space forever.
 */
export interface MigrationTaskState {
  caseBackfill?: CaseBackfillCursor;
  failedRuns?: number;
  reconcile?: ReconcileCursor;
}

const cursorSchemaProps = {
  configureId: schema.string(),
  owner: schema.string(),
  namespace: schema.string(),
  nsOption: schema.maybe(schema.string()),
  pitId: schema.string(),
  // Elasticsearch `search_after` sort values — opaque scalars produced by ES.
  searchAfter: schema.maybe(schema.arrayOf(schema.any())),
};

/**
 * Versioned Task Manager state schema (v1). Initial `{}` state is valid, and the
 * shape deliberately covers the `caseBackfill`/`failedRuns` state persisted by
 * older in-progress instances of this task type, so the first versioned schema
 * accepts and preserves it (`up` is the identity).
 */
export const migrationTaskStateSchemaV1 = schema.object({
  caseBackfill: schema.maybe(schema.object(cursorSchemaProps)),
  failedRuns: schema.maybe(schema.number()),
  reconcile: schema.maybe(
    schema.object({ ...cursorSchemaProps, linkFingerprint: schema.string() })
  ),
});

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

/**
 * Low-cardinality per-run reconciliation counts (plan Observability section) —
 * the task runner mirrors them into usage counters and the run summary log.
 */
export interface ReconcileCounts {
  scanned: number;
  /** Cases where at least one linked field's two representations disagreed. */
  mismatched: number;
  /** Cases whose repair update was submitted and accepted. */
  repaired: number;
  /** Linked fields where both sides were non-empty and different (v2 won). */
  conflicted: number;
  /** Permanently malformed data: undecodable values, duplicate v1 entries, broken linkage. */
  malformed: number;
  /** Spaces whose marker was written this run (verified zero mismatches). */
  completed: number;
}

/**
 * Outcome of reconciling one space:
 * - `verified` — a full scan observed zero mismatches/failures; the marker was written (unless the
 *                fresh-fingerprint OCC check found the links changed — then `stale`).
 * - `repaired` — the scan submitted repairs; a later pass must re-verify before marking.
 * - `paused`   — stopped by budget/cancellation; resume from `cursor`.
 * - `blocked`  — unresolved/malformed configured links or permanently malformed case data prevent
 *                completion (A1/A5); diagnostics were emitted, the marker is NOT written.
 * - `failed`   — retryable update failures; the space is retried on a later run.
 * - `stale`    — the active-link fingerprint changed while scanning or before marking; restart.
 */
export interface SpaceReconcileResult {
  outcome: 'verified' | 'repaired' | 'paused' | 'blocked' | 'failed' | 'stale';
  counts: ReconcileCounts;
  cursor?: ReconcileCursor;
}

/** Result of the whole reconciliation phase for one run. */
export interface ReconcilePhaseResult {
  /** True when no pending space remains in a non-terminal state (verified/blocked only). */
  complete: boolean;
  hadFailures: boolean;
  counts: ReconcileCounts;
  nextCursor?: ReconcileCursor;
}
