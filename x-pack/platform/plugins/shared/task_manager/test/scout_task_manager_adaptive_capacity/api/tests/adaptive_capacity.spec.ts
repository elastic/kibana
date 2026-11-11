/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  ESTIMATE_PERSISTED_TIMEOUT_MS,
  ESTIMATE_POLL_MS,
  MAX_CAPACITY,
  MIN_CAPACITY,
  TEST_TASK_TYPE,
} from '../fixtures/constants';

interface AdaptiveCapacityState {
  capacity: number;
  heap_limit_bytes: number;
  heap_target_bytes: number;
  bytes_per_normal_task: number;
  free_slots: number;
  decisions: number;
  seeded_instances: number;
}

interface HealthResponse {
  stats: {
    configuration: {
      value: {
        capacity: { config: number; as_cost: number; as_workers: number; mode: string };
        adaptive_capacity: AdaptiveCapacityState | null;
      };
    };
  };
}

interface TaskAttributes {
  memoryEstimate?: { bytes: number; samples: number; updatedAt: string };
}

// Local-only: config sets don't apply on Cloud, where capacity is a fixed number.
apiTest.describe('Task Manager adaptive capacity', { tag: ['@local-stateful-classic'] }, () => {
  const taskIdsToCleanup: string[] = [];

  const getHealth = async (apiClient: ApiClientFixture, cookieHeader: CookieHeader) => {
    const response = await apiClient.get('api/task_manager/_health', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    return response.body as HealthResponse;
  };

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    for (const taskId of taskIdsToCleanup) {
      await apiClient
        .delete(`internal/task_manager/tasks/${taskId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        })
        .catch(() => {});
    }
  });

  apiTest(
    'health reports auto mode with a heap budget inside the configured range',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const { capacity, adaptive_capacity: adaptive } = (await getHealth(apiClient, cookieHeader))
        .stats.configuration.value;

      expect(capacity.mode).toBe('auto');
      expect(capacity.config).toBeGreaterThanOrEqual(MIN_CAPACITY);
      expect(capacity.config).toBeLessThanOrEqual(MAX_CAPACITY);
      expect(capacity.as_cost).toBe(capacity.config * 2);

      expect(adaptive).toMatchObject({
        capacity: capacity.config,
        settings: { min_capacity: MIN_CAPACITY, max_capacity: MAX_CAPACITY },
      });
      const state = adaptive as AdaptiveCapacityState;
      expect(state.heap_limit_bytes).toBeGreaterThan(0);
      expect(state.heap_target_bytes).toBeGreaterThan(0);
      expect(state.heap_target_bytes).toBeLessThan(state.heap_limit_bytes);
      expect(state.bytes_per_normal_task).toBeGreaterThan(0);
      expect(state.free_slots).toBeGreaterThanOrEqual(0);
      expect(state.decisions).toBeGreaterThanOrEqual(0);
      expect(state.seeded_instances).toBeGreaterThanOrEqual(0);
    }
  );

  apiTest(
    'a recurring task gets a memory estimate on its document after its first run',
    async ({ apiClient, samlAuth, kbnClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const scheduled = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
            schedule: { interval: '1h' },
          },
        },
        responseType: 'json',
      });
      expect(scheduled).toHaveStatusCode(200);
      const { id: taskId } = scheduled.body as { id: string };
      taskIdsToCleanup.push(taskId);

      // `task` is a hidden type, so it is read through the test client rather than the public API.
      const readEstimate = async () =>
        (await kbnClient.savedObjects.get<TaskAttributes>({ type: 'task', id: taskId })).attributes
          .memoryEstimate;

      await expect
        .poll(readEstimate, {
          timeout: ESTIMATE_PERSISTED_TIMEOUT_MS,
          intervals: [ESTIMATE_POLL_MS],
        })
        .toBeDefined();

      const estimate = await readEstimate();
      expect(estimate).toBeDefined();
      const { bytes, samples, updatedAt } = estimate as NonNullable<typeof estimate>;
      expect(bytes).toBeGreaterThanOrEqual(0);
      expect(samples).toBeGreaterThanOrEqual(1);
      expect(Number.isNaN(Date.parse(updatedAt))).toBe(false);
    }
  );
});
