/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How far behind the persisted watermark each scan re-reads. Re-reads are
 * free: the INLINE STATS dedup in `getDispatchableAlertEventsQuery`
 * (queries.ts:38-39) drops already-recorded episodes server-side before
 * LIMIT. The overlap absorbs rule events indexed with a `@timestamp` behind
 * the watermark, so the settle buffer is a tuning knob rather than a
 * correctness constant.
 */
export const OVERLAP_WINDOW_MINUTES = 10;

/**
 * Maximum span of a single scan. Must stay strictly greater than
 * OVERLAP_WINDOW_MINUTES: the difference is the forward progress a lagging
 * dispatcher makes per tick.
 */
export const MAX_WINDOW_MINUTES = 15;

/** Excludes the most recent slice so in-flight indexing is not scanned mid-write. */
export const SETTLE_BUFFER_SECONDS = 5;

/**
 * Task manager task type and singleton task id used to schedule dispatcher
 * ticks.
 *
 * Kept in a pure-constants module so consumers that only need the identifiers
 * (e.g. test helpers polling the task manager / event log) can import them
 * without pulling in `task_runner.ts`, which uses inversify decorators that
 * not every transpiler in the repo supports.
 */
export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;
export const DISPATCHER_TASK_ID = 'alerting_v2:dispatcher:1.0.0' as const;
