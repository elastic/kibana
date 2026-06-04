/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOOKBACK_WINDOW_MINUTES = 10;

/**
 * Upper bound on the time span (in minutes) any single dispatcher tick will
 * query in `fetch_episodes`. Bounds the row count fed into `INLINE STATS` so
 * the ES|QL sub-plan buffer stays well under its 16.8 MB limit, and bounds the
 * size of the `(rule_id, group_hash)` IN-list that flows into
 * `fetch_suppressions`. After an outage, the watermark advances at most one
 * cap per tick, draining the backlog over multiple ticks.
 */
export const TICK_LOOKBACK_CAP_MINUTES = 1;

/**
 * Slack subtracted from `now` when computing a tick's `windowEnd`, to absorb
 * Elasticsearch refresh-interval lag and modest clock skew between the rule
 * executor (writer of `.rule-events`) and the dispatcher (reader). Events
 * written within this trailing window may not yet be searchable, so the
 * watermark stops just short of `now` and revisits them on the next tick.
 */
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
