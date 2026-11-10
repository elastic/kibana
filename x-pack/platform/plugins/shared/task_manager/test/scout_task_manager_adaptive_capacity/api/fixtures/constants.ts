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

// A task type Task Manager registers itself, so no test plugin is needed.
export const TEST_TASK_TYPE = 'task_manager:invalidate_api_keys';

// Defaults of `xpack.task_manager.adaptive_capacity.{min,max}_capacity`.
export const MIN_CAPACITY = 5;
export const MAX_CAPACITY = 50;

// Mirrors `--xpack.task_manager.poll_interval` in the `task_manager_adaptive_capacity` config set.
export const POLL_INTERVAL_MS = 1000;

// Claim, run and the buffered document update, with headroom for a slow CI worker.
export const ESTIMATE_PERSISTED_TIMEOUT_MS = 60_000;
export const ESTIMATE_POLL_MS = 2_000;
