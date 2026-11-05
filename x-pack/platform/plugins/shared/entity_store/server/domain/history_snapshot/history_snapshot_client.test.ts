/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { HistorySnapshotClient } from './history_snapshot_client';
import type { HistorySnapshotRun } from './history_snapshot_client';
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';
import {
  cancelTask,
  createIndex,
  pollTaskUntil,
  startReindex,
  startUpdateByQueryWithScript,
  toReindexResult,
} from '../../infra/elasticsearch';
import { deleteExpiredHistorySnapshots } from './expire_history_snapshots';
import { DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS } from '../saved_objects';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';

jest.mock('../../infra/elasticsearch');
jest.mock('./expire_history_snapshots');
jest.mock('../asset_manager/resolve_entity_store_indices');

const mockCreateIndex = createIndex as jest.MockedFunction<typeof createIndex>;
const mockStartReindex = startReindex as jest.MockedFunction<typeof startReindex>;
const mockStartUpdateByQuery = startUpdateByQueryWithScript as jest.MockedFunction<
  typeof startUpdateByQueryWithScript
>;
const mockPollTaskUntil = pollTaskUntil as jest.MockedFunction<typeof pollTaskUntil>;
const mockCancelTask = cancelTask as jest.MockedFunction<typeof cancelTask>;

const completed = (response: Record<string, unknown>) => ({
  status: 'completed' as const,
  response,
});
const mockDeleteExpiredHistorySnapshots = deleteExpiredHistorySnapshots as jest.MockedFunction<
  typeof deleteExpiredHistorySnapshots
>;
const mockResolveLatestEntitiesIndexName = resolveLatestEntitiesIndexName as jest.MockedFunction<
  typeof resolveLatestEntitiesIndexName
>;

const mockGlobalStateStarted = {
  historySnapshot: { status: 'started' as const, frequency: '24h' },
  logsExtraction: {},
};

function createMockGlobalStateClient(overrides?: { status?: 'started' | 'stopped' }) {
  const historySnapshot = {
    ...mockGlobalStateStarted.historySnapshot,
    ...(overrides?.status && { status: overrides.status }),
  };
  return {
    findOrThrow: jest.fn().mockResolvedValue({
      ...mockGlobalStateStarted,
      historySnapshot,
    }),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockTaskManager() {
  // Default: return the task in tasks[] so callers see it as "changed".
  // Tests that need the already-in-desired-state path override with tasks: [].
  return {
    bulkEnable: jest.fn().mockResolvedValue({
      tasks: [{ id: 'entity_store:v2:history_snapshot_task:default' }],
      errors: [],
    }),
    bulkDisable: jest.fn().mockResolvedValue({
      tasks: [{ id: 'entity_store:v2:history_snapshot_task:default' }],
      errors: [],
    }),
    runSoon: jest.fn().mockResolvedValue({ id: 'entity_store:v2:history_snapshot_task:default' }),
    bulkUpdateState: jest.fn().mockResolvedValue({ tasks: [], errors: [] }),
    ensureScheduled: jest
      .fn()
      .mockResolvedValue({ id: 'entity_store:v2:history_snapshot_task:default' }),
  };
}

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('HistorySnapshotClient', () => {
  const namespace = 'default';
  const taskId = 'entity_store:v2:history_snapshot_task:default';
  const request = { headers: {} } as KibanaRequest;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockInternalEsClient: jest.Mocked<ElasticsearchClient>;
  let mockGlobalStateClient: ReturnType<typeof createMockGlobalStateClient>;
  let mockTaskManager: ReturnType<typeof createMockTaskManager>;
  let client: HistorySnapshotClient;

  const createClient = () => {
    mockLogger = loggerMock.create();
    return new HistorySnapshotClient({
      logger: mockLogger,
      esClient: mockEsClient,
      internalEsClient: mockInternalEsClient,
      namespace,
      globalStateClient:
        mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
      taskManager: mockTaskManager as unknown as TaskManagerStartContract,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteExpiredHistorySnapshots.mockResolvedValue({ deleted: [] });
    jest
      .mocked(toReindexResult)
      .mockImplementation(jest.requireActual('../../infra/elasticsearch/reindex').toReindexResult);
    mockLogger = loggerMock.create();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockInternalEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockGlobalStateClient = createMockGlobalStateClient();
    mockTaskManager = createMockTaskManager();
    mockResolveLatestEntitiesIndexName.mockResolvedValue('.entities.v2.latest.default-00001');
    client = createClient();
  });

  describe('updateConfig', () => {
    it('persists interval and retention and reschedules the task', async () => {
      await client.updateConfig(request, { frequency: '12h', retentionDays: 90 });

      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { frequency: '12h', retentionDays: 90 },
      });
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          taskType: 'entity_store:v2:history_snapshot_task',
          schedule: { interval: '12h' },
          state: { namespace },
          params: {},
        }),
        { request }
      );
    });

    it('persists retention without rescheduling when the interval is omitted', async () => {
      await client.updateConfig(request, { retentionDays: 15 });

      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { retentionDays: 15 },
      });
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('persists interval and reschedules when retention is omitted', async () => {
      await client.updateConfig(request, { frequency: '6h' });

      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { frequency: '6h' },
      });
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          schedule: { interval: '6h' },
        }),
        { request }
      );
    });

    it('does nothing when no params are passed', async () => {
      await client.updateConfig(request, {});

      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('does not reschedule when persisting the config fails', async () => {
      mockGlobalStateClient.update.mockRejectedValueOnce(new Error('not found'));

      await expect(
        client.updateConfig(request, { frequency: '2h', retentionDays: 10 })
      ).rejects.toThrow('not found');
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('runHistorySnapshot', () => {
    const latestIndex = '.entities.v2.latest.default-00001';

    const savedRun = (overrides: Partial<HistorySnapshotRun> = {}): HistorySnapshotRun => ({
      phase: 'reindex',
      esTaskId: 'node:1',
      latestIndex,
      historySnapshotIndex: '.entities.v2.history.default.2026-11-03-08',
      timestampNow: '2026-11-03T08:00:00.000Z',
      cycleStartedAt: '2026-11-03T08:00:00.000Z',
      phaseStartedAt: '2026-11-03T08:00:00.000Z',
      ...overrides,
    });

    beforeEach(() => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockStartReindex.mockResolvedValue('node:reindex');
      mockStartUpdateByQuery.mockResolvedValue('node:reset');
    });

    it('returns success with docCount and resetCount when reindex and updateByQuery succeed', async () => {
      mockPollTaskUntil
        .mockResolvedValueOnce(completed({ total: 5, created: 5 }))
        .mockResolvedValueOnce(completed({ updated: 5, total: 5 }));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && 'docCount' in result) {
        expect(result.docCount).toBe(5);
        expect(result.resetCount).toBe(5);
        expect(result.historySnapshotIndex).toMatch(
          /\.entities\.v2\.history\.default\.\d{4}-\d{2}-\d{2}-\d{2}$/
        );
      }
      expect(mockCreateIndex).toHaveBeenCalledTimes(1);
      expect(mockStartReindex).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          source: { index: latestIndex },
          dest: { index: expect.stringMatching(/\.entities\.v2\.history\.default\./) },
        })
      );
      expect(mockStartUpdateByQuery).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          index: latestIndex,
          query: { match_all: {} },
          script: HISTORY_SNAPSHOT_RESET_SCRIPT,
          params: expect.objectContaining({ timestampNow: expect.any(String) }),
        })
      );
      expect(mockPollTaskUntil).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ taskId: 'node:reindex', deadline: undefined })
      );
      expect(mockPollTaskUntil).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ taskId: 'node:reset' })
      );
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { lastExecutionTimestamp: expect.any(String), lastError: null },
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: mockEsClient,
          namespace,
          retentionDays: 60,
        })
      );
    });

    it('uses nested entity field access in the reset script (no flat dotted keys)', () => {
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.lifecycle');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.behaviors');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).not.toMatch(/ctx\._source\s*\[\s*['"]entity\./);
    });

    it('returns success with docCount 0 and resetCount 0 when latest index has no docs', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ total: 0 }));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && 'docCount' in result) {
        expect(result.docCount).toBe(0);
        expect(result.resetCount).toBe(0);
      }
      expect(mockStartUpdateByQuery).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { lastExecutionTimestamp: expect.any(String), lastError: null },
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('returns in progress with the reindex task when the deadline passes', async () => {
      mockPollTaskUntil.mockResolvedValueOnce({ status: 'pending' });
      const deadline = Date.now() + 1000;

      const result = await client.runHistorySnapshot({ deadline });

      expect(result).toEqual({
        ok: true,
        inProgress: true,
        run: expect.objectContaining({
          phase: 'reindex',
          esTaskId: 'node:reindex',
          latestIndex,
          historySnapshotIndex: expect.stringMatching(/\.entities\.v2\.history\.default\./),
        }),
      });
      expect(mockPollTaskUntil).toHaveBeenCalledWith(expect.objectContaining({ deadline }));
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
      expect(mockDeleteExpiredHistorySnapshots).not.toHaveBeenCalled();
    });

    it('returns in progress with the reset task and doc count when the deadline passes during the reset', async () => {
      mockPollTaskUntil
        .mockResolvedValueOnce(completed({ total: 7 }))
        .mockResolvedValueOnce({ status: 'pending' });

      const result = await client.runHistorySnapshot({ deadline: Date.now() + 1000 });

      expect(result).toEqual({
        ok: true,
        inProgress: true,
        run: expect.objectContaining({ phase: 'reset', esTaskId: 'node:reset', docCount: 7 }),
      });
    });

    it('resumes a saved reindex without starting a new one', async () => {
      mockPollTaskUntil
        .mockResolvedValueOnce(completed({ total: 4 }))
        .mockResolvedValueOnce(completed({ updated: 4, total: 4 }));
      const run = savedRun();

      const result = await client.runHistorySnapshot({ run });

      expect(mockCreateIndex).not.toHaveBeenCalled();
      expect(mockStartReindex).not.toHaveBeenCalled();
      expect(mockPollTaskUntil).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ taskId: 'node:1' })
      );
      expect(mockStartUpdateByQuery).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({ params: { timestampNow: run.timestampNow } })
      );
      expect(result).toEqual({
        ok: true,
        historySnapshotIndex: run.historySnapshotIndex,
        docCount: 4,
        resetCount: 4,
      });
    });

    it('resumes a saved reset and reports the saved doc count', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ updated: 9, total: 9 }));

      const result = await client.runHistorySnapshot({
        run: savedRun({ phase: 'reset', esTaskId: 'node:2', docCount: 9 }),
      });

      expect(mockStartReindex).not.toHaveBeenCalled();
      expect(mockStartUpdateByQuery).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ ok: true, docCount: 9, resetCount: 9 }));
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('starts the phase again when its Elasticsearch task no longer exists', async () => {
      mockPollTaskUntil
        .mockResolvedValueOnce({ status: 'missing' })
        .mockResolvedValueOnce(completed({ total: 0 }));
      const run = savedRun();

      const result = await client.runHistorySnapshot({ run });

      expect(mockStartReindex).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          source: { index: run.latestIndex },
          dest: { index: run.historySnapshotIndex },
        })
      );
      expect(mockPollTaskUntil).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ taskId: 'node:reindex' })
      );
      expect(result).toEqual(expect.objectContaining({ ok: true, docCount: 0 }));
    });

    it('fails when the Elasticsearch task was cancelled', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(
        completed({ total: 10, created: 3, canceled: 'by user request' })
      );

      const result = await client.runHistorySnapshot({ run: savedRun() });

      expect(result.ok).toBe(false);
      expect(mockStartUpdateByQuery).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: {
            message: expect.stringContaining('was cancelled: by user request'),
            timestamp: expect.any(String),
          },
        }),
      });
    });

    it('cancels the Elasticsearch task when the run is aborted', async () => {
      const abortController = new AbortController();
      mockPollTaskUntil.mockImplementationOnce(async () => {
        abortController.abort();
        throw new Error('Task polling aborted');
      });

      const result = await client.runHistorySnapshot({ abortSignal: abortController.signal });

      expect(result.ok).toBe(false);
      expect(mockCancelTask).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: mockInternalEsClient, taskId: 'node:reindex' })
      );
    });

    it('returns skipped when history snapshot status is not started', async () => {
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        ...mockGlobalStateStarted,
        historySnapshot: { ...mockGlobalStateStarted.historySnapshot, status: 'stopped' },
      });
      client = createClient();

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      expect(result).toHaveProperty('skipped', true);
      expect(mockCreateIndex).not.toHaveBeenCalled();
      expect(mockStartReindex).not.toHaveBeenCalled();
      expect(mockCancelTask).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(0);
    });

    it('cancels a saved run when history snapshot status is not started', async () => {
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        ...mockGlobalStateStarted,
        historySnapshot: { ...mockGlobalStateStarted.historySnapshot, status: 'stopped' },
      });

      const result = await client.runHistorySnapshot({ run: savedRun() });

      expect(result).toHaveProperty('skipped', true);
      expect(mockCancelTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'node:1' }));
      expect(mockPollTaskUntil).not.toHaveBeenCalled();
    });

    it('returns error when createIndex throws', async () => {
      mockCreateIndex.mockRejectedValue(new Error('index creation failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockStartReindex).not.toHaveBeenCalled();
      expect(mockStartUpdateByQuery).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'index creation failed', timestamp: expect.any(String) },
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('returns error when the reindex task fails', async () => {
      mockPollTaskUntil.mockRejectedValueOnce(new Error('reindex failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockStartUpdateByQuery).not.toHaveBeenCalled();
      expect(mockCancelTask).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'reindex failed', timestamp: expect.any(String) },
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('returns error and still runs retention cleanup when source-index resolution fails', async () => {
      mockResolveLatestEntitiesIndexName.mockRejectedValue(new Error('lookup failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'lookup failed', timestamp: expect.any(String) },
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('still succeeds when retention cleanup throws', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ total: 0 }));
      mockDeleteExpiredHistorySnapshots.mockRejectedValue(new Error('cleanup failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && 'docCount' in result) {
        expect(result.docCount).toBe(0);
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        'history snapshot: retention cleanup failed: cleanup failed'
      );
    });

    it('returns error when the reset fails to start', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ total: 3 }));
      mockStartUpdateByQuery.mockRejectedValue(new Error('update_by_query failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: {
            message: 'update_by_query failed',
            timestamp: expect.any(String),
          },
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('passes configured retentionDays to cleanup on a full reindex+reset run', async () => {
      // Exercises the complete success path (docs present → reindex → reset) with a
      // non-default retentionDays so a regression that always uses the default is caught.
      mockPollTaskUntil
        .mockResolvedValueOnce(completed({ total: 5 }))
        .mockResolvedValueOnce(completed({ updated: 5, total: 5 }));
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        ...mockGlobalStateStarted,
        historySnapshot: { ...mockGlobalStateStarted.historySnapshot, retentionDays: 90 },
      });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: 90,
        })
      );
    });

    it('calls deleteExpiredHistorySnapshots with configured retentionDays when set in global state', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ total: 0 }));
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        ...mockGlobalStateStarted,
        historySnapshot: { ...mockGlobalStateStarted.historySnapshot, retentionDays: 7 },
      });

      await client.runHistorySnapshot();

      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: 7,
        })
      );
    });

    it('calls deleteExpiredHistorySnapshots with default retention when retentionDays is not configured', async () => {
      mockPollTaskUntil.mockResolvedValueOnce(completed({ total: 0 }));

      await client.runHistorySnapshot();

      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS,
        })
      );
    });
  });

  describe('enable', () => {
    it('enables without runSoon, persists started status, then schedules immediate run', async () => {
      await client.enable(request);

      expect(mockGlobalStateClient.findOrThrow).toHaveBeenCalledTimes(1);
      // Step 1: enable only, no runSoon — status is persisted before any worker can claim
      expect(mockTaskManager.bulkEnable).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith([taskId], false, { request });
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { status: 'started', frequency: '24h' },
      });
      // Step 3: runSoon
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(taskId);
    });

    it('throws and does not update status when the initial enable fails', async () => {
      mockTaskManager.bulkEnable.mockResolvedValue({
        tasks: [],
        errors: [
          {
            id: taskId,
            type: 'task',
            error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
          },
        ],
      });

      await expect(client.enable(request)).rejects.toThrow(
        'Failed to enable history snapshot task: Not Found'
      );
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
    });

    it('logs a warning but does not throw when runSoon fails', async () => {
      mockTaskManager.runSoon.mockRejectedValueOnce(new Error('conflict'));

      await expect(client.enable(request)).resolves.toBeUndefined();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { status: 'started', frequency: '24h' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('runSoon failed'));
    });

    it('rolls back by disabling the task if the global state update fails', async () => {
      mockGlobalStateClient.update.mockRejectedValue(new Error('SO unavailable'));

      await expect(client.enable(request)).rejects.toThrow(
        'Failed to persist history snapshot started status'
      );
      expect(mockTaskManager.bulkDisable).toHaveBeenCalledWith([taskId], false, { request });
      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });

    it('logs a warning if the rollback bulkDisable also fails after the state update failure', async () => {
      mockGlobalStateClient.update.mockRejectedValue(new Error('SO unavailable'));
      mockTaskManager.bulkDisable.mockRejectedValue(new Error('TM unavailable'));

      await expect(client.enable(request)).rejects.toThrow(
        'Failed to persist history snapshot started status'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('roll back task enable')
      );
    });

    it('returns without updating state or running the task when it is already enabled', async () => {
      // bulkEnable is a no-op for an already-enabled task — Task Manager returns tasks: []
      mockTaskManager.bulkEnable.mockResolvedValue({ tasks: [], errors: [] });

      await client.enable(request);

      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('disables the Task Manager task and marks snapshot status stopped', async () => {
      await client.disable(request);

      expect(mockTaskManager.bulkDisable).toHaveBeenCalledWith([taskId], false, { request });
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { status: 'stopped', frequency: '24h' },
      });
    });

    it('throws when the task document is missing', async () => {
      mockTaskManager.bulkDisable.mockResolvedValue({
        tasks: [],
        errors: [
          {
            id: taskId,
            type: 'task',
            error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
          },
        ],
      });

      await expect(client.disable(request)).rejects.toThrow(
        'Failed to disable history snapshot task: Not Found'
      );
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
    });

    it('rolls back by re-enabling the task if the global state update fails', async () => {
      mockGlobalStateClient.update.mockRejectedValue(new Error('SO unavailable'));

      await expect(client.disable(request)).rejects.toThrow(
        'Failed to persist history snapshot stopped status'
      );
      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith([taskId], false, { request });
    });

    it('logs a warning if the rollback bulkEnable also fails after the state update failure', async () => {
      mockGlobalStateClient.update.mockRejectedValue(new Error('SO unavailable'));
      mockTaskManager.bulkEnable.mockRejectedValue(new Error('TM unavailable'));

      await expect(client.disable(request)).rejects.toThrow(
        'Failed to persist history snapshot stopped status'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('roll back task disable')
      );
    });

    it('clears the unfinished run from task state and cancels its Elasticsearch task', async () => {
      const run = { phase: 'reindex', esTaskId: 'node:1' };
      mockTaskManager.bulkUpdateState.mockImplementation(async (_ids, mapFn) => {
        expect(mapFn({ namespace, run }, taskId)).toEqual({ namespace });
        return { tasks: [], errors: [] };
      });

      await client.disable(request);

      expect(mockTaskManager.bulkUpdateState).toHaveBeenCalledWith([taskId], expect.any(Function), {
        request,
      });
      expect(mockCancelTask).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: mockInternalEsClient, taskId: 'node:1' })
      );
    });

    it('does not cancel anything when no run is in progress', async () => {
      mockTaskManager.bulkUpdateState.mockImplementation(async (_ids, mapFn) => {
        mapFn({ namespace }, taskId);
        return { tasks: [], errors: [] };
      });

      await client.disable(request);

      expect(mockCancelTask).not.toHaveBeenCalled();
    });

    it('returns without updating state when the task is already disabled', async () => {
      // bulkDisable is a no-op for an already-disabled task — Task Manager returns tasks: []
      mockTaskManager.bulkDisable.mockResolvedValue({ tasks: [], errors: [] });

      await client.disable(request);

      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
    });

    describe('with clearHistorySnapshots', () => {
      it('does not clear indices when option is not set', async () => {
        await client.disable(request);
        await flushPromises();

        expect(mockDeleteExpiredHistorySnapshots).not.toHaveBeenCalled();
      });

      it('does not clear indices when clearHistorySnapshots is false', async () => {
        await client.disable(request, { clearHistorySnapshots: false });
        await flushPromises();

        expect(mockDeleteExpiredHistorySnapshots).not.toHaveBeenCalled();
      });

      it('asynchronously deletes all history snapshot indices without a retention filter', async () => {
        mockDeleteExpiredHistorySnapshots.mockResolvedValue({
          deleted: [
            '.entities.v2.history.default.2024-01-01-00',
            '.entities.v2.history.default.2024-01-02-00',
          ],
        });

        await client.disable(request, { clearHistorySnapshots: true });

        expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith({
          esClient: mockInternalEsClient,
          namespace,
          logger: mockLogger,
        });
        expect(mockLogger.info).not.toHaveBeenCalled();

        await flushPromises();

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Deleted 2 history snapshot indices after disabling'
        );
      });

      it('logs info when no history snapshot indices exist to clear', async () => {
        mockDeleteExpiredHistorySnapshots.mockResolvedValue({ deleted: [] });

        await client.disable(request, { clearHistorySnapshots: true });
        await flushPromises();

        expect(mockLogger.info).toHaveBeenCalledWith('No history snapshot indices to delete.');
      });

      it('does not throw and logs an error if clearing indices fails', async () => {
        mockDeleteExpiredHistorySnapshots.mockRejectedValue(new Error('ES unavailable'));

        await expect(
          client.disable(request, { clearHistorySnapshots: true })
        ).resolves.toBeUndefined();

        await flushPromises();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to clear history snapshot indices')
        );
      });
    });
  });
});
