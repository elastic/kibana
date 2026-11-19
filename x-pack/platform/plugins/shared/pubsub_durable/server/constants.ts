/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EVENTS_INDEX = '.kibana-pubsub-events';

export const PAGE_SIZE = 100;
/** Stop starting new handler calls in a run once this much time has passed. */
export const RUN_TIME_BUDGET_MS = 10_000;
/** A handler call that runs longer than this counts as a failure. */
export const HANDLER_TIMEOUT_MS = 30_000;
/** Task Manager's own timeout. A run that hits it does not save its state. */
export const TASK_TIMEOUT = '1m';
/** Safety-net schedule; each run chooses its own next `runAt`. */
export const SAFETY_NET_INTERVAL = '5m';

export const INITIAL_IDLE_MS = 5_000;
export const MAX_IDLE_MS = 5 * 60_000;
export const CAUGHT_UP_DELAY_MS = 5_000;
export const HANDLER_MISSING_DELAY_MS = 30_000;

export const MAX_ATTEMPTS_PER_EVENT = 5;
/** Delay after the Nth failed attempt on the same event (1-based). */
export const FAILURE_BACKOFF_MS = [5_000, 15_000, 60_000, 300_000] as const;

export const NUDGE_MIN_INTERVAL_MS = 1_000;
export const NUDGE_RETRY_DELAY_MS = 2_000;

export const getTaskType = (consumer: string): string => `pubsub:${consumer}`;
export const getTaskId = (consumer: string, topic: string): string => `pubsub:${consumer}:${topic}`;
