/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { ResourceDefinition } from '../../../resources/datastreams/types';
import { DatastreamInitializer } from './datastream_initializer';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

describe('DatastreamInitializer', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;

  const resourceDefinition: ResourceDefinition = {
    key: 'data_stream:.alerting-test',
    dataStreamName: '.alerting-test',
    version: 1,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
      },
    },
    lifecycle: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggerMock.create();
    // data streams uses the esClient internally
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] });
    esClient.indices.getIndexTemplate.mockResolvedValue({ index_templates: [] });
    esClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    esClient.indices.createDataStream.mockResolvedValue({ acknowledged: true });
    esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });
  });

  it('installs the index template with DSL lifecycle, then creates the data stream', async () => {
    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: resourceDefinition.dataStreamName,
        template: expect.objectContaining({
          lifecycle: resourceDefinition.lifecycle,
        }),
      })
    );

    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: resourceDefinition.dataStreamName,
    });
  });

  it('installs the expected index template settings', async () => {
    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({
            'index.auto_expand_replicas': '0-1',
            'index.mapping.total_fields.limit': 2500,
            'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            'index.lifecycle.prefer_ilm': false,
          }),
        }),
      })
    );
  });

  it('ignores 409 errors when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({ statusCode: 409 } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
    await expect(initializer.initialize()).resolves.toBeUndefined();
  });

  it('ignores 400 errors of type resource_already_exists_exception when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
      } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
    await expect(initializer.initialize()).resolves.toBeUndefined();
  });

  it('re-throws 400 errors other than resource_already_exists_exception when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
      } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
    await expect(initializer.initialize()).rejects.toThrow();
  });

  it('re-throws the rest of the errors when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 500,
      } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
    await expect(initializer.initialize()).rejects.toThrow();
  });

  it('applies auto_expand_replicas to existing backing indices', async () => {
    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: resourceDefinition.dataStreamName,
      settings: { 'index.auto_expand_replicas': '0-1' },
    });
  });

  it('applies auto_expand_replicas to existing backing indices when the data stream already exists', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({ statusCode: 409 } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
    await initializer.initialize();

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: resourceDefinition.dataStreamName,
      settings: { 'index.auto_expand_replicas': '0-1' },
    });
  });

  it('does not fail initialization when updating existing backing indices settings fails', async () => {
    esClient.indices.putSettings.mockRejectedValueOnce(
      new errors.ResponseError({ statusCode: 500 } as DiagnosticResult)
    );

    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await expect(initializer.initialize()).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update auto_expand_replicas')
    );
  });

  it('installs the index template with the max priority so it wins over overlapping user templates', async () => {
    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Max Java long value, serialized as a string to avoid JS number precision loss.
        priority: '9223372036854775807',
      })
    );
  });

  describe('maybeDestroyForMigration', () => {
    const migrationDefinition: ResourceDefinition = {
      key: 'data_stream:.alerting-test',
      dataStreamName: '.alerting-test',
      version: 7,
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
        },
      },
      lifecycle: {},
      destroyOnVersionBelow: 7,
    };

    const mockDeployedTemplate = (version: number) => {
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: '.alerting-test',
            index_template: {
              index_patterns: ['.alerting-test*'],
              composed_of: [],
              _meta: { version, previousVersions: [] },
            },
          },
        ],
      });
    };

    it('destroys the data stream when deployed version < destroyOnVersionBelow and episode has real (non-alias) sub-fields', async () => {
      mockDeployedTemplate(6);
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: {
                properties: {
                  id: { type: 'keyword' as const },
                  status: { type: 'keyword' as const },
                },
              },
            },
          },
        },
      });
      esClient.indices.deleteDataStream.mockResolvedValueOnce({ acknowledged: true });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({ name: '.alerting-test' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('one-time destructive migration')
      );
    });

    it('skips the wipe when episode.id is already an alias (handles hand-migrated clusters)', async () => {
      mockDeployedTemplate(6);
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: {
                properties: {
                  id: { type: 'alias' as const, path: 'alert.id' },
                  status: { type: 'alias' as const, path: 'alert.status' },
                },
              },
            },
          },
        },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('episode field is not a legacy object')
      );
    });

    it('skips the wipe when deployed version >= destroyOnVersionBelow (migration already ran)', async () => {
      mockDeployedTemplate(7);

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('skips migration entirely when destroyOnVersionBelow is not set', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('skips migration when the index template does not exist (fresh install)', async () => {
      // Empty array: no deployed version found → deployedVersion stays undefined → returns early.
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({ index_templates: [] });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });
  });
});
