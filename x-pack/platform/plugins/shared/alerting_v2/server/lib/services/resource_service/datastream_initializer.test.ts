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
import { computeMappingHash } from './mapping_hash';
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
    ilmPolicy: {
      name: '.alerting-test-ilm-policy',
      policy: {
        _meta: { managed: true },
        phases: {
          hot: {
            actions: {
              rollover: {
                max_age: '30d',
                max_primary_shard_size: '50gb',
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggerMock.create();
    // data streams uses the esClient internally
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.ilm.putLifecycle.mockResolvedValue({ acknowledged: true });
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] });
    esClient.indices.getIndexTemplate.mockResolvedValue({ index_templates: [] });
    esClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    esClient.indices.createDataStream.mockResolvedValue({ acknowledged: true });
  });

  it('installs ILM policy, index template, then creates the data stream', async () => {
    const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.ilm.putLifecycle).toHaveBeenCalledWith({
      name: resourceDefinition.ilmPolicy.name,
      policy: resourceDefinition.ilmPolicy.policy,
    });
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: resourceDefinition.dataStreamName,
      })
    );
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: resourceDefinition.dataStreamName,
    });
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

  describe('auto-versioning via mapping hash', () => {
    const currentHash = computeMappingHash(resourceDefinition.mappings.properties ?? {});

    it('includes the computed mappingHash in _meta', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          _meta: expect.objectContaining({ mappingHash: currentHash }),
        })
      );
    });

    it('uses the base version when no index template exists', async () => {
      esClient.indices.getIndexTemplate.mockResolvedValue({ index_templates: [] });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    });

    it('uses the base version when getIndexTemplate returns 404', async () => {
      esClient.indices.getIndexTemplate.mockRejectedValueOnce(
        new errors.ResponseError({ statusCode: 404 } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    });

    it('keeps the deployed version when the mapping hash matches', async () => {
      esClient.indices.getIndexTemplate.mockResolvedValue({
        index_templates: [
          {
            name: resourceDefinition.dataStreamName,
            index_template: {
              index_patterns: [],
              composed_of: [],
              _meta: { version: 5, mappingHash: currentHash },
              template: {},
            },
          },
        ],
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('auto-increments version when the mapping hash differs', async () => {
      esClient.indices.getIndexTemplate.mockResolvedValue({
        index_templates: [
          {
            name: resourceDefinition.dataStreamName,
            index_template: {
              index_patterns: [],
              composed_of: [],
              _meta: { version: 3, mappingHash: 'stale_hash', previousVersions: [] },
              template: {},
            },
          },
        ],
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('bumping version from 3 to 4')
      );
    });

    it('uses the base version when it is higher than deployedVersion + 1', async () => {
      const resourceWithHighBase: ResourceDefinition = {
        ...resourceDefinition,
        version: 10,
      };

      esClient.indices.getIndexTemplate.mockResolvedValue({
        index_templates: [
          {
            name: resourceWithHighBase.dataStreamName,
            index_template: {
              index_patterns: [],
              composed_of: [],
              _meta: { version: 3, mappingHash: 'stale_hash', previousVersions: [] },
              template: {},
            },
          },
        ],
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceWithHighBase);
      await initializer.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('bumping version from 3 to')
      );
    });
  });
});
