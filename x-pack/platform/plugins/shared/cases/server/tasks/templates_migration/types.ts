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

/** Task Manager `state` shape for this task — only the resumable backfill needs to persist a cursor. */
export interface MigrationTaskState {
  caseBackfill?: CaseBackfillCursor;
}

/** Result of backfilling one space: whether it finished, how much it did, and where to resume. */
export interface SpaceBackfillResult {
  complete: boolean;
  scanned: number;
  backfilled: number;
  cursor?: CaseBackfillCursor;
}

/** Result of the whole backfill phase for a run: whether every pending space finished. */
export interface CaseBackfillPhaseResult {
  complete: boolean;
  backfilled: number;
  nextCursor?: CaseBackfillCursor;
}
