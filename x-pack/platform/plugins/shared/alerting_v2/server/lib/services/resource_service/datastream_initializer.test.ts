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
import { DataStreamClient } from '@kbn/data-streams';

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
      episodeToAlertMigration: true,
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

    // Returns a queued `getIndexTemplate` response that reports v7 (current version)
    // AND the correct alias shape for episode.id — the normal success path.
    const mockInstalledTemplate = () => {
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: '.alerting-test',
            index_template: {
              index_patterns: ['.alerting-test*'],
              composed_of: [],
              _meta: { version: migrationDefinition.version, previousVersions: [] },
              template: {
                mappings: {
                  properties: {
                    episode: {
                      properties: {
                        id: { type: 'alias' as const, path: 'alert.id' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    };

    // Same as above but with the legacy episode.id shape — simulates a version collision.
    const mockInstalledTemplateWithLegacyShape = () => {
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: '.alerting-test',
            index_template: {
              index_patterns: ['.alerting-test*'],
              composed_of: [],
              _meta: { version: migrationDefinition.version, previousVersions: [] },
              template: {
                mappings: {
                  properties: {
                    episode: {
                      properties: {
                        id: { type: 'keyword' as const },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    };

    // All migration tests spy on DataStreamClient.initializeTemplate so we don't
    // have to thread the internal putMapping-rejection mock through every case.
    // The real initializeTemplate calls putIndexTemplate + putMapping internally;
    // the plain ES mock setup already covers the happy-path integration in
    // 'installs the index template with DSL lifecycle' above.
    let initializeTemplateSpy: jest.SpyInstance;
    beforeEach(() => {
      initializeTemplateSpy = jest
        .spyOn(DataStreamClient, 'initializeTemplate')
        .mockResolvedValue(undefined);
    });
    afterEach(() => {
      initializeTemplateSpy.mockRestore();
    });

    it('installs the template before deleting the stream when legacy mapping is found', async () => {
      mockDeployedTemplate(6);
      mockInstalledTemplate(); // installTemplate() verification read — returns v7
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

      expect(initializeTemplateSpy).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({ name: '.alerting-test' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('one-time destructive migration')
      );
    });

    it('aborts the wipe when installTemplate finds the template was not installed (PUT failed)', async () => {
      mockDeployedTemplate(6);
      // initializeTemplate throws (e.g. network error during PUT)
      initializeTemplateSpy.mockRejectedValueOnce(new Error('ES unavailable'));
      // verification read: template is still at v6, confirming the PUT failed
      mockDeployedTemplate(6);
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: { properties: { id: { type: 'keyword' as const } } },
            },
          },
        },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await expect(initializer.initialize()).rejects.toThrow('ES unavailable');

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('aborts the wipe when version matches but episode.id is not an alias (version collision)', async () => {
      // Another change incremented the template to v7 without the alias rename.
      // initializeTemplate() skips the PUT (deployedVersion >= version), so the
      // installed template has the right version but the wrong field shape.
      mockDeployedTemplate(7);
      // verification read: v7, but episode.id is still keyword (wrong shape)
      mockInstalledTemplateWithLegacyShape();
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: { properties: { id: { type: 'keyword' as const } } },
            },
          },
        },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await expect(initializer.initialize()).rejects.toThrow('version collision');

      // Must not delete the stream — data is preserved pending manual template fix.
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('proceeds to the delete when initializeTemplate throws but the template version is current', async () => {
      // The expected case: initializeTemplate PUT v7 but then its internal putMapping on the
      // v6 write index threw a 400. The template IS installed; we must not abort.
      mockDeployedTemplate(6);
      // initializeTemplate throws (the 400 putMapping rejection — type doesn't matter here,
      // because installTemplate() catches any error and re-checks the template version)
      initializeTemplateSpy.mockRejectedValueOnce(new Error('mapper cannot be changed'));
      // verification read: template version is now v7 → the PUT succeeded
      mockInstalledTemplate();
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: { properties: { id: { type: 'keyword' as const } } },
            },
          },
        },
      });
      esClient.indices.deleteDataStream.mockResolvedValueOnce({ acknowledged: true });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({ name: '.alerting-test' });
    });

    it('aborts when the template version GET itself fails after initializeTemplate', async () => {
      mockDeployedTemplate(6);
      initializeTemplateSpy.mockRejectedValueOnce(new Error('putMapping failed'));
      // verification GET throws instead of returning a template
      esClient.indices.getIndexTemplate.mockRejectedValueOnce(new Error('ES unavailable'));
      esClient.indices.getMapping.mockResolvedValueOnce({
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: { properties: { id: { type: 'keyword' as const } } },
            },
          },
        },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await expect(initializer.initialize()).rejects.toThrow('ES unavailable');

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    });

    it('skips the wipe when all backing indices have episode.id as an alias', async () => {
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
        '.ds-.alerting-test-000002': {
          mappings: {
            properties: {
              episode: {
                properties: {
                  id: { type: 'alias' as const, path: 'alert.id' },
                },
              },
            },
          },
        },
      });

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(initializeTemplateSpy).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('episode.id is already an alias field')
      );
    });

    it('wipes when a later backing index still has legacy episode.id even if an earlier one has the alias', async () => {
      // After template install and a rollover, the new write index (listed last by ES) has
      // episode.id as alias, but the old write index still has episode.id as keyword.
      // The previous code exited at the first alias; this test guards against that regression.
      mockDeployedTemplate(7);
      mockInstalledTemplate(); // installTemplate() verification read
      esClient.indices.getMapping.mockResolvedValueOnce({
        // newer backing index: alias shape (v7)
        '.ds-.alerting-test-000002': {
          mappings: {
            properties: {
              episode: {
                properties: {
                  id: { type: 'alias' as const, path: 'alert.id' },
                },
              },
            },
          },
        },
        // older backing index: still legacy keyword shape (v6)
        '.ds-.alerting-test-000001': {
          mappings: {
            properties: {
              episode: {
                properties: {
                  id: { type: 'keyword' as const },
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
    });

    it('wipes when episode is still a real object field even if the deployed template version equals the current version (version collision fix)', async () => {
      // Another PR could increment to the same version without the field rename.
      // The gate must rely on mapping shape, not version number, to handle this correctly.
      mockDeployedTemplate(7);
      mockInstalledTemplate(); // installTemplate() verification read — returns v7
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
    });

    it('skips migration entirely when episodeToAlertMigration is not set', async () => {
      const initializer = new DatastreamInitializer(mockLogger, esClient, resourceDefinition);
      await initializer.initialize();

      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(initializeTemplateSpy).not.toHaveBeenCalled();
    });

    it('skips migration on fresh install (no deployed template, no data stream)', async () => {
      // Empty template array → deployedVersion stays undefined → proceeds to Gate 2.
      // Gate 2 finds no episode field in the mapping → no wipe.
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({ index_templates: [] });
      esClient.indices.getMapping.mockResolvedValueOnce({});

      const initializer = new DatastreamInitializer(mockLogger, esClient, migrationDefinition);
      await initializer.initialize();

      expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(initializeTemplateSpy).not.toHaveBeenCalled();
    });
  });
});
