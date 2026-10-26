/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

// A no-op without pending API keys; it reschedules itself after running, which proves a run.
export const TEST_TASK_TYPE = 'task_manager:invalidate_api_keys';

// Mirrors `--xpack.task_manager.poll_interval` in the `task_manager_claim_nudge` Scout config.
export const POLL_INTERVAL_MS = 30_000;

export const NUDGE_CLAIM_BUDGET_MS = 5_000;

// Covers the 60s cold index-creation timeout.
export const NUDGE_SIGNAL_READY_TIMEOUT_MS = 65_000;

export const POLL_CYCLE_READY_TIMEOUT_MS = 3 * POLL_INTERVAL_MS;
// Leaves 20s of the interval for the nudge under test, which needs ~7s, so a loaded CI agent
// reading the cycle clock a few seconds late doesn't have to wait for another interval.
export const POLL_CYCLE_MAX_AGE_MS = 10_000;

export const NUDGE_TEST_TIMEOUT_MS = 180_000;

// Separate from the nudge budget so tuning one cannot weaken the other.
export const NO_CLAIM_OBSERVATION_MS = 5_000;

// A `runAt` this far past `runSoon` means the task ran and rescheduled itself.
export const RESCHEDULE_EVIDENCE_MS = 5_000;

export const ONE_HOUR_MS = 60 * 60 * 1000;
