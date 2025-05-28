/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import { createConcreteWriteIndex, setConcreteWriteIndex } from './create_concrete_write_index';
import { getDataStreamAdapter } from './data_stream_adapter';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

interface EsError extends Error {
  statusCode?: number;
  meta?: {
    body: {
      error: {
        type: string;
      };
    };
  };
}

const GetAliasResponse = {
  '.internal.alerts-test.alerts-default-000001': {
    aliases: {
      alias_1: {
        is_hidden: true,
      },
      alias_2: {
        is_hidden: true,
      },
    },
  },
};

const GetDataStreamResponse = {
  data_streams: ['any-content-here-means-already-exists'],
} as unknown as IndicesGetDataStreamResponse;

const SimulateTemplateResponse = {
  template: {
    aliases: {
      alias_name_1: {
        is_hidden: true,
      },
      alias_name_2: {
        is_hidden: true,
      },
    },
    mappings: { enabled: false },
    settings: {},
  },
};

const IndexPatterns = {
  template: '.alerts-test.alerts-default-index-template',
  pattern: '.internal.alerts-test.alerts-default-*',
  basePattern: '.alerts-test.alerts-*',
  alias: '.alerts-test.alerts-default',
  name: '.internal.alerts-test.alerts-default-000001',
  validPrefixes: ['.internal.alerts-', '.alerts-'],
};

describe('createConcreteWriteIndex', () => {
  for (const useDataStream of [false, true]) {
    const label = useDataStream ? 'data streams' : 'aliases';
    const dataStreamAdapter = getDataStreamAdapter({
      useDataStreamForAlerts: useDataStream,
    });

    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
    });

    describe(`using ${label} for alert indices`, () => {
      it(`should call esClient to put index template`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        clusterClient.indices.getDataStream.mockImplementation(async () => ({
          data_streams: [],
        }));
        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).toHaveBeenCalledWith({
            name: '.alerts-test.alerts-default',
          });
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
        }
      });

      it(`should retry on transient ES errors`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        clusterClient.indices.getDataStream.mockImplementation(async () => ({
          data_streams: [],
        }));
        clusterClient.indices.create
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockResolvedValue({
            index: '.internal.alerts-test.alerts-default-000001',
            shards_acknowledged: true,
            acknowledged: true,
          });
        clusterClient.indices.createDataStream
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockResolvedValue({
            acknowledged: true,
          });
        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).toHaveBeenCalledTimes(3);
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledTimes(3);
        }
      });

      it(`should log and throw error if max retries exceeded`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        clusterClient.indices.getDataStream.mockImplementation(async () => ({
          data_streams: [],
        }));
        clusterClient.indices.create.mockRejectedValue(new EsErrors.ConnectionError('foo'));
        clusterClient.indices.createDataStream.mockRejectedValue(
          new EsErrors.ConnectionError('foo')
        );
        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Error creating data stream .alerts-test.alerts-default - foo`
            : `Error creating concrete write index - foo`
        );

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).toHaveBeenCalledTimes(4);
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledTimes(4);
        }
      });

      it(`should log and throw error if ES throws error`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        clusterClient.indices.getDataStream.mockImplementation(async () => ({
          data_streams: [],
        }));
        clusterClient.indices.create.mockRejectedValueOnce(new Error('generic error'));
        clusterClient.indices.createDataStream.mockRejectedValueOnce(new Error('generic error'));

        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Error creating data stream .alerts-test.alerts-default - generic error`
            : `Error creating concrete write index - generic error`
        );
      });

      it(`should log and return if ES throws resource_already_exists_exception error and existing index is already write index`, async () => {
        if (useDataStream) return;

        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        const error = new Error(`fail`) as EsError;
        error.meta = {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        };
        clusterClient.indices.create.mockRejectedValueOnce(error);
        clusterClient.indices.get.mockImplementationOnce(async () => ({
          '.internal.alerts-test.alerts-default-000001': {
            aliases: {
              '.alerts-test.alerts-default': { is_write_index: true },
            },
          },
        }));

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);
      });

      it(`should retry getting index on transient ES error`, async () => {
        if (useDataStream) return;
        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        const error = new Error(`fail`) as EsError;
        error.statusCode = 404;
        error.meta = {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        };
        clusterClient.indices.create.mockRejectedValueOnce(error);
        clusterClient.indices.get
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockImplementationOnce(async () => ({
            '.internal.alerts-test.alerts-default-000001': {
              aliases: {
                '.alerts-test.alerts-default': { is_write_index: true },
              },
            },
          }));

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(clusterClient.indices.get).toHaveBeenCalledTimes(3);
        expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);
      });

      it(`should log and throw error if ES throws resource_already_exists_exception error and existing index is not the write index`, async () => {
        if (useDataStream) return;

        clusterClient.indices.getAlias.mockImplementation(async () => ({}));
        const error = new Error(`fail`) as EsError;
        error.meta = {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        };
        clusterClient.indices.create.mockRejectedValueOnce(error);
        clusterClient.indices.get.mockImplementationOnce(async () => ({
          '.internal.alerts-test.alerts-default-000001': {
            aliases: {
              '.alerts-test.alerts-default': { is_write_index: false },
            },
          },
        }));

        const ccwiPromise = createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        await expect(() => ccwiPromise).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Attempted to create index: .internal.alerts-test.alerts-default-000001 as the write index for alias: .alerts-test.alerts-default, but the index already exists and is not the write index for the alias"`
        );

        expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);
      });

      it(`should call esClient to put index template if get alias throws 404`, async () => {
        const error = new Error(`not found`) as EsError;
        error.statusCode = 404;
        clusterClient.indices.getAlias.mockRejectedValueOnce(error);
        clusterClient.indices.getDataStream.mockRejectedValueOnce(error);
        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).toHaveBeenCalledWith({
            name: '.alerts-test.alerts-default',
          });
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
        }
      });

      it(`should log and throw error if get alias throws non-404 error`, async () => {
        const error = new Error(`fatal error`) as EsError;
        error.statusCode = 500;
        clusterClient.indices.getAlias.mockRejectedValueOnce(error);
        clusterClient.indices.getDataStream.mockRejectedValueOnce(error);

        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"fatal error"`);
        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Error fetching data stream for .alerts-test.alerts-default - fatal error`
            : `Error fetching concrete indices for .internal.alerts-test.alerts-default-* pattern - fatal error`
        );
      });

      it(`should update underlying settings and mappings of existing concrete indices if they exist`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (!useDataStream) {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
        }

        expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(useDataStream ? 1 : 2);
        expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(useDataStream ? 1 : 2);
      });

      it(`should skip updating underlying settings and mappings of existing concrete indices if they follow an unexpected naming convention`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => ({
          bad_index_name: {
            aliases: {
              alias_1: {
                is_hidden: true,
              },
            },
          },
        }));

        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (!useDataStream) {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
          expect(logger.warn).toHaveBeenCalledWith(
            `Found unexpected concrete index name "bad_index_name" while expecting index with one of the following prefixes: [.internal.alerts-,.alerts-] Not updating mappings or settings for this index.`
          );
        }

        expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(useDataStream ? 1 : 0);
        expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(useDataStream ? 1 : 0);
      });

      it(`should retry simulateIndexTemplate on transient ES errors`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockImplementation(async () => SimulateTemplateResponse);

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(
          useDataStream ? 3 : 4
        );
      });

      it(`should retry getting alias on transient ES errors`, async () => {
        clusterClient.indices.getAlias
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        if (useDataStream) {
          expect(clusterClient.indices.getDataStream).toHaveBeenCalledTimes(3);
        } else {
          expect(clusterClient.indices.getAlias).toHaveBeenCalledTimes(3);
        }
      });

      it(`should retry settings update on transient ES errors`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putSettings
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockResolvedValue({ acknowledged: true });

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(useDataStream ? 3 : 4);
      });

      it(`should log and throw error on settings update if max retries exceeded`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putSettings.mockRejectedValue(new EsErrors.ConnectionError('foo'));
        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);
        expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(useDataStream ? 4 : 7);
        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Failed to PUT index.mapping.total_fields.limit settings for .alerts-test.alerts-default: foo`
            : `Failed to PUT index.mapping.total_fields.limit settings for alias_1: foo`
        );
      });

      it(`should log and throw error on settings update if ES throws error`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putSettings.mockRejectedValue(new Error('generic error'));

        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Failed to PUT index.mapping.total_fields.limit settings for .alerts-test.alerts-default: generic error`
            : `Failed to PUT index.mapping.total_fields.limit settings for alias_1: generic error`
        );
      });

      it(`should retry mappings update on transient ES errors`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putMapping
          .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
          .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
          .mockResolvedValue({ acknowledged: true });

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(useDataStream ? 3 : 4);
      });

      it(`should log and throw error on mappings update if max retries exceeded`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putMapping.mockRejectedValue(new EsErrors.ConnectionError('foo'));
        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);
        expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(useDataStream ? 4 : 7);
        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Failed to PUT mapping for .alerts-test.alerts-default: foo`
            : `Failed to PUT mapping for alias_1: foo`
        );
      });

      it(`should log and throw error on mappings update if ES throws error`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putMapping.mockRejectedValue(new Error('generic error'));

        await expect(() =>
          createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Failed to PUT mapping for .alerts-test.alerts-default: generic error`
            : `Failed to PUT mapping for alias_1: generic error`
        );
      });

      it(`should increase the limit and retry if ES throws an exceeded limit error`, async () => {
        const existingIndexTemplate = {
          name: 'test-template',
          index_template: {
            index_patterns: ['test*'],
            composed_of: ['test-mappings'],
            template: {
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.alerts-ilm-policy',
                  rollover_alias: `.alerts-empty-default`,
                },
                'index.mapping.total_fields.limit': 1800,
              },
              mappings: {
                dynamic: false,
              },
            },
          },
        };

        clusterClient.indices.getIndexTemplate.mockResolvedValue({
          index_templates: [existingIndexTemplate],
        });
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );

        if (useDataStream) {
          clusterClient.indices.putMapping
            .mockRejectedValueOnce(new Error('Limit of total fields [2500] has been exceeded'))
            .mockRejectedValueOnce(new Error('Limit of total fields [2501] has been exceeded'))
            .mockRejectedValueOnce(new Error('Limit of total fields [2503] has been exceeded'))
            .mockResolvedValue({ acknowledged: true });

          await createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          });

          expect(clusterClient.indices.putSettings).toBeCalledTimes(4);
          expect(clusterClient.indices.putIndexTemplate).toBeCalledTimes(3);
          expect(logger.info).toBeCalledTimes(3);

          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(1, {
            index: '.alerts-test.alerts-default',
            settings: {
              'index.mapping.total_fields.limit': 2500,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(2, {
            index: '.alerts-test.alerts-default',
            settings: {
              'index.mapping.total_fields.limit': 2501,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(3, {
            index: '.alerts-test.alerts-default',
            settings: {
              'index.mapping.total_fields.limit': 2503,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(4, {
            index: '.alerts-test.alerts-default',
            settings: {
              'index.mapping.total_fields.limit': 2506,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });

          expect(clusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(1, {
            composed_of: ['test-mappings'],
            index_patterns: ['test*'],
            template: {
              mappings: {
                dynamic: false,
              },
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.alerts-ilm-policy',
                  rollover_alias: '.alerts-empty-default',
                },
                'index.mapping.total_fields.limit': 2501,
                'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
              },
            },
            name: 'test-template',
          });

          expect(logger.info).toHaveBeenNthCalledWith(
            1,
            'total_fields.limit of .alerts-test.alerts-default has been increased from 2500 to 2501'
          );
          expect(logger.info).toHaveBeenNthCalledWith(
            2,
            'total_fields.limit of .alerts-test.alerts-default has been increased from 2501 to 2503'
          );
          expect(logger.info).toHaveBeenNthCalledWith(
            3,
            'total_fields.limit of .alerts-test.alerts-default has been increased from 2503 to 2506'
          );
          expect(logger.debug).toHaveBeenNthCalledWith(
            3,
            `Retrying PUT mapping for .alerts-test.alerts-default with increased total_fields.limit of 2501. Attempt: 1`
          );
          expect(logger.debug).toHaveBeenNthCalledWith(
            4,
            `Retrying PUT mapping for .alerts-test.alerts-default with increased total_fields.limit of 2503. Attempt: 2`
          );
          expect(logger.debug).toHaveBeenNthCalledWith(
            5,
            `Retrying PUT mapping for .alerts-test.alerts-default with increased total_fields.limit of 2506. Attempt: 3`
          );
        } else {
          clusterClient.indices.putMapping
            .mockResolvedValueOnce({ acknowledged: true })
            .mockRejectedValueOnce(new Error('Limit of total fields [2500] has been exceeded'))
            .mockRejectedValueOnce(new Error('Limit of total fields [2501] has been exceeded'))
            .mockRejectedValueOnce(new Error('Limit of total fields [2503] has been exceeded'))
            .mockResolvedValue({ acknowledged: true });

          await createConcreteWriteIndex({
            logger,
            esClient: clusterClient,
            indexPatterns: IndexPatterns,
            totalFieldsLimit: 2500,
            dataStreamAdapter,
          });

          expect(clusterClient.indices.putSettings).toBeCalledTimes(5);
          expect(clusterClient.indices.putIndexTemplate).toBeCalledTimes(3);
          expect(logger.info).toBeCalledTimes(4);

          expect(clusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(1, {
            composed_of: ['test-mappings'],
            index_patterns: ['test*'],
            template: {
              mappings: {
                dynamic: false,
              },
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.alerts-ilm-policy',
                  rollover_alias: '.alerts-empty-default',
                },
                'index.mapping.total_fields.limit': 2501,
                'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
              },
            },
            name: 'test-template',
          });

          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(2, {
            index: '.internal.alerts-test.alerts-default-000001',
            settings: {
              'index.mapping.total_fields.limit': 2500,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(3, {
            index: '.internal.alerts-test.alerts-default-000001',
            settings: {
              'index.mapping.total_fields.limit': 2501,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(4, {
            index: '.internal.alerts-test.alerts-default-000001',
            settings: {
              'index.mapping.total_fields.limit': 2503,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });
          expect(clusterClient.indices.putSettings).toHaveBeenNthCalledWith(5, {
            index: '.internal.alerts-test.alerts-default-000001',
            settings: {
              'index.mapping.total_fields.limit': 2506,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
          });

          // The first call to logger.info is in createAliasStream, therefore we start testing from 2nd
          expect(logger.info).toHaveBeenNthCalledWith(
            2,
            'total_fields.limit of alias_2 has been increased from 2500 to 2501'
          );
          expect(logger.info).toHaveBeenNthCalledWith(
            3,
            'total_fields.limit of alias_2 has been increased from 2501 to 2503'
          );
          expect(logger.info).toHaveBeenNthCalledWith(
            4,
            'total_fields.limit of alias_2 has been increased from 2503 to 2506'
          );
        }
      });

      it(`should stop increasing the limit after 100 attemps`, async () => {
        const existingIndexTemplate = {
          name: 'test-template',
          index_template: {
            index_patterns: ['test*'],
            composed_of: ['test-mappings'],
            template: {
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.alerts-ilm-policy',
                  rollover_alias: `.alerts-empty-default`,
                },
                'index.mapping.total_fields.limit': 1800,
              },
              mappings: {
                dynamic: false,
              },
            },
          },
        };

        clusterClient.indices.getIndexTemplate.mockResolvedValue({
          index_templates: [existingIndexTemplate],
        });
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );

        if (useDataStream) {
          clusterClient.indices.putMapping.mockRejectedValue(
            new Error('Limit of total fields [2501] has been exceeded')
          );

          await expect(
            createConcreteWriteIndex({
              logger,
              esClient: clusterClient,
              indexPatterns: IndexPatterns,
              totalFieldsLimit: 2500,
              dataStreamAdapter,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            '"Limit of total fields [2501] has been exceeded"'
          );

          expect(logger.info).toHaveBeenCalledTimes(100);
        }
      });

      it(`should not increase the limit when the index template is not found`, async () => {
        clusterClient.indices.getIndexTemplate.mockResolvedValue({
          index_templates: [],
        });
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );

        if (useDataStream) {
          clusterClient.indices.putMapping
            .mockRejectedValueOnce(new Error('Limit of total fields [2500] has been exceeded'))
            .mockResolvedValue({ acknowledged: true });

          await expect(
            createConcreteWriteIndex({
              logger,
              esClient: clusterClient,
              indexPatterns: IndexPatterns,
              totalFieldsLimit: 2500,
              dataStreamAdapter,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            '"Limit of total fields [2500] has been exceeded"'
          );

          expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
          expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(1);
          expect(logger.info).not.toHaveBeenCalled();
        }
      });

      it(`should log an error when there is an error while increasing the fields limit`, async () => {
        const error = new Error('generic error');
        const existingIndexTemplate = {
          name: 'test-template',
          index_template: {
            index_patterns: ['test*'],
            composed_of: ['test-mappings'],
            template: {
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.alerts-ilm-policy',
                  rollover_alias: `.alerts-empty-default`,
                },
                'index.mapping.total_fields.limit': 1800,
              },
              mappings: {
                dynamic: false,
              },
            },
          },
        };

        clusterClient.indices.getIndexTemplate.mockResolvedValue({
          index_templates: [existingIndexTemplate],
        });
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );
        clusterClient.indices.putSettings.mockResolvedValueOnce({
          acknowledged: true,
        });
        clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(error);

        if (useDataStream) {
          clusterClient.indices.putMapping
            .mockRejectedValueOnce(new Error('Limit of total fields [2500] has been exceeded'))
            .mockResolvedValueOnce({ acknowledged: true });

          await expect(
            createConcreteWriteIndex({
              logger,
              esClient: clusterClient,
              indexPatterns: IndexPatterns,
              totalFieldsLimit: 2500,
              dataStreamAdapter,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Limit of total fields [2500] has been exceeded"`
          );

          expect(logger.info).not.toHaveBeenCalled();
          expect(logger.error).toHaveBeenCalledWith(
            'An error occured while increasing total_fields.limit of .alerts-test.alerts-default - generic error',
            error
          );
        } else {
          clusterClient.indices.putMapping
            .mockRejectedValueOnce(new Error('Limit of total fields [2500] has been exceeded'))
            .mockResolvedValueOnce({ acknowledged: true });

          await expect(
            createConcreteWriteIndex({
              logger,
              esClient: clusterClient,
              indexPatterns: IndexPatterns,
              totalFieldsLimit: 2500,
              dataStreamAdapter,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Limit of total fields [2500] has been exceeded"`
          );

          expect(logger.error).toHaveBeenCalledWith(
            'An error occured while increasing total_fields.limit of alias_1 - generic error',
            error
          );
        }
      });

      it(`should log and return when simulating updated mappings throws error`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        clusterClient.indices.simulateIndexTemplate.mockRejectedValueOnce(new Error('fail'));

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Ignored PUT mappings for .alerts-test.alerts-default; error generating simulated mappings: fail`
            : `Ignored PUT mappings for alias_1; error generating simulated mappings: fail`
        );

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).not.toHaveBeenCalled();
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
        }
      });

      it(`should log and return when simulating updated mappings returns null`, async () => {
        clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
        clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
        // @ts-expect-error type mismatch: mappings cannot be null
        clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
          ...SimulateTemplateResponse,
          template: { ...SimulateTemplateResponse.template, mappings: null },
        }));

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(logger.error).toHaveBeenCalledWith(
          useDataStream
            ? `Ignored PUT mappings for .alerts-test.alerts-default; simulated mappings were empty`
            : `Ignored PUT mappings for alias_1; simulated mappings were empty`
        );

        if (useDataStream) {
          expect(clusterClient.indices.createDataStream).not.toHaveBeenCalled();
        } else {
          expect(clusterClient.indices.create).toHaveBeenCalledWith({
            index: '.internal.alerts-test.alerts-default-000001',
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: true,
              },
            },
          });
        }
      });

      it(`should log an error and try to set write index when there are concrete indices but none of them are the write index`, async () => {
        if (useDataStream) return;

        clusterClient.indices.getAlias.mockImplementationOnce(async () => ({
          '.internal.alerts-test.alerts-default-0001': {
            aliases: {
              '.alerts-test.alerts-default': {
                is_write_index: false,
                is_hidden: true,
              },
              alias_2: {
                is_write_index: false,
                is_hidden: true,
              },
            },
          },
        }));
        clusterClient.indices.simulateIndexTemplate.mockImplementation(
          async () => SimulateTemplateResponse
        );

        await createConcreteWriteIndex({
          logger,
          esClient: clusterClient,
          indexPatterns: IndexPatterns,
          totalFieldsLimit: 2500,
          dataStreamAdapter,
        });

        expect(logger.debug).toHaveBeenCalledWith(
          'Indices matching pattern .internal.alerts-test.alerts-default-* exist but none are set as the write index for alias .alerts-test.alerts-default'
        );
        expect(clusterClient.indices.updateAliases).toHaveBeenCalled();
      });
    });
  }
});

describe('setConcreteWriteIndex', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it(`should call updateAliases to set the concrete write index`, async () => {
    await setConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      concreteIndices: [
        {
          index: '.internal.alerts-test.alerts-default-000003',
          alias: '.alerts-test.alerts-default',
          isWriteIndex: false,
        },
        {
          index: '.internal.alerts-test.alerts-default-000004',
          alias: '.alerts-test.alerts-default',
          isWriteIndex: false,
        },
        {
          index: '.internal.alerts-test.alerts-default-000001',
          alias: '.alerts-test.alerts-default',
          isWriteIndex: false,
        },
        {
          index: '.internal.alerts-test.alerts-default-000002',
          alias: '.alerts-test.alerts-default',
          isWriteIndex: false,
        },
      ],
    });

    expect(logger.debug).toHaveBeenCalledWith(
      'Attempting to set index: .internal.alerts-test.alerts-default-000004 as the write index for alias: .alerts-test.alerts-default.'
    );
    expect(clusterClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          remove: {
            alias: '.alerts-test.alerts-default',
            index: '.internal.alerts-test.alerts-default-000004',
          },
        },
        {
          add: {
            alias: '.alerts-test.alerts-default',
            index: '.internal.alerts-test.alerts-default-000004',
            is_write_index: true,
          },
        },
      ],
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Successfully set index: .internal.alerts-test.alerts-default-000004 as the write index for alias: .alerts-test.alerts-default.'
    );
  });

  it(`should throw an error if there is a failure setting the concrete write index`, async () => {
    const error = new Error(`fail`) as EsError;
    clusterClient.indices.updateAliases.mockRejectedValueOnce(error);

    await expect(() =>
      setConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        concreteIndices: [
          {
            index: '.internal.alerts-test.alerts-default-000001',
            alias: '.alerts-test.alerts-default',
            isWriteIndex: false,
          },
        ],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to set index: .internal.alerts-test.alerts-default-000001 as the write index for alias: .alerts-test.alerts-default."`
    );
  });
});
