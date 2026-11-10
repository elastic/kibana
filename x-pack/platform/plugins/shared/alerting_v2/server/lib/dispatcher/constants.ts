/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDurationToMs } from '../duration';

/**
 * How far behind the persisted watermark each scan re-reads. Re-reads are
 * free: the INLINE STATS dedup in `getDispatchableAlertEventsQuery`
 * (queries.ts:38-39) drops already-recorded alerts server-side before
 * LIMIT. `@timestamp` is set by ES at ingest, so the gap between when it's set
 * and searchability is bounded by the refresh interval and covered by the
 * settle buffer; the overlap is slack for anything else (e.g. a paused
 * dispatcher), not a correctness constant.
 */
export const OVERLAP_WINDOW_MINUTES = 10;

/**
 * Maximum span of a single scan. Must stay strictly greater than
 * OVERLAP_WINDOW_MINUTES: the difference is the forward progress a lagging
 * dispatcher makes per tick.
 */
export const MAX_WINDOW_MINUTES = 15;

/**
 * Excludes the most recent slice so in-flight indexing is not scanned
 * mid-write. Must exceed the `.rule-events` refresh interval: ES sets
 * `@timestamp` at ingest, so a doc is searchable at most one refresh after
 * its set.
 */
export const SETTLE_BUFFER_SECONDS = 5;

/**
 * Number of consecutive ticks in which the watermark must not advance before
 * the escape hatch fires. After this many stuck ticks the dispatcher writes
 * terminal `unmatched` records for the blocking alerts and force-advances.
 */
export const STUCK_TICK_LIMIT = 10;

/**
 * When the pre-fetch escape hatch fires (stuck, no alerts known) and watermark
 * lag already exceeds one max scan window, force-advance to `windowEnd` instead
 * of retrying forever. Unread alerts in that window are skipped.
 */
export const PRE_FETCH_STUCK_ADVANCE_LAG_MS = MAX_WINDOW_MINUTES * 60_000;

/**
 * Grouping applied when an action policy does not specify one. Applied once at
 * policy hydration (FetchPoliciesStep); `PolicyCatalog.groupingModeOf` falls
 * back to it only for policies missing from the catalog.
 */
export const DEFAULT_GROUPING = { mode: 'per_alert' } as const;

/**
 * Default Task Manager timeout for one dispatcher tick, overridable with
 * `xpack.alerting_v2.dispatcher.run.timeout`. Also consumed by task_definition.ts.
 */
export const DISPATCHER_TASK_TIMEOUT = '1m' as const;

/**
 * Time a tick keeps between its soft deadline and the task timeout. Must cover
 * the slowest step that cannot yield to the abort signal, e.g. one
 * DISPATCH_CHUNK_SIZE workflow schedule and its `.alert-actions` commit.
 */
export const TICK_DEADLINE_MARGIN_MS = 15_000;

/**
 * Self-imposed stop TICK_DEADLINE_MARGIN_MS before the task timeout. The margin
 * is load-bearing: past the TM timeout `isExpired` is already true and the
 * returned state is discarded (task_manager task_runner.ts:764), so the
 * watermark would freeze.
 */
export const getTickDeadlineMs = (timeout: string): number =>
  parseDurationToMs(timeout) - TICK_DEADLINE_MARGIN_MS;

/**
 * Max workflow schedule items per `bulkScheduleWorkflow` call. Sized so a tick
 * can abort between chunks before the tick deadline (`getTickDeadlineMs`). A chunk holds whole groups
 * and is followed by one `.alert-actions` commit.
 */
export const DISPATCH_CHUNK_SIZE = 250;

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
