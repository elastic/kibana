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

// An existing Task Manager task type that is a no-op when there are no API keys pending
// invalidation, so these tests can let it actually execute. It reschedules itself minutes out
// after running, which is how the tests detect that a run happened.
export const TEST_TASK_TYPE = 'task_manager:invalidate_api_keys';

// A nudged claim lands in the low hundreds of milliseconds on a healthy machine. This budget is
// generous enough to absorb CI jitter while staying far below the 60s `poll_interval` configured by
// the `task_manager_claim_nudge` Scout config set, so it can only be met if the nudge (rather than
// the next regular poll cycle) triggered the claim.
export const NUDGE_BUDGET_MS = 5_000;

export const ONE_HOUR_MS = 60 * 60 * 1000;
