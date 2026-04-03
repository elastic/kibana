/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for OwnerSyncTaskRunner.
 *
 * Strategy
 * ────────
 * We mock the ES client, saved-objects client, and utility functions so we
 * can drive every code path without a running Elasticsearch cluster.
 *
 * Test groups
 * ───────────
 *  1. Guard clauses         – analytics disabled, no enabled spaces
 *  2. Idle mode             – spaces in idle mode are skipped; idle → active
 *  3. Status polling        – RUNNING / COMPLETED / FAILED in-flight tasks
 *  4. msearch               – new-docs detection, error handling
 *  5. Concurrency cap       – respect reindexConcurrency limit
 *  6. Idle threshold        – enter idle after IDLE_THRESHOLD empty runs
 *  7. State persistence     – returned state reflects all transitions
 *  8. Configure SO updates  – analytics_last_sync_at / analytics_sync_status
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import { getIndicesForOwnerAndSpace } from '../..';
import { OwnerSyncTaskRunner } from './owner_sync_task_runner';
import type { OwnerSyncTaskState } from './owner_sync_task_runner';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../utils');
const getSpacesWithAnalyticsEnabledMock = getSpacesWithAnalyticsEnabled as jest.Mock;

jest.mock('../..');
const getIndicesForOwnerAndSpaceMock = getIndicesForOwnerAndSpace as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const OWNER = 'securitySolution' as const;
const SPACE = 'default';
const SPACE_2 = 'test-space';

/** Minimal ConcreteTaskInstance with just what the runner reads. */
function makeTaskInstance(state: Partial<OwnerSyncTaskState> = {}): ConcreteTaskInstance {
  return {
    id: `cai_cases_analytics_owner_sync_${OWNER}`,
    taskType: 'cai:cases_analytics_owner_sync',
    params: { owner: OWNER },
    state: { spaceStates: {}, ...state },
    attempts: 0,
    ownedByMe: true,
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: new Date(),
    retryAt: null,
    status: 'running',
    version: '1',
    enabled: true,
  } as unknown as ConcreteTaskInstance;
}

const analyticsConfig = {
  index: { enabled: true, reindexConcurrency: 3, maxAnalyticsEnabledSpaces: 100 },
};

const analyticsConfigDisabled = {
  index: { enabled: false, reindexConcurrency: 3, maxAnalyticsEnabledSpaces: 100 },
};

/** Build an msearch response where every space has no new docs (total = 0). */
function buildEmptyMsearchResponse(numSpaces: number, numSyncTypes: number = 2) {
  return {
    responses: Array.from({ length: numSpaces * numSyncTypes }, () => ({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    })),
  };
}

/** Build an msearch response where every space has new docs (total = 1). */
function buildHitMsearchResponse(numSpaces: number, numSyncTypes: number = 2) {
  return {
    responses: Array.from({ length: numSpaces * numSyncTypes }, () => ({
      hits: { total: { value: 1, relation: 'eq' }, hits: [] },
    })),
  };
}

/** Build an ES reindex-task response (not completed, i.e., still running). */
const runningTaskResponse = { completed: false };

/** Build an ES reindex-task response (completed, no failures). */
const completedTaskResponse = {
  completed: true,
  response: { failures: [] },
};

/** Build an ES reindex-task response (completed with failures). */
const failedTaskResponse = {
  completed: true,
  response: { failures: [{ shard: 0, reason: { type: 'error', reason: 'test' } }] },
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('OwnerSyncTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();
  const getESClient = jest.fn().mockResolvedValue(esClient);
  const getUnsecureSavedObjectsClient = jest.fn().mockResolvedValue(soClient);

  /** Pre-canned mapping response with a valid painless script id. */
  const mappingWithScript = {
    [`.internal.cases-analytics.${OWNER.toLowerCase()}-${SPACE}`]: {
      mappings: { _meta: { painless_script_id: 'test-script-id' } },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: owner has one enabled space
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue([{ spaceId: SPACE, owner: OWNER }]);

    // Default: getIndicesForOwnerAndSpace returns a single expected internal index name
    getIndicesForOwnerAndSpaceMock.mockReturnValue([
      `.internal.cases-analytics.${OWNER.toLowerCase()}-${SPACE}`,
    ]);

    // Default: the pre-fetched indices.get (used by fanOutReindexes) shows the index exists
    esClient.indices.get.mockResolvedValue({
      [`.internal.cases-analytics.${OWNER.toLowerCase()}-${SPACE}`]: {},
    } as unknown as Awaited<ReturnType<typeof esClient.indices.get>>);

    // Default: msearch returns no new docs
    esClient.msearch.mockResolvedValue(
      buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
    );

    // Default: mapping returns script id
    esClient.indices.getMapping.mockResolvedValue(
      mappingWithScript as unknown as Awaited<ReturnType<typeof esClient.indices.getMapping>>
    );

    // Default: script exists
    esClient.getScript.mockResolvedValue({ found: true, script: {} } as unknown as Awaited<
      ReturnType<typeof esClient.getScript>
    >);

    // Default: reindex returns a task id
    esClient.reindex.mockResolvedValue({ task: 'reindex-task-1' } as unknown as Awaited<
      ReturnType<typeof esClient.reindex>
    >);

    // Default: in-flight task check returns completed
    esClient.tasks.get.mockResolvedValue(
      completedTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
    );

    // Default: SO find returns a configure SO with namespaces so updateConfigureSOs can match
    // it to the correct spaceId. bulkUpdate is used for the actual update (not per-SO update).
    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'cfg-1', namespaces: ['default'], attributes: {} }],
      total: 1,
      per_page: 10000,
    } as unknown as Awaited<ReturnType<typeof soClient.find>>);
    soClient.bulkUpdate.mockResolvedValue({
      saved_objects: [],
    } as unknown as Awaited<ReturnType<typeof soClient.bulkUpdate>>);
  });

  // ── 1. Guard clauses ─────────────────────────────────────────────────────────

  describe('guard clauses', () => {
    it('does nothing when analytics.index.enabled = false', async () => {
      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig: analyticsConfigDisabled,
      });

      await runner.run();

      expect(getSpacesWithAnalyticsEnabledMock).not.toHaveBeenCalled();
    });

    it('returns previous state unchanged when no enabled spaces for this owner', async () => {
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue([]);
      const previousState: OwnerSyncTaskState = {
        spaceStates: { [SPACE]: { consecutiveEmptyRuns: 2, syncTasks: {} } },
      };

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(previousState),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // Enabled-for-other-owner pairs are filtered; state should be empty (no spaces)
      expect(esClient.msearch).not.toHaveBeenCalled();
    });

    it('filters out spaces belonging to other owners', async () => {
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue([
        { spaceId: SPACE, owner: 'observability' }, // different owner
      ]);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(esClient.msearch).not.toHaveBeenCalled();
    });
  });

  // ── 2. Idle mode ─────────────────────────────────────────────────────────────

  describe('idle mode', () => {
    it('skips spaces whose nextSyncAt is in the future', async () => {
      const nextSyncAt = new Date(Date.now() + 60_000).toISOString(); // 1 min from now
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 5, nextSyncAt, syncTasks: {} },
        },
      };

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // No msearch because only space is idle
      expect(esClient.msearch).not.toHaveBeenCalled();
    });

    it('checks for new docs when the idle window expires', async () => {
      const nextSyncAt = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 0, nextSyncAt, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // msearch is called to check for new docs even while in idle
      expect(esClient.msearch).toHaveBeenCalledTimes(1);
    });

    it('stays idle and extends nextSyncAt when no new docs are found after idle window expires', async () => {
      const nextSyncAt = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 0, nextSyncAt, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      // Space must remain idle — nextSyncAt is extended, not cleared
      const nextSyncAtResult = result?.state.spaceStates[SPACE].nextSyncAt;
      expect(nextSyncAtResult).toBeDefined();
      expect(new Date(nextSyncAtResult!).getTime()).toBeGreaterThan(Date.now());
    });

    it('resets consecutiveEmptyRuns when new docs are found after idle', async () => {
      const nextSyncAt = new Date(Date.now() - 60_000).toISOString();
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 7, nextSyncAt, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      expect(result?.state.spaceStates[SPACE].consecutiveEmptyRuns).toBe(0);
      expect(result?.state.spaceStates[SPACE].nextSyncAt).toBeUndefined();
    });
  });

  // ── 3. Status polling ─────────────────────────────────────────────────────────

  describe('in-flight reindex task status polling', () => {
    it('keeps RUNNING task ids in state and counts them toward the cap', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: {
            consecutiveEmptyRuns: 0,
            syncTasks: {
              cai_content_sync: {
                esReindexTaskId: 'existing-task-1',
                lastSyncAttempt: new Date().toISOString(),
              },
            },
          },
        },
      };

      esClient.tasks.get.mockResolvedValue(
        runningTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
      );
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig: {
          index: { enabled: true, reindexConcurrency: 1, maxAnalyticsEnabledSpaces: 100 },
        }, // cap = 1
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      // RUNNING task is kept in state
      expect(result?.state.spaceStates[SPACE].syncTasks.cai_content_sync?.esReindexTaskId).toBe(
        'existing-task-1'
      );

      // cap reached → no NEW reindex was started for cai_activity_sync
      expect(esClient.reindex).not.toHaveBeenCalled();
    });

    it('clears COMPLETED task id and promotes lastSyncAttempt to lastSyncSuccess', async () => {
      const attempt = new Date('2025-01-01T12:00:00Z').toISOString();
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: {
            consecutiveEmptyRuns: 0,
            syncTasks: {
              cai_content_sync: {
                esReindexTaskId: 'done-task',
                lastSyncAttempt: attempt,
              },
            },
          },
        },
      };

      esClient.tasks.get.mockResolvedValue(
        completedTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
      );
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      const sub = result?.state.spaceStates[SPACE].syncTasks.cai_content_sync;
      expect(sub?.esReindexTaskId).toBeUndefined();
      expect(sub?.lastSyncSuccess).toBe(attempt);
    });

    it('clears FAILED task id so it will be retried next run', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: {
            consecutiveEmptyRuns: 0,
            syncTasks: {
              cai_content_sync: { esReindexTaskId: 'failed-task' },
            },
          },
        },
      };

      esClient.tasks.get.mockResolvedValue(
        failedTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
      );
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      const sub = result?.state.spaceStates[SPACE].syncTasks.cai_content_sync;
      expect(sub?.esReindexTaskId).toBeUndefined();
    });
  });

  // ── 4. msearch ────────────────────────────────────────────────────────────────

  describe('msearch new-doc detection', () => {
    it('starts a reindex when msearch reports new docs', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(esClient.reindex).toHaveBeenCalledWith(
        expect.objectContaining({
          conflicts: 'proceed',
          wait_for_completion: false,
        })
      );
    });

    it('does NOT start a reindex when msearch reports zero docs and no ongoing tasks', async () => {
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(esClient.reindex).not.toHaveBeenCalled();
    });

    it('treats an msearch sub-response error as having new docs (safe side)', async () => {
      esClient.msearch.mockResolvedValue({
        responses: [
          { error: { reason: 'index missing', type: 'index_not_found_exception' } },
          { hits: { total: { value: 0 }, hits: [] } },
        ],
      } as unknown as Awaited<ReturnType<typeof esClient.msearch>>);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // Space treated as having new docs → reindex is started
      expect(esClient.reindex).toHaveBeenCalled();
    });

    it('skips reindex when destination index does not exist', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );
      // Empty indices.get response — no analytics indices exist in the pre-fetched set
      esClient.indices.get.mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(esClient.reindex).not.toHaveBeenCalled();
    });
  });

  // ── 5. Concurrency cap ────────────────────────────────────────────────────────

  describe('concurrency cap', () => {
    it('starts no more than reindexConcurrency reindexes per run', async () => {
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue([
        { spaceId: SPACE, owner: OWNER },
        { spaceId: SPACE_2, owner: OWNER },
      ]);

      // Indices exist for both spaces
      esClient.indices.exists.mockResolvedValue(true);

      // Both spaces have new docs
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(2) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      // Each getMapping call returns the script id for the respective index
      esClient.indices.getMapping.mockImplementation((params) => {
        return Promise.resolve({
          [String(params?.index)]: {
            mappings: { _meta: { painless_script_id: 'test-script-id' } },
          },
        } as unknown as Awaited<ReturnType<typeof esClient.indices.getMapping>>);
      });

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig: {
          index: { enabled: true, reindexConcurrency: 1, maxAnalyticsEnabledSpaces: 100 },
        }, // cap = 1
      });

      await runner.run();

      // With cap=1 and 2 spaces × 2 syncTypes = 4 potential reindexes,
      // only 1 should actually start.
      expect(esClient.reindex).toHaveBeenCalledTimes(1);
    });
  });

  // ── 6. Idle threshold ─────────────────────────────────────────────────────────

  describe('idle threshold', () => {
    it('increments consecutiveEmptyRuns when no new docs found', async () => {
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      expect(result?.state.spaceStates[SPACE].consecutiveEmptyRuns).toBe(1);
    });

    it('enters idle mode after 5 consecutive empty runs', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 4, syncTasks: {} }, // one more will tip it
        },
      };

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      const spaceState = result?.state.spaceStates[SPACE];
      // Counter is reset to 0 on idle entry so re-wakeups produce a clean single log line
      expect(spaceState.consecutiveEmptyRuns).toBe(0);
      expect(spaceState.nextSyncAt).toBeDefined();

      // nextSyncAt should be approximately 30 minutes from now
      const nextSync = new Date(spaceState.nextSyncAt!).getTime();
      const diff = nextSync - Date.now();
      expect(diff).toBeGreaterThan(29 * 60 * 1_000);
      expect(diff).toBeLessThan(31 * 60 * 1_000);
    });

    it('resets idle counter when new docs are found', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 3, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      expect(result?.state.spaceStates[SPACE].consecutiveEmptyRuns).toBe(0);
      expect(result?.state.spaceStates[SPACE].nextSyncAt).toBeUndefined();
    });
  });

  // ── 7. State persistence ──────────────────────────────────────────────────────

  describe('state persistence', () => {
    it('prunes state entries for spaces no longer in the enabled list', async () => {
      // Previously both spaces; now only SPACE is enabled
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 0, syncTasks: {} },
          [SPACE_2]: { consecutiveEmptyRuns: 2, syncTasks: {} },
        },
      };

      getSpacesWithAnalyticsEnabledMock.mockResolvedValue([{ spaceId: SPACE, owner: OWNER }]);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      expect(result?.state.spaceStates[SPACE_2]).toBeUndefined();
      expect(result?.state.spaceStates[SPACE]).toBeDefined();
    });

    it('stores the ES reindex task id in state after starting a reindex', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );
      esClient.reindex.mockResolvedValue({ task: 'new-task-42' });

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      const result = (await runner.run()) as { state: OwnerSyncTaskState };

      const syncTasks = result?.state.spaceStates[SPACE].syncTasks;
      const startedTask = Object.values(syncTasks).find((s) => s?.esReindexTaskId);
      expect(startedTask?.esReindexTaskId).toBe('new-task-42');
    });
  });

  // ── 8. Configure SO updates ───────────────────────────────────────────────────

  describe('configure SO updates', () => {
    it('writes analytics_sync_status=active to the configure SO when syncing', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // Wait for the fire-and-forget SO update
      await new Promise((r) => setTimeout(r, 10));

      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cfg-1',
            attributes: expect.objectContaining({ analytics_sync_status: 'active' }),
          }),
        ])
      );
    });

    it('writes analytics_sync_status=idle to the configure SO when entering idle', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 4, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // Wait for the fire-and-forget SO update
      await new Promise((r) => setTimeout(r, 10));

      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cfg-1',
            attributes: expect.objectContaining({ analytics_sync_status: 'idle' }),
          }),
        ])
      );
    });

    it('writes analytics_last_sync_at when new reindexes are started', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cfg-1',
            attributes: expect.objectContaining({ analytics_last_sync_at: expect.any(String) }),
          }),
        ])
      );
    });

    it('writes analytics_last_sync_at when a previously-started reindex completes (even with no new docs)', async () => {
      /*
       * FAILURE SCENARIO: task runs, in-flight reindex completes (Phase 3), but no new
       * docs exist so no new reindex is started. Without the spacesWithCompletedReindex
       * fix, syncStartSet is empty and analytics_last_sync_at is never written to the SO,
       * leaving the UI timestamp permanently stale.
       */
      const attempt = new Date('2025-01-01T12:00:00Z').toISOString();
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: {
            consecutiveEmptyRuns: 0,
            syncTasks: {
              cai_content_sync: {
                esReindexTaskId: 'completing-task',
                lastSyncAttempt: attempt,
              },
            },
          },
        },
      };

      // Reindex task completed
      esClient.tasks.get.mockResolvedValue(
        completedTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
      );
      // No new docs → no new reindex will be started
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      // analytics_last_sync_at MUST be written even though no new reindex was started
      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cfg-1',
            attributes: expect.objectContaining({ analytics_last_sync_at: expect.any(String) }),
          }),
        ])
      );
    });

    it('does NOT update SO when the SO namespaces do not match any tracked space', async () => {
      // SO lives in 'other-space' which is not in spaceStates
      soClient.find.mockResolvedValue({
        saved_objects: [{ id: 'cfg-orphan', namespaces: ['other-space'], attributes: {} }],
        total: 1,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>);

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      // bulkUpdate should not be called because no matching SOs were found
      expect(soClient.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  // ── 9. Scale behaviour ────────────────────────────────────────────────────────

  describe('scale behaviour', () => {
    it('uses a single indices.get round-trip for fanOutReindexes regardless of space count', async () => {
      const numSpaces = 100;
      const spaces = Array.from({ length: numSpaces }, (_, i) => ({
        spaceId: `space-${i}`,
        owner: OWNER,
      }));
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue(spaces);

      // All spaces have new docs → all are runable
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(numSpaces) as unknown as Awaited<
          ReturnType<typeof esClient.msearch>
        >
      );

      // Pre-fetched set contains the index for every space
      const existingIndices = Object.fromEntries(
        spaces.map(({ spaceId }) => [
          `.internal.cases-analytics.${OWNER.toLowerCase()}-${spaceId}`,
          {},
        ])
      );
      esClient.indices.get.mockResolvedValue(
        existingIndices as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
      );
      getIndicesForOwnerAndSpaceMock.mockImplementation((spaceId: string) => [
        `.internal.cases-analytics.${OWNER.toLowerCase()}-${spaceId}`,
      ]);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig: {
          index: { enabled: true, reindexConcurrency: 10, maxAnalyticsEnabledSpaces: 100 },
        },
      });

      await runner.run();

      // Should be exactly ONE indices.get call — not one per space
      expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    });

    it('sends msearch in multiple chunks when spaces exceed MSEARCH_CHUNK_SIZE (500)', async () => {
      const numSpaces = 501;
      const spaces = Array.from({ length: numSpaces }, (_, i) => ({
        spaceId: `space-${i}`,
        owner: OWNER,
      }));
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue(spaces);

      // Chunk 1: 500 spaces × 2 sync types = 1000 sub-query responses
      // Chunk 2: 1 space  × 2 sync types = 2 sub-query responses
      esClient.msearch
        .mockResolvedValueOnce(
          buildEmptyMsearchResponse(500) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
        )
        .mockResolvedValueOnce(
          buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
        );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      // msearch must be called twice — one call per 500-space chunk
      expect(esClient.msearch).toHaveBeenCalledTimes(2);
      // First chunk contains 500 spaces × 2 sync types × 2 items (header+body) = 2000 entries
      expect((esClient.msearch.mock.calls[0][0] as { searches: unknown[] }).searches).toHaveLength(
        500 * 2 * 2
      );
      // Second chunk contains 1 space × 2 sync types × 2 items = 4 entries
      expect((esClient.msearch.mock.calls[1][0] as { searches: unknown[] }).searches).toHaveLength(
        1 * 2 * 2
      );
    });

    it('issues a single bulkUpdate call for updateConfigureSOs regardless of space count', async () => {
      const numSpaces = 50;
      const spaces = Array.from({ length: numSpaces }, (_, i) => ({
        spaceId: `space-${i}`,
        owner: OWNER,
      }));
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue(spaces);

      // soClient.find returns one SO per space (all in one page)
      soClient.find.mockResolvedValue({
        saved_objects: spaces.map(({ spaceId }, i) => ({
          id: `cfg-${i}`,
          namespaces: [spaceId],
          attributes: {},
        })),
        total: numSpaces,
        per_page: 10000,
      } as unknown as Awaited<ReturnType<typeof soClient.find>>);

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(numSpaces) as unknown as Awaited<
          ReturnType<typeof esClient.msearch>
        >
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      // soClient.find is called once (not once per space)
      expect(soClient.find).toHaveBeenCalledTimes(1);
      // soClient.bulkUpdate is called once with all spaces in a single batch
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      const bulkArgs = soClient.bulkUpdate.mock.calls[0][0] as Array<{ id: string }>;
      expect(bulkArgs).toHaveLength(numSpaces);
    });

    it('paginates updateConfigureSOs when find returns a full first page', async () => {
      getSpacesWithAnalyticsEnabledMock.mockResolvedValue([{ spaceId: SPACE, owner: OWNER }]);

      // Page 1: exactly 10 000 results (full page) → loop must request page 2
      const page1SOs = Array.from({ length: 10000 }, (_, i) => ({
        id: `cfg-${i}`,
        namespaces: [SPACE],
        attributes: {},
      }));
      // Page 2: 1 result → last page
      const page2SOs = [{ id: 'cfg-last', namespaces: [SPACE], attributes: {} }];

      soClient.find
        .mockResolvedValueOnce({
          saved_objects: page1SOs,
          total: 10001,
          per_page: 10000,
        } as unknown as Awaited<ReturnType<typeof soClient.find>>)
        .mockResolvedValueOnce({
          saved_objects: page2SOs,
          total: 10001,
          per_page: 10000,
        } as unknown as Awaited<ReturnType<typeof soClient.find>>);

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      // Both pages must have been fetched
      expect(soClient.find).toHaveBeenCalledTimes(2);
      expect(soClient.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));
      expect(soClient.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
      // All 10 001 SOs should appear in the single bulkUpdate call
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate.mock.calls[0][0] as Array<{ id: string }>).toHaveLength(10001);
    });
  });

  // ── 10. Logging ───────────────────────────────────────────────────────────────

  describe('logging', () => {
    it('emits info entry and completion logs on a successful run', async () => {
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting owner sync run'),
        expect.objectContaining({ owner: OWNER, executionId: expect.any(String) })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Owner sync run complete'),
        expect.objectContaining({
          owner: OWNER,
          executionId: expect.any(String),
          enabledSpaces: expect.any(Number),
          durationMs: expect.any(Number),
        })
      );
    });

    it('uses the same executionId across all log calls within a single run', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      await new Promise((r) => setTimeout(r, 10));

      const allCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.debug as jest.Mock).mock.calls,
      ];

      const ids = allCalls
        .map(([, meta]) => (meta as Record<string, unknown>)?.executionId)
        .filter(Boolean);

      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(1);
    });

    it('generates a different executionId for each run invocation', async () => {
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      const first = (logger.info as jest.Mock).mock.calls.find(([msg]) =>
        msg.includes('Starting owner sync run')
      )?.[1]?.executionId;

      jest.clearAllMocks();
      await runner.run();
      const second = (logger.info as jest.Mock).mock.calls.find(([msg]) =>
        msg.includes('Starting owner sync run')
      )?.[1]?.executionId;

      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first).not.toBe(second);
    });

    it('logs debug when analytics is disabled — no info entry log', async () => {
      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig: analyticsConfigDisabled,
      });

      await runner.run();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Analytics index is disabled'),
        expect.objectContaining({ executionId: expect.any(String) })
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('logs warn with raw Error when failed SO update (updateConfigureSOs) rejects', async () => {
      const soError = new Error('SO update failed');
      soClient.bulkUpdate.mockRejectedValue(soError);

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();
      // Wait for the fire-and-forget catch to execute
      await new Promise((r) => setTimeout(r, 10));

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update configure SOs'),
        expect.objectContaining({
          owner: OWNER,
          executionId: expect.any(String),
          error: soError,
        })
      );
      const [, meta] = (logger.warn as jest.Mock).mock.calls.find(([msg]) =>
        msg.includes('Failed to update configure SOs')
      )!;
      expect(meta.error).toBeInstanceOf(Error);
      expect(meta.error.message).toBe('SO update failed');
    });

    it('logs warn with raw Error when mapping fetch fails in startReindex', async () => {
      esClient.msearch.mockResolvedValue(
        buildHitMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );
      const mappingError = new Error('ES mapping fetch failed');
      esClient.indices.getMapping.mockRejectedValue(mappingError);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      const warnCall = (logger.warn as jest.Mock).mock.calls.find(([msg]) =>
        msg.includes('Failed to get mapping')
      );
      expect(warnCall).toBeDefined();
      const [, meta] = warnCall!;
      expect(meta.error).toBeInstanceOf(Error);
      expect(meta.error.message).toBe('ES mapping fetch failed');
      expect(meta.executionId).toEqual(expect.any(String));
    });

    it('logs warn with structured metadata when msearch sub-query returns an error', async () => {
      esClient.msearch.mockResolvedValue({
        responses: [
          { error: { reason: 'index missing', type: 'index_not_found_exception' } },
          { hits: { total: { value: 0 }, hits: [] } },
        ],
      } as unknown as Awaited<ReturnType<typeof esClient.msearch>>);

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('msearch sub-query error'),
        expect.objectContaining({
          owner: OWNER,
          executionId: expect.any(String),
          msearchError: expect.objectContaining({ type: 'index_not_found_exception' }),
        })
      );
    });

    it('logs warn when a reindex task fails or is not found in ES', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: {
            consecutiveEmptyRuns: 0,
            syncTasks: {
              cai_content_sync: { esReindexTaskId: 'failed-task-id' },
            },
          },
        },
      };

      esClient.tasks.get.mockResolvedValue(
        failedTaskResponse as unknown as Awaited<ReturnType<typeof esClient.tasks.get>>
      );
      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed or not found — clearing for retry'),
        expect.objectContaining({
          owner: OWNER,
          spaceId: SPACE,
          executionId: expect.any(String),
          esReindexTaskId: 'failed-task-id',
        })
      );
    });

    it('logs info when space enters idle mode, with executionId and nextSyncAt', async () => {
      const state: OwnerSyncTaskState = {
        spaceStates: {
          [SPACE]: { consecutiveEmptyRuns: 4, syncTasks: {} },
        },
      };

      esClient.msearch.mockResolvedValue(
        buildEmptyMsearchResponse(1) as unknown as Awaited<ReturnType<typeof esClient.msearch>>
      );

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(state),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await runner.run();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Idle mode: no activity detected'),
        expect.objectContaining({
          owner: OWNER,
          spaceId: SPACE,
          executionId: expect.any(String),
          nextSyncAt: expect.any(String),
        })
      );
    });

    it('logs error (not warn) for unrecoverable sync failure, with raw Error and executionId', async () => {
      getSpacesWithAnalyticsEnabledMock.mockRejectedValue(new Error('SO client exploded'));

      const runner = new OwnerSyncTaskRunner({
        taskInstance: makeTaskInstance(),
        getESClient,
        getUnsecureSavedObjectsClient,
        logger,
        analyticsConfig,
      });

      await expect(runner.run()).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unrecoverable sync failure'),
        expect.objectContaining({
          owner: OWNER,
          executionId: expect.any(String),
          error: expect.any(Error),
        })
      );
      const [, meta] = (logger.error as jest.Mock).mock.calls.find(([msg]) =>
        msg.includes('Unrecoverable sync failure')
      )!;
      expect(meta.error).toBeInstanceOf(Error);
      expect(meta.error.message).toBe('SO client exploded');
      // Must not have downgraded to warn
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Unrecoverable'),
        expect.anything()
      );
    });
  });
});
