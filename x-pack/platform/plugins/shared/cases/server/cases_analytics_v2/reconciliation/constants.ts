/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Number of source SOs fetched per ES round-trip by every reconciliation
 * runner (cases, activity, attachments). Shared so the three surfaces
 * stay in lockstep: a single Task Manager tick budget covers a similar
 * number of docs across surfaces, and a future tuning change lands in one
 * place. 250 balances fewer round-trips (faster backfill / reset) against
 * keeping the task-runtime budget and per-page memory comfortable even on
 * heavy payloads (cases with large `extended_fields`, attachments with
 * large `data` / `metadata` blobs — the `wildcard`-mapped analytics fields
 * are unbounded, so per-page memory, not index truncation, is the limit).
 */
export const RECONCILIATION_PAGE_SIZE = 250;

/**
 * SO-namespaces value meaning "every namespace". The unscoped internal SO
 * client defaults to `[DEFAULT_NAMESPACE_STRING]`; explicit `['*']` opts
 * every space into the walk. Shared across the runners so the cross-space
 * contract lives in one place.
 */
export const RECONCILIATION_NAMESPACES_ALL: readonly string[] = ['*'];

/**
 * Cap on the per-space breakdown reported in each runner's summary log
 * line. Keeps the log bounded on tenants with thousands of spaces.
 */
export const RECONCILIATION_SUMMARY_TOP_N_SPACES = 25;
