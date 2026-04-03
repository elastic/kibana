/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { errors as esErrors } from '@elastic/elasticsearch';

import { BackfillTaskRunner } from './backfill_task_runner';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';

describe('BackfillTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const sourceIndex = '.source-index';
  const destIndex = '.dest-index';
  const sourceQuery = 'source-query';
  const spaceId = 'default';
  const owner = 'securitySolution';

  const taskInstance = {
    params: {
      sourceIndex,
      destIndex,
      sourceQuery,
      spaceId,
      owner,
    },
  } as unknown as ConcreteTaskInstance;

  const taskInstanceWithoutSpaceOwner = {
    params: {
      sourceIndex,
      destIndex,
      sourceQuery,
    },
  } as unknown as ConcreteTaskInstance;

  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  const analyticsConfig = {
    index: {
      enabled: true,
      reindexConcurrency: 3,
      maxAnalyticsEnabledSpaces: 100,
    },
  };

  const makeRunner = (
    instance: ConcreteTaskInstance = taskInstance,
    soClientOverride?: ReturnType<typeof savedObjectsClientMock.create>
  ) => {
    soClient = soClientOverride ?? savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const painlessScriptId = 'painlessScriptId';
    const painlessScript = { lang: 'painless', source: 'ctx._source.remove("foobar");' };

    esClient.indices.getMapping.mockResolvedValue({
      [destIndex]: { mappings: { _meta: { painless_script_id: painlessScriptId } } },
    });
    esClient.getScript.mockResolvedValueOnce({
      found: true,
      _id: painlessScriptId,
      script: painlessScript,
    });

    return {
      runner: new BackfillTaskRunner({
        logger,
        getESClient: async () => esClient,
        getUnsecureSavedObjectsClient: async () => soClient,
        taskInstance: instance,
        analyticsConfig,
      }),
      esClient,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reindexes as expected', async () => {
    const { runner, esClient } = makeRunner();
    const painlessScriptId = 'painlessScriptId';

    const result = await runner.run();

    expect(esClient.cluster.health).toBeCalledWith({
      index: destIndex,
      wait_for_status: 'green',
      timeout: '30s',
    });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: destIndex });
    expect(esClient.getScript).toBeCalledWith({ id: painlessScriptId });
    expect(esClient.reindex).toBeCalledWith({
      source: { index: sourceIndex, query: sourceQuery },
      dest: { index: destIndex },
      script: { id: painlessScriptId },
      refresh: true,
      wait_for_completion: false,
    });
    expect(result).toEqual({ state: {} });
  });

  describe('analytics_last_sync_at update', () => {
    it('calls updateLastSyncAt after a successful backfill when spaceId and owner are present', async () => {
      soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'so-id', type: 'cases-configure', attributes: {}, references: [], score: 0 },
        ],
        total: 1,
        per_page: 1,
        page: 1,
      });

      const { runner } = makeRunner(taskInstance, soClient);
      await runner.run();

      // Allow the fire-and-forget promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(soClient.find).toBeCalledWith(
        expect.objectContaining({
          type: 'cases-configure',
          namespaces: [spaceId],
          filter: expect.stringContaining(owner),
          perPage: 1,
        })
      );
      expect(soClient.update).toBeCalledWith(
        'cases-configure',
        'so-id',
        expect.objectContaining({
          analytics_last_sync_at: expect.any(String),
          analytics_sync_status: 'active',
        }),
        expect.any(Object)
      );
    });

    it('resets analytics_sync_status to active even when the space was previously idle', async () => {
      /*
       * FAILURE SCENARIO: space was in idle mode (analytics_sync_status = 'idle' in SO).
       * User clicks the manual sync button, triggering the backfill task. Without writing
       * analytics_sync_status = 'active', the timestamp updates but the idle callout in
       * the configure UI never disappears until the next owner-sync-task run.
       */
      soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'so-id', type: 'cases-configure', attributes: { analytics_sync_status: 'idle' }, references: [], score: 0 },
        ],
        total: 1,
        per_page: 1,
        page: 1,
      });

      const { runner } = makeRunner(taskInstance, soClient);
      await runner.run();
      await new Promise((resolve) => setImmediate(resolve));

      expect(soClient.update).toBeCalledWith(
        'cases-configure',
        'so-id',
        expect.objectContaining({ analytics_sync_status: 'active' }),
        expect.any(Object)
      );
    });

    it('logs a warning but does not fail the task when updateLastSyncAt throws', async () => {
      soClient = savedObjectsClientMock.create();
      soClient.find.mockRejectedValueOnce(new Error('SO error'));

      const { runner } = makeRunner(taskInstance, soClient);
      const result = await runner.run();

      // Allow the fire-and-forget promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      // Task still completes successfully
      expect(result).toEqual({ state: {} });
      expect(logger.warn).toBeCalledWith(
        expect.stringContaining('Failed to update analytics_last_sync_at after backfill'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('does not call updateLastSyncAt when spaceId/owner are absent (legacy task instance)', async () => {
      soClient = savedObjectsClientMock.create();
      const { runner } = makeRunner(taskInstanceWithoutSpaceOwner, soClient);
      await runner.run();

      await new Promise((resolve) => setImmediate(resolve));

      expect(soClient.find).not.toBeCalled();
      expect(soClient.update).not.toBeCalled();
    });

    it('skips the SO update when no configure SO is found', async () => {
      soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 1,
        page: 1,
      });

      const { runner } = makeRunner(taskInstance, soClient);
      await runner.run();

      await new Promise((resolve) => setImmediate(resolve));

      expect(soClient.find).toBeCalled();
      expect(soClient.update).not.toBeCalled();
    });
  });

  describe('Error handling', () => {
    it('calls throwRetryableError if the esClient throws a retryable error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.cluster.health.mockRejectedValueOnce(
        new esErrors.ConnectionError('My retryable error')
      );

      const runner = new BackfillTaskRunner({
        logger,
        getESClient: async () => esClient,
        getUnsecureSavedObjectsClient: async () => savedObjectsClientMock.create(),
        taskInstance,
        analyticsConfig,
      });

      try {
        await runner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(true);
      }

      expect(esClient.cluster.health).toBeCalledWith({
        index: destIndex,
        wait_for_status: 'green',
        timeout: '30s',
      });

      expect(logger.warn).toBeCalledWith(
        expect.stringContaining('[backfill-task][.dest-index] Transient ES error'),
        expect.objectContaining({
          error: expect.any(Error),
          executionId: expect.any(String),
          tags: ['cai-backfill', 'cai-backfill-error', '.dest-index'],
        })
      );
    });

    it('calls throwUnrecoverableError if execution throws a non-retryable error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.cluster.health.mockRejectedValueOnce(new Error('My unrecoverable error'));

      const runner = new BackfillTaskRunner({
        logger,
        getESClient: async () => esClient,
        getUnsecureSavedObjectsClient: async () => savedObjectsClientMock.create(),
        taskInstance,
        analyticsConfig,
      });

      try {
        await runner.run();
      } catch (e) {
        expect(isRetryableError(e)).toBe(null);
      }

      expect(logger.error).toBeCalledWith(
        '[backfill-task][.dest-index] Backfill reindex failed',
        expect.objectContaining({
          error: expect.any(Error),
          executionId: expect.any(String),
          tags: ['cai-backfill', 'cai-backfill-error', '.dest-index'],
        })
      );
    });
  });

  describe('Analytics index disabled', () => {
    const analyticsConfigDisabled = {
      index: {
        enabled: false,
        reindexConcurrency: 3,
        maxAnalyticsEnabledSpaces: 100,
      },
    };

    it('does not call the reindex API if analytics is disabled', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      const runner = new BackfillTaskRunner({
        logger,
        getESClient: async () => esClient,
        getUnsecureSavedObjectsClient: async () => savedObjectsClientMock.create(),
        taskInstance,
        analyticsConfig: analyticsConfigDisabled,
      });

      await runner.run();

      expect(esClient.cluster.health).not.toBeCalled();
      expect(esClient.reindex).not.toBeCalled();
    });
  });
});
