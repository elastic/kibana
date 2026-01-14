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

import type { ResourceDefinition } from '../../../resources/types';
import { ResourceInitializer } from './resource_initializer';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { LoggerService } from '../logger_service/logger_service';
import { loggerMock } from '@kbn/logging-mocks';

describe('ResourceInitializer', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;

  const resourceDefinition: ResourceDefinition = {
    key: 'data_stream:.alerts-test',
    dataStreamName: '.alerts-test',
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
      },
    },
    ilmPolicy: {
      name: '.alerts-test-ilm-policy',
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
    mockLoggerService = new LoggerService(mockLogger);
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    esClient.ilm.putLifecycle.mockResolvedValue({ acknowledged: true });
    esClient.cluster.putComponentTemplate.mockResolvedValue({ acknowledged: true });
    esClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    esClient.indices.createDataStream.mockResolvedValue({ acknowledged: true });
  });

  it('installs ILM policy, component template, index template, then creates the data stream', async () => {
    const initializer = new ResourceInitializer(mockLoggerService, esClient, resourceDefinition);

    await initializer.initialize();

    expect(esClient.ilm.putLifecycle).toHaveBeenCalled();
    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.createDataStream).toHaveBeenCalled();

    const componentOrder = esClient.cluster.putComponentTemplate.mock.invocationCallOrder[0];
    const indexOrder = esClient.indices.putIndexTemplate.mock.invocationCallOrder[0];

    // Order matters: the index template references the component template.
    expect(componentOrder).toBeLessThan(indexOrder);
  });

  it('ignores 409 errors when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({ statusCode: 409 } as DiagnosticResult)
    );

    const initializer = new ResourceInitializer(mockLoggerService, esClient, resourceDefinition);
    await expect(initializer.initialize()).resolves.toBeUndefined();
  });

  it('ignores 400 errors when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
      } as DiagnosticResult)
    );

    const initializer = new ResourceInitializer(mockLoggerService, esClient, resourceDefinition);
    await expect(initializer.initialize()).resolves.toBeUndefined();
  });

  it('re-throws 400 errors other than resource_already_exists_exception when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 400,
      } as DiagnosticResult)
    );

    const initializer = new ResourceInitializer(mockLoggerService, esClient, resourceDefinition);
    await expect(initializer.initialize()).rejects.toThrow();
  });

  it('re-throws the rest of the errors when creating the data stream', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode: 500,
      } as DiagnosticResult)
    );

    const initializer = new ResourceInitializer(mockLoggerService, esClient, resourceDefinition);
    await expect(initializer.initialize()).rejects.toThrow();
  });
});
