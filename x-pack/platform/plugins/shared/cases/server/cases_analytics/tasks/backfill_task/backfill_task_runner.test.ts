/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as esErrors } from '@elastic/elasticsearch';

import { BackfillTaskRunner } from './backfill_task_runner';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';

describe('BackfillTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const sourceIndex = '.source-index';
  const destIndex = '.dest-index';
  const sourceQuery = 'source-query';
  const taskInstance = {
    params: {
      sourceIndex,
      destIndex,
      sourceQuery,
    },
  } as unknown as ConcreteTaskInstance;

  let taskRunner: BackfillTaskRunner;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reindexes as expected', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const painlessScriptId = 'painlessScriptId';
    const painlessScript = {
      lang: 'painless',
      source: 'ctx._source.remove("foobar");',
    };

    esClient.indices.getMapping.mockResolvedValue({
      [destIndex]: {
        mappings: {
          _meta: {
            painless_script_id: painlessScriptId,
          },
        },
      },
    });

    esClient.getScript.mockResolvedValueOnce({
      found: true,
      _id: painlessScriptId,
      script: painlessScript,
    });

    const getESClient = async () => esClient;

    taskRunner = new BackfillTaskRunner({
      logger,
      getESClient,
      taskInstance,
    });

    const result = await taskRunner.run();

    expect(esClient.cluster.health).toBeCalledWith({
      index: destIndex,
      wait_for_status: 'green',
      timeout: '300ms',
      wait_for_active_shards: 'all',
    });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: destIndex });
    expect(esClient.getScript).toBeCalledWith({ id: painlessScriptId });
    expect(esClient.reindex).toBeCalledWith({
      source: {
        index: sourceIndex,
        query: sourceQuery,
      },
      dest: { index: destIndex },
      script: {
        id: painlessScriptId,
      },
      refresh: true,
      wait_for_completion: false,
    });
    expect(result).toEqual({ state: {} });
  });

  describe('Error handling', () => {
    it('calls throwRetryableError if the esClient throws a retryable error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.cluster.health.mockRejectedValueOnce(
        new esErrors.ConnectionError('My retryable error')
      );

      const getESClient = async () => esClient;

      taskRunner = new BackfillTaskRunner({
        logger,
        getESClient,
        taskInstance,
      });

      try {
        await taskRunner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(true);
      }

      expect(esClient.cluster.health).toBeCalledWith({
        index: destIndex,
        wait_for_status: 'green',
        timeout: '300ms',
        wait_for_active_shards: 'all',
      });

      expect(logger.error).toBeCalledWith(
        '[.dest-index] Backfill reindex failed. Error: My retryable error',
        { tags: ['cai-backfill', 'cai-backfill-error', '.dest-index'] }
      );
    });

    it('calls throwUnrecoverableError if execution throws a non-retryable error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.cluster.health.mockRejectedValueOnce(new Error('My unrecoverable error'));

      const getESClient = async () => esClient;

      taskRunner = new BackfillTaskRunner({
        logger,
        getESClient,
        taskInstance,
      });

      try {
        await taskRunner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(null);
      }

      expect(logger.error).toBeCalledWith(
        '[.dest-index] Backfill reindex failed. Error: My unrecoverable error',
        { tags: ['cai-backfill', 'cai-backfill-error', '.dest-index'] }
      );
    });
  });
});
