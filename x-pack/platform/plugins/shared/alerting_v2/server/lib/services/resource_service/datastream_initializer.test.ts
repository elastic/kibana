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
});
