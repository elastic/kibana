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
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';
import { createIndex, reindex, updateByQueryWithScript } from '../../infra/elasticsearch';
import { deleteExpiredHistorySnapshots } from './expire_history_snapshots';
import { DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS } from '../saved_objects';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';

jest.mock('../../infra/elasticsearch');
jest.mock('./expire_history_snapshots');
jest.mock('../asset_manager/resolve_entity_store_indices');

const mockCreateIndex = createIndex as jest.MockedFunction<typeof createIndex>;
const mockReindex = reindex as jest.MockedFunction<typeof reindex>;
const mockUpdateByQueryWithScript = updateByQueryWithScript as jest.MockedFunction<
  typeof updateByQueryWithScript
>;
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
    mockLogger = loggerMock.create();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockInternalEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockGlobalStateClient = createMockGlobalStateClient();
    mockTaskManager = createMockTaskManager();
    mockResolveLatestEntitiesIndexName.mockResolvedValue('.entities.v2.latest.default-00001');
    client = createClient();
  });

  describe('runHistorySnapshot', () => {
    it('returns success with docCount and resetCount when reindex and updateByQuery succeed', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 5,
        updated: 0,
        versionConflicts: 0,
        total: 5,
        failures: [],
      });
      mockUpdateByQueryWithScript.mockResolvedValue({ updated: 5, total: 5 });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && !('skipped' in result)) {
        expect(result.docCount).toBe(5);
        expect(result.resetCount).toBe(5);
        expect(result.historySnapshotIndex).toMatch(
          /\.entities\.v2\.history\.default\.\d{4}-\d{2}-\d{2}-\d{2}$/
        );
      }
      expect(mockCreateIndex).toHaveBeenCalledTimes(1);
      expect(mockReindex).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          source: { index: '.entities.v2.latest.default-00001' },
          dest: { index: expect.stringMatching(/\.entities\.v2\.history\.default\./) },
          waitForTask: {
            logger: expect.anything(),
            minTimeout: 5 * 1000,
            maxTimeout: 30 * 1000,
            forever: true,
          },
        })
      );
      expect(mockUpdateByQueryWithScript).toHaveBeenCalledWith(
        mockEsClient,
        expect.objectContaining({
          index: '.entities.v2.latest.default-00001',
          query: { match_all: {} },
          script: HISTORY_SNAPSHOT_RESET_SCRIPT,
          params: expect.objectContaining({ timestampNow: expect.any(String) }),
          waitForTask: {
            logger: expect.anything(),
            minTimeout: 5 * 1000,
            maxTimeout: 30 * 1000,
            forever: true,
          },
        })
      );
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastExecutionTimestamp: expect.any(String),
          lastError: undefined,
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: mockEsClient,
          namespace,
          retentionDays: 30,
        })
      );
    });

    it('uses nested entity field access in the reset script (no flat dotted keys)', () => {
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.lifecycle');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).toContain('ctx._source.entity.behaviors');
      expect(HISTORY_SNAPSHOT_RESET_SCRIPT).not.toMatch(/ctx\._source\s*\[\s*['"]entity\./);
    });

    it('returns success with docCount 0 and resetCount 0 when latest index has no docs', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 0,
        updated: 0,
        versionConflicts: 0,
        total: 0,
        failures: [],
      });

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && !('skipped' in result)) {
        expect(result.docCount).toBe(0);
        expect(result.resetCount).toBe(0);
      }
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastExecutionTimestamp: expect.any(String),
          lastError: undefined,
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
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
      expect(mockReindex).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(0);
    });

    it('returns error when createIndex throws', async () => {
      mockCreateIndex.mockRejectedValue(new Error('index creation failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockReindex).not.toHaveBeenCalled();
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: expect.objectContaining({
          lastError: { message: 'index creation failed', timestamp: expect.any(String) },
        }),
      });
      expect(mockDeleteExpiredHistorySnapshots).toHaveBeenCalledTimes(1);
    });

    it('returns error when reindex throws', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockRejectedValue(new Error('reindex failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('History snapshot failed');
      }
      expect(mockUpdateByQueryWithScript).not.toHaveBeenCalled();
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
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 0,
        updated: 0,
        versionConflicts: 0,
        total: 0,
        failures: [],
      });
      mockDeleteExpiredHistorySnapshots.mockRejectedValue(new Error('cleanup failed'));

      const result = await client.runHistorySnapshot();

      expect(result.ok).toBe(true);
      if (result.ok && !('skipped' in result)) {
        expect(result.docCount).toBe(0);
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        'history snapshot: retention cleanup failed: cleanup failed'
      );
    });

    it('returns error when updateByQueryWithScript throws', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 3,
        updated: 0,
        versionConflicts: 0,
        total: 3,
        failures: [],
      });
      mockUpdateByQueryWithScript.mockRejectedValue(new Error('update_by_query failed'));

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

    it('calls deleteExpiredHistorySnapshots with configured retentionDays when set in global state', async () => {
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 0,
        updated: 0,
        versionConflicts: 0,
        total: 0,
        failures: [],
      });
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
      mockCreateIndex.mockResolvedValue(undefined);
      mockReindex.mockResolvedValue({
        created: 0,
        updated: 0,
        versionConflicts: 0,
        total: 0,
        failures: [],
      });

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
