/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { IndexResourceDefinition } from '../../../resources/indices/types';
import { IndexInitializer } from './index_initializer';

describe('IndexInitializer', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;

  const resourceDefinition: IndexResourceDefinition = {
    key: 'index:.test-findings',
    indexName: '.test-findings',
    version: 1,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        status: { type: 'keyword' },
      },
    },
    ilmPolicy: {
      name: '.test-findings-ilm-policy',
      policy: {
        _meta: { managed: true },
        phases: {
          hot: { actions: {} },
        },
      },
    },
    pipeline: {
      name: '.test-findings-pipeline',
      processors: [
        { set: { field: '@timestamp', value: '{{{_ingest.timestamp}}}', override: false } },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.ilm.putLifecycle.mockResolvedValue({ acknowledged: true });
    esClient.ingest.putPipeline.mockResolvedValue({ acknowledged: true });
    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.create.mockResolvedValue({
      acknowledged: true,
      shards_acknowledged: true,
      index: '.test-findings',
    });
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
    esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });
  });

  describe('when index does not exist', () => {
    it('creates ILM policy, pipeline, and index', async () => {
      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);

      await initializer.initialize();

      expect(esClient.ilm.putLifecycle).toHaveBeenCalledWith({
        name: resourceDefinition.ilmPolicy.name,
        policy: resourceDefinition.ilmPolicy.policy,
      });
      expect(esClient.ingest.putPipeline).toHaveBeenCalledWith({
        id: resourceDefinition.pipeline!.name,
        processors: resourceDefinition.pipeline!.processors,
      });
      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.test-findings',
          mappings: expect.objectContaining({
            _meta: { managed: true, managed_by: 'alerting_v2', version: 1 },
          }),
          settings: expect.objectContaining({
            'index.lifecycle.name': '.test-findings-ilm-policy',
            'index.hidden': true,
            'index.default_pipeline': '.test-findings-pipeline',
          }),
        })
      );
    });

    it('skips pipeline when not defined', async () => {
      const { pipeline: _, ...noPipelineDefinition } = resourceDefinition;
      const initializer = new IndexInitializer(mockLogger, esClient, noPipelineDefinition);

      await initializer.initialize();

      expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.not.objectContaining({
            'index.default_pipeline': expect.anything(),
          }),
        })
      );
    });

    it('ignores resource_already_exists_exception on create', async () => {
      esClient.indices.create.mockRejectedValueOnce({
        meta: { body: { error: { type: 'resource_already_exists_exception' } } },
      });

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).resolves.toBeUndefined();
    });

    it('re-throws other errors on create', async () => {
      esClient.indices.create.mockRejectedValueOnce({
        meta: { body: { error: { type: 'mapper_parsing_exception' } } },
      });

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).rejects.toBeDefined();
    });
  });

  describe('when index already exists', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(true);
    });

    it('skips update when version matches', async () => {
      esClient.indices.getMapping.mockResolvedValue({
        '.test-findings': {
          mappings: { _meta: { managed: true, managed_by: 'alerting_v2', version: 1 } },
        },
      } as never);

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putMapping).not.toHaveBeenCalled();
      expect(esClient.indices.putSettings).not.toHaveBeenCalled();
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('updates mappings and settings when version differs', async () => {
      esClient.indices.getMapping.mockResolvedValue({
        '.test-findings': {
          mappings: { _meta: { managed: true, managed_by: 'alerting_v2', version: 0 } },
        },
      } as never);

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.test-findings',
          _meta: expect.objectContaining({ version: 1 }),
        })
      );
      expect(esClient.indices.putSettings).toHaveBeenCalledWith({
        index: '.test-findings',
        settings: { 'index.default_pipeline': '.test-findings-pipeline' },
      });
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('updates when version is missing from existing index', async () => {
      esClient.indices.getMapping.mockResolvedValue({
        '.test-findings': {
          mappings: {},
        },
      } as never);

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putMapping).toHaveBeenCalled();
    });

    it('updates when getMapping fails', async () => {
      esClient.indices.getMapping.mockRejectedValueOnce(new Error('connection timeout'));

      const initializer = new IndexInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putMapping).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch version')
      );
    });
  });
});
