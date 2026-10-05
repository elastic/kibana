/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AnonymizationWorkerConfig } from '../../config';

const MAX_TEST_TASK_TIMEOUT_MS = 2000;

/**
 * Config for the pool behind the pattern-tester route. A task that times out makes
 * `RegexWorkerService` destroy and rebuild its whole pool, rejecting every task queued on it, so
 * a pattern submitted for testing must never share a pool with real `chatComplete` traffic. The
 * pool is also kept to one thread with a short queue and a short timeout so a pathological
 * pattern is cut off in seconds and cannot pile up work.
 */
export const createTestWorkerConfig = (
  config: AnonymizationWorkerConfig
): AnonymizationWorkerConfig => ({
  ...config,
  minThreads: 0,
  maxThreads: 1,
  maxQueue: 5,
  taskTimeout: moment.duration(
    Math.min(config.taskTimeout.asMilliseconds(), MAX_TEST_TASK_TIMEOUT_MS),
    'milliseconds'
  ),
});
