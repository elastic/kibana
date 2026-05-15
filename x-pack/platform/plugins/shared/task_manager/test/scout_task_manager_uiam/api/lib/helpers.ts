/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { Client } from '@elastic/elasticsearch';
import type { ApiClientFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker/api_client';
import { COMMON_HEADERS, TEST_TASK_TYPE } from '../fixtures/constants';

/** Task Manager saved-object index (concrete task documents). */
export const TASK_MANAGER_INDEX = '.kibana_task_manager';

/**
 * Alerting / cases saved-object index where `uiam_api_keys_provisioning_status` lives
 * (same as {@link ALERTING_CASES_SAVED_OBJECT_INDEX} + serverless concrete suffix).
 * Matches other Scout serverless observability tests (e.g. alerting `rules.spec.ts`).
 */
export const UIAM_PROVISIONING_STATUS_SO_INDEX = '.kibana_alerting_cases_1';

/**
 * Saved object type id for UIAM provisioning status rows (must match Task Manager server
 * `UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE`).
 */
const UIAM_PROVISIONING_STATUS_TYPE = 'uiam_api_keys_provisioning_status';

export const taskDocId = (taskId: string) => `task:${taskId}`;

export const uiamProvisioningStatusDocId = (entityId: string) =>
  `${UIAM_PROVISIONING_STATUS_TYPE}:${entityId}`;

export const parseTaskState = (raw: unknown): Record<string, unknown> => {
  if (raw == null) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return {};
};

/**
 * Reads the nested `task` attributes from a Task Manager concrete task document in ES.
 */
export const readTaskAttributes = async (esClient: Client, id: string) => {
  const { _source } = await esClient.get({ index: TASK_MANAGER_INDEX, id });
  const task = (_source as Record<string, unknown>)?.task as Record<string, unknown> | undefined;
  expect(task).toBeDefined();
  return task!;
};

/** `state.runs` for the recurring UIAM provisioning task doc (`task:uiam_api_key_provisioning`). */
export const readProvisioningTaskRuns = async (esClient: Client, provisioningTaskId: string) => {
  const task = await readTaskAttributes(esClient, taskDocId(provisioningTaskId));
  const state = parseTaskState(task.state);
  return typeof state.runs === 'number' ? state.runs : 0;
};

const readTaskRunAtMs = (task: Record<string, unknown>): number => {
  const raw = task.runAt;
  if (typeof raw === 'string') {
    return new Date(raw).getTime();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  return 0;
};

/** `state.runs` and `task.runAt` for the recurring UIAM provisioning task (ES task doc). */
export const readProvisioningTaskScheduleSnapshot = async (
  esClient: Client,
  provisioningTaskId: string
): Promise<{ runs: number; runAtMs: number }> => {
  const task = await readTaskAttributes(esClient, taskDocId(provisioningTaskId));
  const state = parseTaskState(task.state);
  const runs = typeof state.runs === 'number' ? state.runs : 0;
  return { runs, runAtMs: readTaskRunAtMs(task) };
};

export interface EnsureProvisioningQuietNextRunOpts {
  esClient: Client;
  apiClient: ApiClientFixture;
  cookieHeader: CookieHeader;
  provisioningTaskId: string;
  /** Next `runAt` must be later than `Date.now()` + this (default 30m; recurring schedule is 1d). */
  minNextRunAheadMs?: number;
  /** Max wait for the provisioning task doc to appear. */
  discoveryTimeoutMs?: number;
  /** After `run_soon`, max wait for `runAt` to move into the quiet window. */
  quietAfterRunSoonTimeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Ensures the UIAM provisioning task's next `runAt` is far enough out that Task Manager will not
 * claim it soon (default: >30m, consistent with a post-run ~1d reschedule). If not, calls
 * `run_soon`, waits for a run to finish and the doc to show that quiet `runAt`.
 *
 * @returns `runs` from `task.state` (same as {@link readProvisioningTaskScheduleSnapshot}) and
 * `runAtMs`. Callers that keep the task in this quiet window until a deliberate `run_soon` may use
 * `runs` as the baseline for {@link pollUntilProvisioningTaskRunsAfterBaseline}.
 */
export const ensureProvisioningHasQuietNextRun = async (
  opts: EnsureProvisioningQuietNextRunOpts
): Promise<{ runs: number; runAtMs: number }> => {
  const minAhead = opts.minNextRunAheadMs ?? 30 * 60 * 1000;
  const discoveryTimeoutMs = opts.discoveryTimeoutMs ?? 30_000;
  const quietAfterRunSoonTimeoutMs = opts.quietAfterRunSoonTimeoutMs ?? 180_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 3_000;
  const { esClient, apiClient, cookieHeader, provisioningTaskId } = opts;

  const isQuiet = (runAtMs: number) => runAtMs > Date.now() + minAhead;

  const discoveryDeadline = Date.now() + discoveryTimeoutMs;
  let snapshot: { runs: number; runAtMs: number } | undefined;
  while (Date.now() < discoveryDeadline) {
    try {
      snapshot = await readProvisioningTaskScheduleSnapshot(esClient, provisioningTaskId);
      if (isQuiet(snapshot.runAtMs)) {
        return snapshot;
      }
      break;
    } catch {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  if (!snapshot) {
    throw new Error(
      `Timed out waiting for provisioning task ${provisioningTaskId} document to exist in ${TASK_MANAGER_INDEX}`
    );
  }

  if (isQuiet(snapshot.runAtMs)) {
    return snapshot;
  }

  await runSoon({ apiClient, cookieHeader, taskId: provisioningTaskId });

  const quietDeadline = Date.now() + quietAfterRunSoonTimeoutMs;
  while (Date.now() < quietDeadline) {
    try {
      const next = await readProvisioningTaskScheduleSnapshot(esClient, provisioningTaskId);
      if (isQuiet(next.runAtMs)) {
        return next;
      }
    } catch {
      // task may be mid-update
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for provisioning task ${provisioningTaskId} next runAt to be more than ${minAhead}ms after now (after run_soon)`
  );
};

export interface ExpectedUiamTaskProvisioningStatus {
  status: 'completed' | 'skipped' | 'failed';
  entityType: 'task';
  /** When set, `attributes.message` must contain this substring. */
  messageIncludes?: string;
}

const readUiamProvisioningStatusAttrsFromHit = (
  source: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!source) {
    return undefined;
  }
  return source[UIAM_PROVISIONING_STATUS_TYPE] as Record<string, unknown> | undefined;
};

const uiamProvisioningStatusMatchesExpected = (
  attrs: Record<string, unknown> | undefined,
  entityId: string,
  expected: ExpectedUiamTaskProvisioningStatus
): boolean => {
  if (
    attrs?.status !== expected.status ||
    attrs?.entityType !== expected.entityType ||
    attrs?.entityId !== entityId
  ) {
    return false;
  }
  if (expected.messageIncludes !== undefined) {
    return typeof attrs.message === 'string' && attrs.message.includes(expected.messageIncludes);
  }
  return true;
};

/**
 * After the provisioning task run has finished (e.g. `runs` already advanced), reads the status
 * doc once with an index refresh — no polling loop.
 */
export const readUiamTaskProvisioningStatusDoc = async (
  esClient: Client,
  entityId: string,
  expected: ExpectedUiamTaskProvisioningStatus
): Promise<Record<string, unknown>> => {
  await esClient.indices.refresh({ index: UIAM_PROVISIONING_STATUS_SO_INDEX }).catch(() => {});
  const { hits } = await esClient.search({
    index: UIAM_PROVISIONING_STATUS_SO_INDEX,
    size: 1,
    query: {
      ids: { values: [uiamProvisioningStatusDocId(entityId)] },
    },
  });
  const source = hits.hits[0]?._source as Record<string, unknown> | undefined;
  const attrs = readUiamProvisioningStatusAttrsFromHit(source);
  if (!attrs || !uiamProvisioningStatusMatchesExpected(attrs, entityId, expected)) {
    throw new Error(
      `Expected ${UIAM_PROVISIONING_STATUS_TYPE} doc for ${entityId} to match ${JSON.stringify(
        expected
      )}; got ${JSON.stringify(attrs ?? null)}`
    );
  }
  return attrs;
};

/**
 * Polls ES until the recurring UIAM provisioning task's `state.runs` is strictly greater than
 * `baselineRuns`. The server increments `runs` only after `writeTaskUiamProvisioningObservabilityStatus`
 * completes, so this also gates on observability status writes finishing for that run.
 */
export const pollUntilProvisioningTaskRunsAfterBaseline = async (
  esClient: Client,
  taskId: string,
  baselineRuns: number,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<number> => {
  const id = taskDocId(taskId);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const task = await readTaskAttributes(esClient, id);
      const state = parseTaskState(task.state);
      const runs = typeof state.runs === 'number' ? state.runs : 0;
      if (runs > baselineRuns) {
        return runs;
      }
    } catch {
      // provisioning task doc may not exist yet while the feature flag schedules it
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(
    `Timed out waiting for provisioning task ${taskId} runs to exceed ${baselineRuns} (UIAM provisioning)`
  );
};

export const deleteTaskManagerTaskSilently = async (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  taskId: string
): Promise<void> => {
  await apiClient
    .delete(`internal/task_manager/tasks/${taskId}`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    })
    .catch(() => {});
};

export interface RunSoonOptions {
  apiClient: ApiClientFixture;
  cookieHeader: CookieHeader;
  taskId: string;
}

/**
 * POST `internal/ftr/task_manager/:id/run_soon` (FTR `ftrApis` route; wraps Task Manager `runSoon` with default `force: false`).
 * Returns 200; errors are in the response body as `{ id, error }` per the FTR handler.
 */
export const runSoon = async (options: RunSoonOptions): Promise<void> => {
  const { apiClient, cookieHeader, taskId } = options;
  const res = await apiClient.post(
    `internal/ftr/task_manager/${encodeURIComponent(taskId)}/run_soon`,
    {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    }
  );
  expect(res.statusCode).toBe(200);
};

export interface ScheduleDisabledFixtureTaskOptions {
  apiClient: ApiClientFixture;
  cookieHeader: CookieHeader;
  taskIdsToCleanup: string[];
  /** When true, schedules with `skipRequestForScheduling` (no API key on the task). */
  skipRequestForScheduling?: boolean;
  /**
   * When true (and not `skipRequestForScheduling`), schedules with `onEsKey` so only the ES API
   * key is granted (no UIAM key). Used for UIAM provisioning tests.
   */
  onEsKey?: boolean;
  /**
   * When set, the schedule request uses this auth (e.g. `requestAuth.getApiKeyForAdmin().apiKeyHeader`)
   * instead of the session cookie. The task is then granted the caller’s API key and
   * `userScope.apiKeyCreatedByUser` is true, matching a user–supplied key at schedule time.
   */
  apiKeyHeader?: Record<string, string>;
}

/**
 * Schedules a disabled FTR fixture task via Task Manager and records its id for cleanup.
 */
export const scheduleDisabledFixtureTask = async (
  options: ScheduleDisabledFixtureTaskOptions
): Promise<string> => {
  const {
    apiClient,
    cookieHeader,
    taskIdsToCleanup,
    skipRequestForScheduling = false,
    onEsKey = false,
    apiKeyHeader,
  } = options;
  const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
    headers: {
      ...COMMON_HEADERS,
      ...(apiKeyHeader ?? cookieHeader),
    },
    body: {
      task: {
        taskType: TEST_TASK_TYPE,
        params: {},
        state: {},
        enabled: false,
      },
      ...(skipRequestForScheduling ? { skipRequestForScheduling: true } : {}),
      ...(!skipRequestForScheduling && onEsKey ? { onEsKey: true } : {}),
    },
    responseType: 'json',
  });
  expect(scheduleResponse).toHaveStatusCode(200);
  const id = (scheduleResponse.body as { id: string }).id;
  taskIdsToCleanup.push(id);
  return id;
};
