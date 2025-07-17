/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { DiagnosticResult, errors as esErrors } from '@elastic/elasticsearch';

import { AnalyticsIndex } from './analytics_index';
import type {
  IndicesCreateResponse,
  IndicesPutMappingResponse,
  MappingTypeMapping,
  QueryDslQueryContainer,
  StoredScript,
} from '@elastic/elasticsearch/lib/api/types';
import { fullJitterBackoffFactory } from '../common/retry_service/full_jitter_backoff';
import { scheduleCAIBackfillTask } from './tasks/backfill_task';

jest.mock('../common/retry_service/full_jitter_backoff');
jest.mock('./tasks/backfill_task');

const fullJitterBackoffFactoryMock = fullJitterBackoffFactory as jest.Mock;
const scheduleCAIBackfillTaskMock = scheduleCAIBackfillTask as jest.Mock;

describe('AnalyticsIndex', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const taskManager = taskManagerMock.createStart();
  const isServerless = false;
  const indexName = '.test-index-name';
  const indexAlias = '.index-name';
  const indexVersion = 1;
  const painlessScriptId = 'painless_script_id';
  const taskId = 'foobar_task_id';
  const sourceIndex = '.source-index';

  const painlessScript: StoredScript = {
    lang: 'painless',
    source: 'ctx._source.remove("foobar");',
  };
  const mappings: MappingTypeMapping = {
    dynamic: false,
    properties: {
      title: {
        type: 'keyword',
      },
    },
  };
  const mappingsMeta = {
    mapping_version: indexVersion,
    painless_script_id: painlessScriptId,
  };
  const sourceQuery: QueryDslQueryContainer = {
    term: {
      type: 'cases',
    },
  };

  let index: AnalyticsIndex;

  // 1ms delay before retrying
  const nextBackOff = jest.fn().mockReturnValue(1);

  const backOffFactory = {
    create: () => ({ nextBackOff }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    fullJitterBackoffFactoryMock.mockReturnValue(backOffFactory);

    index = new AnalyticsIndex({
      esClient,
      logger,
      indexName,
      indexAlias,
      indexVersion,
      isServerless,
      mappings,
      painlessScript,
      painlessScriptId,
      sourceIndex,
      sourceQuery,
      taskId,
      taskManager,
    });
  });

  it('checks if the index exists', async () => {
    await index.upsertIndex();

    expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
  });

  it('creates index if it does not exist', async () => {
    esClient.indices.exists.mockResolvedValueOnce(false);

    await index.upsertIndex();

    expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
    expect(esClient.putScript).toBeCalledWith({ id: painlessScriptId, script: painlessScript });
    expect(esClient.indices.create).toBeCalledWith({
      index: indexName,
      timeout: '300s',
      mappings: {
        ...mappings,
        _meta: mappingsMeta,
      },
      aliases: {
        [indexAlias]: {
          is_write_index: true,
        },
      },
      settings: {
        index: {
          hidden: true,
          auto_expand_replicas: '0-1',
          mode: 'lookup',
          number_of_shards: 1,
          refresh_interval: '15s',
        },
      },
    });
    expect(scheduleCAIBackfillTaskMock).toHaveBeenCalledWith({
      taskId,
      sourceIndex,
      sourceQuery,
      destIndex: indexName,
      taskManager,
      logger,
    });
  });

  it('updates index if it exists and the mapping has a lower version number', async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.getMapping.mockResolvedValueOnce({
      [indexName]: {
        mappings: {
          _meta: {
            mapping_version: 0, // lower version number
            painless_script_id: painlessScriptId,
          },
          dynamic: mappings.dynamic,
          properties: mappings.properties,
        },
      },
    });

    await index.upsertIndex();

    expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: indexName });
    expect(esClient.putScript).toBeCalledWith({ id: painlessScriptId, script: painlessScript });
    expect(esClient.indices.putMapping).toBeCalledWith({
      index: indexName,
      ...mappings,
      _meta: mappingsMeta,
    });
    expect(scheduleCAIBackfillTaskMock).toBeCalledWith({
      taskId,
      sourceIndex,
      sourceQuery,
      destIndex: indexName,
      taskManager,
      logger,
    });
  });

  it('does not update index if it exists and the mapping has a higher version number', async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.getMapping.mockResolvedValueOnce({
      [indexName]: {
        mappings: {
          _meta: {
            mapping_version: 10, // higher version number
            painless_script_id: painlessScriptId,
          },
          dynamic: mappings.dynamic,
          properties: mappings.properties,
        },
      },
    });

    await index.upsertIndex();

    expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: indexName });
    expect(esClient.putScript).toBeCalledTimes(0);
    expect(esClient.indices.putMapping).toBeCalledTimes(0);
    expect(scheduleCAIBackfillTaskMock).toBeCalledTimes(0);

    expect(logger.debug).toBeCalledWith(
      `[${indexName}] Mapping version is up to date. Skipping update.`,
      { tags: ['cai-index-creation', `${indexName}`] }
    );
  });

  it('does not update index if it exists and the mapping has the same version number', async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.getMapping.mockResolvedValueOnce({ [indexName]: { mappings } });

    await index.upsertIndex();

    expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
    expect(esClient.indices.getMapping).toBeCalledWith({ index: indexName });
    expect(esClient.putScript).toBeCalledTimes(0);
    expect(esClient.indices.putMapping).toBeCalledTimes(0);
    expect(scheduleCAIBackfillTaskMock).toBeCalledTimes(0);

    expect(logger.debug).toBeCalledWith(
      `[${indexName}] Mapping version is up to date. Skipping update.`,
      { tags: ['cai-index-creation', `${indexName}`] }
    );
  });

  describe('Error handling', () => {
    it('retries if the esClient throws a retryable error', async () => {
      esClient.indices.exists
        .mockRejectedValueOnce(new esErrors.ConnectionError('My retryable error A'))
        .mockRejectedValueOnce(new esErrors.TimeoutError('My retryable error B'))
        .mockResolvedValue(true);
      await index.upsertIndex();

      expect(nextBackOff).toBeCalledTimes(2);
      expect(esClient.indices.exists).toBeCalledTimes(3);
      expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
    });

    it('retries if the esClient throws a retryable error when creating an index', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create
        .mockRejectedValueOnce(new esErrors.ConnectionError('My retryable error A'))
        .mockResolvedValue({} as IndicesCreateResponse);

      await index.upsertIndex();

      expect(nextBackOff).toBeCalledTimes(1);
      expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
      expect(esClient.putScript).toBeCalledWith({ id: painlessScriptId, script: painlessScript });
      expect(esClient.indices.create).toBeCalledTimes(2);
      expect(scheduleCAIBackfillTaskMock).toHaveBeenCalledWith({
        taskId,
        sourceIndex,
        sourceQuery,
        destIndex: indexName,
        taskManager,
        logger,
      });
    });

    it('retries if the esClient throws a retryable error when updating an index', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.getMapping.mockResolvedValue({
        [indexName]: {
          mappings: {
            _meta: {
              mapping_version: 0, // lower version number
              painless_script_id: painlessScriptId,
            },
            dynamic: mappings.dynamic,
            properties: mappings.properties,
          },
        },
      });

      esClient.indices.putMapping
        .mockRejectedValueOnce(new esErrors.ConnectionError('My retryable error A'))
        .mockResolvedValue({} as IndicesPutMappingResponse);

      await index.upsertIndex();

      expect(nextBackOff).toBeCalledTimes(1);
      expect(esClient.indices.exists).toBeCalledWith({ index: indexName });
      expect(esClient.indices.getMapping).toBeCalledWith({ index: indexName });
      expect(esClient.putScript).toBeCalledWith({ id: painlessScriptId, script: painlessScript });

      expect(esClient.indices.putMapping).toBeCalledTimes(2);
      expect(esClient.indices.putMapping).toBeCalledWith({
        index: indexName,
        ...mappings,
        _meta: mappingsMeta,
      });

      expect(scheduleCAIBackfillTaskMock).toBeCalledWith({
        taskId,
        sourceIndex,
        sourceQuery,
        destIndex: indexName,
        taskManager,
        logger,
      });
    });

    it('does not retry if the eexecution throws a non-retryable error', async () => {
      esClient.indices.exists.mockRejectedValue(new Error('My terrible error'));

      await expect(index.upsertIndex()).resolves.not.toThrow();

      expect(nextBackOff).toBeCalledTimes(0);
      // Paths in the algorithm after the error are not called.
      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
    });

    it('logs resource_already_exists_exception errors as info', async () => {
      esClient.indices.exists.mockResolvedValueOnce(false);
      esClient.indices.create.mockRejectedValueOnce(
        new esErrors.ResponseError({
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
          statusCode: 404,
        } as unknown as DiagnosticResult)
      );

      await index.upsertIndex();

      expect(logger.debug).toBeCalledWith(
        `[${indexName}] Index already exists. Skipping creation.`,
        { tags: ['cai-index-creation', `${indexName}`] }
      );
      expect(logger.error).not.toBeCalled();
    });
  });
});
