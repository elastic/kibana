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
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';

jest.mock('../../infra/elasticsearch');
jest.mock('../asset_manager/resolve_entity_store_indices');

const mockCreateIndex = createIndex as jest.MockedFunction<typeof createIndex>;
const mockReindex = reindex as jest.MockedFunction<typeof reindex>;
const mockUpdateByQueryWithScript = updateByQueryWithScript as jest.MockedFunction<
  typeof updateByQueryWithScript
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
  return {
    bulkEnable: jest.fn().mockResolvedValue({ tasks: [], errors: [] }),
    bulkDisable: jest.fn().mockResolvedValue({ tasks: [], errors: [] }),
  };
}

describe('HistorySnapshotClient', () => {
  const namespace = 'default';
  const taskId = 'entity_store:v2:history_snapshot_task:default';
  const request = { headers: {} } as KibanaRequest;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockGlobalStateClient: ReturnType<typeof createMockGlobalStateClient>;
  let mockTaskManager: ReturnType<typeof createMockTaskManager>;
  let client: HistorySnapshotClient;

  const createClient = () =>
    new HistorySnapshotClient({
      logger: loggerMock.create(),
      esClient: mockEsClient,
      namespace,
      globalStateClient:
        mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
      taskManager: mockTaskManager as unknown as TaskManagerStartContract,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
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
    });
  });

  describe('enable', () => {
    it('enables the Task Manager task and runs it immediately and marks snapshot status started', async () => {
      await client.enable(request);

      expect(mockGlobalStateClient.findOrThrow).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith([taskId], true, { request });
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        historySnapshot: { status: 'started', frequency: '24h' },
      });
    });

    it('throws when the task document is missing', async () => {
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

    it('throws when Task Manager fails to enable the task', async () => {
      mockTaskManager.bulkEnable.mockResolvedValue({
        tasks: [],
        errors: [
          {
            id: taskId,
            type: 'task',
            error: { statusCode: 500, message: 'conflict', error: 'Conflict' },
          },
        ],
      });

      await expect(client.enable(request)).rejects.toThrow(
        'Failed to enable history snapshot task: conflict'
      );
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
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
  });
});
