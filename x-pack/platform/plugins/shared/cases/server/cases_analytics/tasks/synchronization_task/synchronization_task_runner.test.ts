/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { TasksTaskInfo } from '@elastic/elasticsearch/lib/api/types';
import { errors as esErrors } from '@elastic/elasticsearch';

import { SynchronizationTaskRunner } from './synchronization_task_runner';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import { CAI_CASES_INDEX_NAME } from '../../cases_index/constants';

describe('SynchronizationTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const sourceIndex = '.source-index';
  const destIndex = CAI_CASES_INDEX_NAME;

  const painlessScriptId = 'painlessScriptId';
  const painlessScript = {
    lang: 'painless',
    source: 'ctx._source.remove("foobar");',
  };

  const lastSyncSuccess = new Date('2025-06-10T09:25:00.000Z');
  const lastSyncAttempt = new Date('2025-06-10T09:30:00.000Z');
  const newAttemptTime = new Date('2025-06-10T09:40:00.000Z');

  const esReindexTaskId = 'foobar';

  const taskInstance = {
    params: {
      sourceIndex,
      destIndex,
    },
    state: {
      lastSyncSuccess,
      lastSyncAttempt,
      esReindexTaskId,
    },
  } as unknown as ConcreteTaskInstance;

  let taskRunner: SynchronizationTaskRunner;

  const analyticsConfig = {
    index: {
      enabled: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(newAttemptTime);
    esClient.indices.getMapping.mockResolvedValue({
      [destIndex]: {
        mappings: {
          _meta: {
            painless_script_id: painlessScriptId,
          },
        },
      },
    });

    esClient.getScript.mockResolvedValue({
      found: true,
      _id: painlessScriptId,
      script: painlessScript,
    });

    esClient.reindex.mockResolvedValue({
      task: esReindexTaskId,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('reindexes when the previous sync task is completed and the index is available', async () => {
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {} as TasksTaskInfo,
    });

    const getESClient = async () => esClient;

    taskRunner = new SynchronizationTaskRunner({
      logger,
      getESClient,
      taskInstance,
      analyticsConfig,
    });

    const result = await taskRunner.run();

    expect(esClient.tasks.get).toBeCalledWith({ task_id: esReindexTaskId });
    expect(esClient.cluster.health).toBeCalledWith({
      index: destIndex,
      wait_for_status: 'green',
      timeout: '30s',
    });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: destIndex });
    expect(esClient.getScript).toBeCalledWith({ id: painlessScriptId });
    expect(esClient.reindex).toBeCalledWith({
      source: {
        index: sourceIndex,
        /*
         * The previous attempt was successful so we will reindex with
         * a new time.
         *
         * SYNCHRONIZATION_QUERIES_DICTIONARY[destIndex](lastSyncAttempt)
         */
        query: {
          bool: {
            must: [
              {
                term: {
                  type: 'cases',
                },
              },
              {
                bool: {
                  should: [
                    {
                      range: {
                        'cases.created_at': {
                          gte: lastSyncAttempt.toISOString(),
                        },
                      },
                    },
                    {
                      range: {
                        'cases.updated_at': {
                          gte: lastSyncAttempt.toISOString(),
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      dest: { index: destIndex },
      script: {
        id: painlessScriptId,
      },
      refresh: true,
      wait_for_completion: false,
    });

    expect(result).toEqual({
      state: {
        // because the previous sync task was completed lastSyncSuccess is now lastSyncAttempt
        lastSyncSuccess: lastSyncAttempt,
        // we set a new value for lastSyncAttempt
        lastSyncAttempt: newAttemptTime,
        esReindexTaskId,
      },
    });
  });

  it('reindexes using the lookback window when there is no previous sync task and the index is available', async () => {
    /*
     * If lastSyncSuccess is missing we reindex only SOs that were
     * created/updated in the last 5 minutes.
     */
    const expectedSyncTime = new Date(newAttemptTime.getTime() - 5 * 60 * 1000);

    const getESClient = async () => esClient;

    taskRunner = new SynchronizationTaskRunner({
      logger,
      getESClient,
      taskInstance: {
        ...taskInstance,
        state: {},
      },
      analyticsConfig,
    });

    const result = await taskRunner.run();

    expect(esClient.reindex).toBeCalledWith({
      source: {
        index: sourceIndex,
        /*
         * The previous attempt was successful so we will reindex with
         * a new time.
         *
         * SYNCHRONIZATION_QUERIES_DICTIONARY[destIndex](lastSyncAttempt)
         */
        query: {
          bool: {
            must: [
              {
                term: {
                  type: 'cases',
                },
              },
              {
                bool: {
                  should: [
                    {
                      range: {
                        'cases.created_at': {
                          gte: expectedSyncTime.toISOString(),
                        },
                      },
                    },
                    {
                      range: {
                        'cases.updated_at': {
                          gte: expectedSyncTime.toISOString(),
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      dest: { index: destIndex },
      script: {
        id: painlessScriptId,
      },
      refresh: true,
      wait_for_completion: false,
    });

    expect(result).toEqual({
      state: {
        lastSyncSuccess: undefined,
        lastSyncAttempt: newAttemptTime,
        esReindexTaskId,
      },
    });
  });

  it('returns the previous state if the previous task is still running', async () => {
    esClient.tasks.get.mockResolvedValueOnce({
      completed: false,
      task: {} as TasksTaskInfo,
    });

    const getESClient = async () => esClient;

    taskRunner = new SynchronizationTaskRunner({
      logger,
      getESClient,
      taskInstance,
      analyticsConfig,
    });

    const result = await taskRunner.run();

    expect(esClient.reindex).not.toBeCalled();
    expect(result).toEqual({
      state: taskInstance.state,
    });
  });

  it('reindexes when the previous sync task failed', async () => {
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {} as TasksTaskInfo,
      error: { type: 'reindex_error', reason: 'Reindex failed' },
    });

    const getESClient = async () => esClient;

    taskRunner = new SynchronizationTaskRunner({
      logger,
      getESClient,
      taskInstance,
      analyticsConfig,
    });

    const result = await taskRunner.run();

    expect(esClient.reindex).toBeCalledWith({
      source: {
        index: sourceIndex,
        /*
         * The previous attempt was unsuccessful so we will reindex with
         * the old lastSyncSuccess. And updated the attempt time.
         *
         * SYNCHRONIZATION_QUERIES_DICTIONARY[destIndex](lastSyncSuccess)
         */
        query: {
          bool: {
            must: [
              {
                term: {
                  type: 'cases',
                },
              },
              {
                bool: {
                  should: [
                    {
                      range: {
                        'cases.created_at': {
                          gte: lastSyncSuccess.toISOString(),
                        },
                      },
                    },
                    {
                      range: {
                        'cases.updated_at': {
                          gte: lastSyncSuccess.toISOString(),
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      dest: { index: destIndex },
      script: {
        id: painlessScriptId,
      },
      refresh: true,
      wait_for_completion: false,
    });

    expect(result).toEqual({
      state: {
        // because the previous sync task failed we do not update this value
        lastSyncSuccess,
        // we set a new value for lastSyncAttempt
        lastSyncAttempt: newAttemptTime,
        esReindexTaskId,
      },
    });
  });

  describe('Error handling', () => {
    it('calls throwRetryableError if the esClient throws a retryable error', async () => {
      esClient.tasks.get.mockRejectedValueOnce(new esErrors.ConnectionError('My retryable error'));

      const getESClient = async () => esClient;

      taskRunner = new SynchronizationTaskRunner({
        logger,
        getESClient,
        taskInstance,
        analyticsConfig,
      });

      try {
        await taskRunner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(true);
      }

      expect(logger.error).toBeCalledWith(
        '[.internal.cases] Synchronization reindex failed. Error: My retryable error',
        { tags: ['cai-synchronization', 'cai-synchronization-error', '.internal.cases'] }
      );
    });

    it('calls throwUnrecoverableError if execution throws a non-retryable error', async () => {
      esClient.tasks.get.mockRejectedValueOnce(new Error('My unrecoverable error'));

      const getESClient = async () => esClient;

      taskRunner = new SynchronizationTaskRunner({
        logger,
        getESClient,
        taskInstance,
        analyticsConfig,
      });

      try {
        await taskRunner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(null);
      }

      expect(logger.error).toBeCalledWith(
        '[.internal.cases] Synchronization reindex failed. Error: My unrecoverable error',
        { tags: ['cai-synchronization', 'cai-synchronization-error', '.internal.cases'] }
      );
    });
  });

  describe('Analytics index disabled', () => {
    const analyticsConfigDisabled = {
      index: {
        enabled: false,
      },
    };

    it('does not call the reindex API if analytics is disabled', async () => {
      const getESClient = async () => esClient;

      taskRunner = new SynchronizationTaskRunner({
        logger,
        getESClient,
        taskInstance,
        analyticsConfig: analyticsConfigDisabled,
      });

      await taskRunner.run();

      expect(esClient.tasks.get).not.toBeCalled();
      expect(esClient.cluster.health).not.toBeCalled();
      expect(esClient.reindex).not.toBeCalled();
    });
  });
});
