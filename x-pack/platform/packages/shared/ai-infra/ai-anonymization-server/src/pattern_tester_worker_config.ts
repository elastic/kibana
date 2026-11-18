/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AnonymizationWorkerConfig } from './types';

const TEST_TASK_TIMEOUT_MS = 2000;
const TEST_IDLE_TIMEOUT_MS = 30000;

/**
 * Config for the pool behind the pattern tester. A task that times out makes
 * `RegexWorkerService` destroy and rebuild its whole pool, rejecting every task queued on it, so
 * a pattern submitted for testing must never share a pool with real `chatComplete` traffic. The
 * pool is also kept to one thread with a short queue and a short timeout so a pathological
 * pattern is cut off in seconds and cannot pile up work.
 *
 * With `enabled: false` the service would run tasks synchronously on the Kibana thread, where the
 * timeout cannot interrupt a pathological pattern, so callers must refuse to test patterns then.
 */
export const createPatternTesterWorkerConfig = ({
  enabled,
}: {
  enabled: boolean;
}): AnonymizationWorkerConfig => ({
  enabled,
  minThreads: 0,
  maxThreads: 1,
  maxQueue: 5,
  idleTimeout: moment.duration(TEST_IDLE_TIMEOUT_MS, 'milliseconds'),
  taskTimeout: moment.duration(TEST_TASK_TIMEOUT_MS, 'milliseconds'),
});
