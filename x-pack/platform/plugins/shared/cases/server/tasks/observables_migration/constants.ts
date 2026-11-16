/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASES_OBSERVABLES_MIGRATION_TASK_TYPE = 'cases_observables_migration';
export const CASES_OBSERVABLES_MIGRATION_TASK_ID = `cases:${CASES_OBSERVABLES_MIGRATION_TASK_TYPE}`;

export const OBSERVABLES_MIGRATION_TASK_TIMEOUT = '10m' as const;
const OBSERVABLES_MIGRATION_TASK_TIMEOUT_MS = 10 * 60 * 1000;
/** A run stops taking new pages at this point, leaving room to finish the page in flight. */
export const OBSERVABLES_MIGRATION_RUN_BUDGET_MS = Math.round(
  OBSERVABLES_MIGRATION_TASK_TIMEOUT_MS * 0.7
);

/** The task is recurring only so its state (cursor, completion) outlives each run. */
export const OBSERVABLES_MIGRATION_INTERVAL = '1d' as const;
export const OBSERVABLES_MIGRATION_CONTINUE_DELAY_MS = 1_000;
export const OBSERVABLES_MIGRATION_FAILURE_DELAY_MS = 30_000;
export const MAX_OBSERVABLES_MIGRATION_FAILED_RUNS = 5;

/** Cases read per page; with up to 50 legacy observables each, a page is at most 25,000 creates. */
export const OBSERVABLES_MIGRATION_CASES_PAGE_SIZE = 500;
export const OBSERVABLES_MIGRATION_BULK_CREATE_SIZE = 2_000;
export const OBSERVABLES_MIGRATION_BULK_CREATE_CONCURRENCY = 4;
/** Covers the pause between runs, so a run normally resumes the previous run's point in time. */
export const OBSERVABLES_MIGRATION_PIT_KEEP_ALIVE = '10m';

/** Case ids kept in the task state for cases with observables that failed to migrate. */
export const MAX_OBSERVABLES_MIGRATION_FAILED_CASE_IDS = 100;
