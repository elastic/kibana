/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { ResourceDefinition } from '../../../resources/datastreams/types';
import { EsUnacknowledgedError } from '../retry_service/es_unacknowledged_error';
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
    finalPipeline: {
      id: '.alerting-test-ingest-timestamp',
      version: 2,
      processors: [{ set: { field: '@timestamp', value: '{{{_ingest.timestamp}}}' } }],
    },
  };

  const pipelineNotFound = () =>
    new errors.ResponseError({ statusCode: 404, body: {} } as DiagnosticResult);

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
    esClient.ingest.getPipeline.mockRejectedValue(pipelineNotFound());
    esClient.ingest.putPipeline.mockResolvedValue({ acknowledged: true });
  });

  describe('ingest pipeline', () => {
    it('installs the pipeline before the index template', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

      await initializer.initialize();

      expect(esClient.ingest.putPipeline).toHaveBeenCalledWith({
        id: resourceDefinition.finalPipeline.id,
        version: resourceDefinition.finalPipeline.version,
        processors: resourceDefinition.finalPipeline.processors,
        _meta: { managed: true },
      });
      expect(esClient.ingest.putPipeline.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.indices.putIndexTemplate.mock.invocationCallOrder[0]
      );
    });

    it('wires the pipeline as index.final_pipeline on the index template', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

      await initializer.initialize();

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            settings: expect.objectContaining({
              'index.final_pipeline': resourceDefinition.finalPipeline.id,
            }),
          }),
        })
      );
    });

    it('skips the pipeline install when the deployed version is current', async () => {
      esClient.ingest.getPipeline.mockResolvedValue({
        [resourceDefinition.finalPipeline.id]: { version: 2, processors: [] },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
    });

    it('upgrades the pipeline when the deployed version is older', async () => {
      esClient.ingest.getPipeline.mockResolvedValue({
        [resourceDefinition.finalPipeline.id]: { version: 1, processors: [] },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
    });

    it('fails initialization with a retryable error when the pipeline install is not acknowledged', async () => {
      esClient.ingest.putPipeline.mockResolvedValue({ acknowledged: false });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).rejects.toBeInstanceOf(EsUnacknowledgedError);
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('re-throws non-404 errors when reading the deployed pipeline', async () => {
      esClient.ingest.getPipeline.mockRejectedValue(
        new errors.ResponseError({ statusCode: 500 } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).rejects.toThrow();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('applies index.final_pipeline to existing backing indices', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

      await initializer.initialize();

      expect(esClient.indices.putSettings).toHaveBeenCalledWith({
        index: resourceDefinition.dataStreamName,
        settings: { 'index.final_pipeline': resourceDefinition.finalPipeline.id },
      });
    });

    it('fails initialization when applying index.final_pipeline to existing indices fails', async () => {
      esClient.indices.putSettings.mockImplementation(async ({ settings }) => {
        if (settings && 'index.final_pipeline' in settings) {
          throw new errors.ResponseError({ statusCode: 500 } as DiagnosticResult);
        }
        return { acknowledged: true };
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).rejects.toThrow();
    });

    it('fails initialization with a retryable error when applying index.final_pipeline to existing indices is not acknowledged', async () => {
      esClient.indices.putSettings.mockImplementation(async ({ settings }) => ({
        acknowledged: !(settings && 'index.final_pipeline' in settings),
      }));

      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await expect(initializer.initialize()).rejects.toBeInstanceOf(EsUnacknowledgedError);
    });
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

  it('does not fail initialization when updating existing backing indices replica settings fails', async () => {
    esClient.indices.putSettings.mockImplementation(async ({ settings }) => {
      if (settings && 'index.auto_expand_replicas' in settings) {
        throw new errors.ResponseError({ statusCode: 500 } as DiagnosticResult);
      }
      return { acknowledged: true };
    });

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

  describe('forceReset', () => {
    const forceResetDefinition: ResourceDefinition = {
      ...resourceDefinition,
      version: 8,
      forceReset: { version: 7 },
    };

    const notFound = () =>
      new errors.ResponseError({ statusCode: 404, body: {} } as DiagnosticResult);

    // Mocks the next data stream read only: later reads find no data stream, as after the delete.
    const mockExistingDataStream = (meta: IndicesDataStream['_meta']) => {
      esClient.indices.getDataStream.mockResolvedValueOnce({
        data_streams: [
          {
            name: forceResetDefinition.dataStreamName,
            indices: [{ index_name: '.ds-.alerting-test-000001', index_uuid: 'test-uuid' }],
            _meta: meta,
          } as IndicesDataStream,
        ],
      });
    };

    beforeEach(() => {
      esClient.indices.deleteDataStream.mockResolvedValue({ acknowledged: true });
      // Template reads return the last installed template, as Elasticsearch does.
      esClient.indices.putIndexTemplate.mockImplementation(async ({ _meta }) => {
        esClient.indices.getIndexTemplate.mockResolvedValue({
          index_templates: [
            {
              name: forceResetDefinition.dataStreamName,
              index_template: { index_patterns: [], composed_of: [], _meta },
            },
          ],
        });
        return { acknowledged: true };
      });
    });

    it('does not read the data stream ahead of DataStreamClient when forceReset is not set', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);

      await initializer.initialize();

      expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('does not delete anything when the data stream does not exist', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
        name: forceResetDefinition.dataStreamName,
      });
    });

    it('does not delete anything when reading the data stream returns 404', async () => {
      esClient.indices.getDataStream.mockRejectedValueOnce(notFound());

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it.each([6, 7])(
      'installs the current template, then deletes a data stream created from v%i and recreates it',
      async (createdFromVersion) => {
        mockExistingDataStream({ version: createdFromVersion, managed: true });

        const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

        await initializer.initialize();

        expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
        expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            _meta: expect.objectContaining({ version: forceResetDefinition.version }),
          })
        );
        expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
          name: forceResetDefinition.dataStreamName,
        });
        const [installOrder] = esClient.indices.putIndexTemplate.mock.invocationCallOrder;
        const [deleteOrder] = esClient.indices.deleteDataStream.mock.invocationCallOrder;
        const [createOrder] = esClient.indices.createDataStream.mock.invocationCallOrder;
        expect(installOrder).toBeLessThan(deleteOrder);
        expect(deleteOrder).toBeLessThan(createOrder);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            `Deleting data stream ${forceResetDefinition.dataStreamName} created from index template v${createdFromVersion}`
          )
        );
      }
    );

    it.each<[string, IndicesDataStream['_meta']]>([
      ['no _meta', undefined],
      ['no version in _meta', { managed: true }],
    ])('deletes a data stream with %s', async (_description, meta) => {
      mockExistingDataStream(meta);

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
        name: forceResetDefinition.dataStreamName,
      });
    });

    it('keeps a data stream created from a version above forceReset.version', async () => {
      mockExistingDataStream({ version: 8, managed: true });

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('tolerates a 404 when the data stream is deleted concurrently', async () => {
      mockExistingDataStream({ version: 7, managed: true });
      esClient.indices.deleteDataStream.mockRejectedValueOnce(notFound());

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await expect(initializer.initialize()).resolves.toBeUndefined();
      expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
        name: forceResetDefinition.dataStreamName,
      });
    });

    it('deletes the data stream when the current template mappings cannot be applied to its write index', async () => {
      // Read by the reset check, then by DataStreamClient.initializeTemplate.
      mockExistingDataStream({ version: 7, managed: true });
      mockExistingDataStream({ version: 7, managed: true });
      esClient.indices.simulateIndexTemplate.mockResolvedValue({
        template: { aliases: {}, mappings: {}, settings: {} },
      });
      esClient.indices.putMapping.mockRejectedValueOnce(
        new errors.ResponseError({ statusCode: 400, body: {} } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await expect(initializer.initialize()).resolves.toBeUndefined();
      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
        name: forceResetDefinition.dataStreamName,
      });
      expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
        name: forceResetDefinition.dataStreamName,
      });
    });

    it('fails initialization without deleting the data stream when the current template is not installed', async () => {
      mockExistingDataStream({ version: 7, managed: true });
      esClient.indices.putIndexTemplate.mockRejectedValueOnce(
        new errors.ResponseError({ statusCode: 500, body: {} } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await expect(initializer.initialize()).rejects.toMatchObject({ statusCode: 500 });
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('fails initialization without recreating the data stream when the delete fails', async () => {
      mockExistingDataStream({ version: 7, managed: true });
      esClient.indices.deleteDataStream.mockRejectedValueOnce(
        new errors.ResponseError({ statusCode: 500 } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await expect(initializer.initialize()).rejects.toThrow();
      expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
    });

    it('fails initialization without deleting anything when reading the data stream fails', async () => {
      esClient.indices.getDataStream.mockRejectedValueOnce(
        new errors.ResponseError({ statusCode: 500 } as DiagnosticResult)
      );

      const initializer = new DatastreamInitializer(mockLogger, esClient, forceResetDefinition);

      await expect(initializer.initialize()).rejects.toThrow();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });
  });
});
