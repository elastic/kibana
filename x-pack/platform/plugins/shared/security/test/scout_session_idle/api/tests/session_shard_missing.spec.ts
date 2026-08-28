/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  disableSessionAuthcDebugLogs,
  enableSessionAuthcDebugLogs,
  ensureSessionIndexReady,
  getCleanupTaskStatus,
  getSessionCount,
  invalidateAllSessions,
  LOCAL_STATEFUL_TAGS,
  loginWithBasic,
  resetCleanupTask,
  runCleanupTask,
  simulatePointInTimeFailure,
} from '../../../session_management/helpers';

test.describe('Session index shard missing', { tag: [...LOCAL_STATEFUL_TAGS] }, () => {
  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await ensureSessionIndexReady(esClient);
    await enableSessionAuthcDebugLogs(esClient);
    await invalidateAllSessions(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 15000 }).toBe(0);
  });

  test.afterEach(async ({ apiClient, config }) => {
    await simulatePointInTimeFailure(apiClient, config, false);
  });

  test.afterAll(async ({ esClient }) => {
    await disableSessionAuthcDebugLogs(esClient);
  });

  test('quietly fails if shards are unavailable', async ({ apiClient, config, esClient }) => {
    test.setTimeout(100000);

    await resetCleanupTask(apiClient, config);
    await simulatePointInTimeFailure(apiClient, config, true);

    await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 15000 }).toBe(1);
  });

  test('fails if shards are unavailable more than 10 times', async ({ apiClient, config }) => {
    test.setTimeout(600000);

    await resetCleanupTask(apiClient, config);
    await simulatePointInTimeFailure(apiClient, config, true);

    await loginWithBasic(apiClient, config.auth.username, config.auth.password);

    for (let expectedMin = 1; expectedMin <= 9; expectedMin++) {
      await runCleanupTask(apiClient, config);
      await expect
        .poll(
          async () => {
            const state = await getCleanupTaskStatus(apiClient);
            return state.shardMissingCounter ?? 0;
          },
          { timeout: 30000 }
        )
        .toBeGreaterThanOrEqual(expectedMin);
    }

    await runCleanupTask(apiClient, config);
    await expect
      .poll(
        async () => {
          const state = await getCleanupTaskStatus(apiClient);
          return state.shardMissingCounter ?? 0;
        },
        { timeout: 30000 }
      )
      .toBe(0);
  });
});
