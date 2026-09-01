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
 * Number of consecutive ticks in which the watermark must not advance before
 * the escape hatch fires. After this many stuck ticks the dispatcher writes
 * terminal `unmatched` records for the blocking episodes and force-advances.
 */
export const STUCK_TICK_LIMIT = 10;

/**
 * When the pre-fetch escape hatch fires (stuck, no episodes known) and watermark
 * lag already exceeds one max scan window, force-advance to `windowEnd` instead
 * of retrying forever. Unread episodes in that window are skipped.
 */
export const PRE_FETCH_STUCK_ADVANCE_LAG_MS = MAX_WINDOW_MINUTES * 60_000;

/**
 * Grouping mode applied when an action policy does not specify one. Applied
 * once at policy hydration (FetchPoliciesStep); `PolicyCatalog.groupingModeOf`
 * falls back to it only for policies missing from the catalog.
 */
export const DEFAULT_GROUPING_MODE = 'per_episode' as const;

/** Task Manager timeout for one dispatcher tick. Also consumed by task_definition.ts. */
export const DISPATCHER_TASK_TIMEOUT = '1m' as const;

/**
 * Millisecond equivalent of DISPATCHER_TASK_TIMEOUT. Keep in sync with the
 * string above; both must be updated together when changing the task timeout.
 * Used to derive TICK_DEADLINE_MS so the relationship is enforced in code
 * rather than just a comment.
 */
export const DISPATCHER_TASK_TIMEOUT_MS = 60_000;

/**
 * Self-imposed stop at 70 % of DISPATCHER_TASK_TIMEOUT_MS. The margin is
 * load-bearing: past the TM timeout `isExpired` is already true and the
 * returned state is discarded (task_manager task_runner.ts:764), so the
 * watermark would freeze. A safe margin must account for the time the current
 * step takes to yield after the signal fires.
 */
export const TICK_DEADLINE_MS = Math.round(DISPATCHER_TASK_TIMEOUT_MS * 0.7);

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
