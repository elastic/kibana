/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { ExperimentalDataStreamFeature } from '../../../common/types';
import type { NewPackagePolicy, PackagePolicy } from '../../types';
import { appContextService } from '../app_context';
import { prepareDataStreamTemplates } from '../epm/elasticsearch/template/install';
import { updateCurrentWriteIndices } from '../epm/elasticsearch/template/template';
import { getInstalledPackageWithAssets } from '../epm/packages/get';

import { handleExperimentalDatastreamFeatureOptIn } from './experimental_datastream_features';

const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;

jest.mock('../epm/packages', () => {
  return {
    getInstallation: jest.fn(),
    getPackageInfo: jest.fn().mockResolvedValue({
      data_streams: [
        {
          dataset: 'test',
          type: 'metrics',
        },
      ],
    }),
  };
});

// Data streams the package declares as columnar-ready. The columnar opt-in is rejected for any
// data stream missing `elasticsearch.columnar.supported` (or a columnar index_mode), so the
// default fixture declares support for the data streams the tests below opt in on.
const COLUMNAR_READY_DATA_STREAMS = [
  { dataset: 'test.test', type: 'metrics', elasticsearch: { columnar: { supported: true } } },
  { dataset: 'test.test', type: 'logs', elasticsearch: { columnar: { supported: true } } },
  {
    dataset: 'test.test',
    type: 'logs',
    hidden: true,
    elasticsearch: { columnar: { supported: true } },
  },
];

function mockGetInstalledPackageWithAssets(installation: any, dataStreams: any[] = []) {
  jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
    packageInfo: {
      name: 'test',
      data_streams: dataStreams.length ? dataStreams : COLUMNAR_READY_DATA_STREAMS,
    },
    installation,
  } as any);
}

jest.mock('../epm/packages/get', () => ({
  getInstalledPackageWithAssets: jest.fn().mockResolvedValue({
    packageInfo: {
      name: 'test',
      data_streams: [
        {
          dataset: 'test',
          type: 'metrics',
        },
      ],
    },
  }),
}));

jest.mock('../app_context');
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

jest.mock('../epm/elasticsearch/template/template', () => ({
  updateCurrentWriteIndices: jest.fn(),
  isTotalFieldsLimitError: (err: any): boolean => {
    const reason: string = err?.body?.error?.reason ?? '';
    return reason.includes('Limit of total fields') && reason.includes('has been exceeded');
  },
}));
jest.mock('../epm/elasticsearch/template/install', () => {
  return {
    prepareDataStreamTemplates: jest.fn().mockResolvedValue([
      {
        componentTemplates: {
          'metrics-test.test@package': {
            template: {
              mappings: {
                properties: {
                  sequence: {
                    type: 'long',
                  },
                  name: {
                    type: 'keyword',
                    index: false,
                  },
                },
              },
            },
          },
        },
        indexTemplate: {},
      },
    ]),
  };
});

function getNewTestPackagePolicy({
  isSyntheticSourceEnabled,
  isTSDBEnabled,
  isDocValueOnlyNumeric,
  isDocValueOnlyOther,
}: {
  isSyntheticSourceEnabled: boolean;
  isTSDBEnabled: boolean;
  isDocValueOnlyNumeric: boolean;
  isDocValueOnlyOther: boolean;
}): NewPackagePolicy {
  const packagePolicy: NewPackagePolicy = {
    name: 'Test policy',
    policy_id: 'agent-policy',
    policy_ids: ['agent-policy'],
    description: 'Test policy description',
    namespace: 'default',
    enabled: true,
    inputs: [],
    package: {
      name: 'test',
      title: 'Test',
      version: '0.0.1',
      experimental_data_stream_features: [
        {
          data_stream: 'metrics-test.test',
          features: {
            synthetic_source: isSyntheticSourceEnabled,
            tsdb: isTSDBEnabled,
            doc_value_only_numeric: isDocValueOnlyNumeric,
            doc_value_only_other: isDocValueOnlyOther,
          },
        },
      ],
    },
  };

  return packagePolicy;
}

function getExistingTestPackagePolicy({
  isSyntheticSourceEnabled,
  isTSDBEnabled,
  isDocValueOnlyNumeric,
  isDocValueOnlyOther,
}: {
  isSyntheticSourceEnabled: boolean;
  isTSDBEnabled: boolean;
  isDocValueOnlyNumeric: boolean;
  isDocValueOnlyOther: boolean;
}): PackagePolicy {
  const packagePolicy: PackagePolicy = {
    id: 'test-policy',
    name: 'Test policy',
    policy_id: 'agent-policy',
    policy_ids: ['agent-policy'],
    description: 'Test policy description',
    namespace: 'default',
    enabled: true,
    inputs: [],
    package: {
      name: 'test',
      title: 'Test',
      version: '0.0.1',
      experimental_data_stream_features: [
        {
          data_stream: 'metrics-test.test',
          features: {
            synthetic_source: isSyntheticSourceEnabled,
            tsdb: isTSDBEnabled,
            doc_value_only_numeric: isDocValueOnlyNumeric,
            doc_value_only_other: isDocValueOnlyOther,
          },
        },
      ],
    },
    revision: 1,
    created_by: 'system',
    created_at: '2022-01-01T00:00:00.000Z',
    updated_by: 'system',
    updated_at: '2022-01-01T00:00:00.000Z',
  };

  return packagePolicy;
}

describe('experimental_datastream_features', () => {
  beforeEach(() => {
    soClient.get.mockClear();
    mockedUpdateCurrentWriteIndices.mockReset();
    esClient.cluster.getComponentTemplate.mockClear();
    esClient.cluster.putComponentTemplate.mockClear();
    mockedAppContextService.getLogger.mockReturnValue({
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as any);

    esClient.cluster.getComponentTemplate.mockResolvedValueOnce({
      component_templates: [
        {
          name: 'metrics-test.test@package',
          component_template: {
            template: {
              settings: {},
              mappings: {
                _source: {},
                properties: {
                  test_dimension: {
                    type: 'keyword',
                    time_series_dimension: true,
                  },
                  sequence: {
                    type: 'long',
                  },
                  name: {
                    type: 'keyword',
                  },
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
            },
          },
        },
      ],
    });

    esClient.indices.getIndexTemplate.mockResolvedValueOnce({
      index_templates: [
        {
          name: 'metrics-test.test',
          index_template: {
            template: {
              settings: {},
              mappings: {},
            },
            composed_of: [],
            index_patterns: '',
          },
        },
      ],
    });

    esClient.indices.getIndexTemplate.mockClear();
  });

  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  describe('when package policy does not exist (create)', () => {
    beforeEach(() => {
      mockGetInstalledPackageWithAssets({
        experimental_data_stream_features: [
          {
            data_stream: 'metrics-test.test',
            features: {
              synthetic_source: false,
              tsdb: false,
              doc_value_only_numeric: false,
              doc_value_only_other: false,
            },
          },
        ],
      });
    });
    it('updates component template', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: true,
        isTSDBEnabled: false,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: false,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            settings: expect.objectContaining({
              index: expect.objectContaining({
                mapping: expect.objectContaining({ source: { mode: 'synthetic' } }),
              }),
            }),
          }),
          _meta: { has_experimental_data_stream_indexing_features: true },
        })
      );
    });

    it('updates component template number fields', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: false,
        isTSDBEnabled: false,
        isDocValueOnlyNumeric: true,
        isDocValueOnlyOther: false,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                sequence: {
                  type: 'long',
                  index: false,
                },
              }),
            }),
          }),
          _meta: { has_experimental_data_stream_indexing_features: true },
        })
      );
    });

    it('updates component template other fields', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: false,
        isTSDBEnabled: false,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: true,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                name: {
                  type: 'keyword',
                  index: false,
                },
              }),
            }),
          }),
          _meta: { has_experimental_data_stream_indexing_features: true },
        })
      );
    });

    it('should not set index:false on @timestamp field', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: false,
        isTSDBEnabled: false,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: true,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                '@timestamp': {
                  type: 'date',
                },
              }),
            }),
          }),
          _meta: { has_experimental_data_stream_indexing_features: true },
        })
      );
    });

    it('should update index template', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: false,
        isTSDBEnabled: true,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: false,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.indices.getIndexTemplate).toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            settings: expect.objectContaining({
              index: { mode: 'time_series' },
            }),
          }),
          _meta: { has_experimental_data_stream_indexing_features: true },
        })
      );
    });
  });

  describe('when package policy exists (update)', () => {
    describe('when opt in status in unchanged', () => {
      it('does not update component template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        mockGetInstalledPackageWithAssets({
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.test',
              features: {
                synthetic_source: true,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).not.toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      });

      it('does not update write indices', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        mockGetInstalledPackageWithAssets({
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.test',
              features: {
                synthetic_source: true,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(mockedUpdateCurrentWriteIndices).not.toHaveBeenCalled();
      });
    });

    describe('when opt in status is changed', () => {
      beforeEach(() => {
        mockGetInstalledPackageWithAssets({
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.test',
              features: {
                synthetic_source: false,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: true,
              },
            },
          ],
        });
      });
      it('updates component template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: true,
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            template: expect.objectContaining({
              settings: expect.objectContaining({
                index: expect.objectContaining({
                  mapping: expect.objectContaining({ source: { mode: 'synthetic' } }),
                }),
              }),
            }),
            _meta: { has_experimental_data_stream_indexing_features: true },
          })
        );
      });

      it('updates component template number fields', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: true,
          isDocValueOnlyOther: true,
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            template: expect.objectContaining({
              mappings: expect.objectContaining({
                properties: expect.objectContaining({
                  sequence: {
                    type: 'long',
                    index: false,
                  },
                }),
              }),
            }),
            _meta: { has_experimental_data_stream_indexing_features: true },
          })
        );
      });

      it('should not remove index:false from a field that has it in package spec', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            template: expect.objectContaining({
              mappings: expect.objectContaining({
                properties: expect.objectContaining({
                  name: {
                    type: 'keyword',
                    index: false,
                  },
                }),
              }),
            }),
            _meta: { has_experimental_data_stream_indexing_features: false },
          })
        );
      });

      it('should update index template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: {
                  settings: {},
                  mappings: {},
                },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.indices.getIndexTemplate).toHaveBeenCalled();
        expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            template: expect.objectContaining({
              settings: expect.objectContaining({
                index: { mode: 'time_series' },
              }),
            }),
            _meta: { has_experimental_data_stream_indexing_features: true },
          })
        );
      });

      it('should not throw when updateCurrentWriteIndices rejects with a total_fields limit error', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: { settings: {}, mappings: {} },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        const totalFieldsError = Object.assign(new Error('ResponseError'), {
          statusCode: 400,
          body: {
            error: {
              type: 'illegal_argument_exception',
              reason: 'Limit of total fields [2500] has been exceeded',
            },
          },
        });
        mockedUpdateCurrentWriteIndices.mockRejectedValueOnce(totalFieldsError);

        // total_fields errors are non-fatal — the rollover wouldn't have helped anyway
        await expect(
          handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy })
        ).resolves.not.toThrow();
      });

      it('should throw when updateCurrentWriteIndices rejects with an unexpected error', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: { settings: {}, mappings: {} },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        const unexpectedError = new Error('unexpected mapping error');
        mockedUpdateCurrentWriteIndices.mockRejectedValueOnce(unexpectedError);

        await expect(
          handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy })
        ).rejects.toThrow(unexpectedError);
      });

      it('should update existing write indices', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: {
                  settings: {},
                  mappings: {},
                },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledTimes(1);
        expect(
          mockedUpdateCurrentWriteIndices.mock.calls[0][2].map(({ templateName }) => templateName)
        ).toEqual(['metrics-test.test']);
      });

      it('should ask updateCurrentWriteIndices to rollover when the index mode is reset', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: {
                  settings: {},
                  mappings: {},
                },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledTimes(1);
        expect(mockedUpdateCurrentWriteIndices.mock.calls[0][3]).toEqual({
          rolloverOnIndexModeReset: true,
        });
      });
    });
  });

  describe('index mode (tsdb / columnar)', () => {
    type Features = ExperimentalDataStreamFeature['features'];

    const noFeatures: Features = {
      synthetic_source: false,
      tsdb: false,
      doc_value_only_numeric: false,
      doc_value_only_other: false,
      columnar: false,
    };

    function getPolicy(dataStream: string, features: Partial<Features>): NewPackagePolicy {
      return {
        name: 'Test policy',
        policy_id: 'agent-policy',
        policy_ids: ['agent-policy'],
        description: 'Test policy description',
        namespace: 'default',
        enabled: true,
        inputs: [],
        package: {
          name: 'test',
          title: 'Test',
          version: '0.0.1',
          experimental_data_stream_features: [
            { data_stream: dataStream, features: { ...noFeatures, ...features } },
          ],
        },
      };
    }

    function mockInstalledFeatures(
      dataStream: string,
      features: Partial<Features>,
      dataStreams?: any[]
    ) {
      mockGetInstalledPackageWithAssets(
        {
          experimental_data_stream_features: [
            { data_stream: dataStream, features: { ...noFeatures, ...features } },
          ],
        },
        dataStreams
      );
    }

    function mockIndexTemplate(dataStream: string, index: Record<string, unknown> = {}) {
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: dataStream,
            index_template: {
              template: { settings: { index }, mappings: {} },
              composed_of: [],
              index_patterns: '',
            },
          },
        ],
      });
    }

    function putIndexSettings() {
      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      return (esClient.indices.putIndexTemplate.mock.calls[0][0] as any).template.settings.index;
    }

    beforeEach(() => {
      // The outer beforeEach queues an index template for metrics-test.test; each test here
      // provides its own so the data stream name and existing mode are under control.
      esClient.indices.getIndexTemplate.mockReset();
      esClient.indices.putIndexTemplate.mockClear();
    });

    it('uses logsdb_columnar when enabling columnar on a logs data stream', async () => {
      mockInstalledFeatures('logs-test.test', {});
      mockIndexTemplate('logs-test.test');

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('logs-test.test', { columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'logsdb_columnar' });
    });

    it('uses logsdb_columnar when enabling columnar on a hidden logs data stream', async () => {
      mockInstalledFeatures('.logs-test.test', {});
      mockIndexTemplate('.logs-test.test');

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('.logs-test.test', { columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'logsdb_columnar' });
    });

    it('uses the base columnar mode when enabling columnar on a non-logs data stream', async () => {
      mockInstalledFeatures('metrics-test.test', {});
      mockIndexTemplate('metrics-test.test');

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'columnar' });
    });

    it('writes time_series in a single PUT when switching from columnar to tsdb', async () => {
      mockInstalledFeatures('metrics-test.test', { columnar: true });
      mockIndexTemplate('metrics-test.test', { mode: 'columnar', codec: 'best_compression' });

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { tsdb: true, columnar: false }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'time_series', codec: 'best_compression' });
    });

    it('writes columnar in a single PUT when switching from tsdb to columnar', async () => {
      mockInstalledFeatures('metrics-test.test', { tsdb: true });
      mockIndexTemplate('metrics-test.test', { mode: 'time_series' });

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { tsdb: false, columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'columnar' });
    });

    it('throws before writing any template when tsdb and columnar are both enabled', async () => {
      mockInstalledFeatures('metrics-test.test', {});
      mockIndexTemplate('metrics-test.test');

      await expect(
        handleExperimentalDatastreamFeatureOptIn({
          soClient,
          esClient,
          packagePolicy: getPolicy('metrics-test.test', {
            tsdb: true,
            columnar: true,
            synthetic_source: true,
          }),
        })
      ).rejects.toThrow(/cannot have both tsdb and columnar enabled/);

      expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('enables columnar when the package declares elasticsearch.columnar.supported', async () => {
      mockInstalledFeatures('metrics-test.test', {}, [
        { dataset: 'test.test', type: 'metrics', elasticsearch: { columnar: { supported: true } } },
      ]);
      mockIndexTemplate('metrics-test.test');

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'columnar' });
    });

    it('enables columnar when the package already declares a columnar index_mode', async () => {
      mockInstalledFeatures('logs-test.test', {}, [
        { dataset: 'test.test', type: 'logs', elasticsearch: { index_mode: 'logsdb_columnar' } },
      ]);
      mockIndexTemplate('logs-test.test');

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('logs-test.test', { columnar: true }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'logsdb_columnar' });
    });

    it('rejects enabling columnar on a data stream the package has not declared ready', async () => {
      mockInstalledFeatures('metrics-test.test', {}, [{ dataset: 'test.test', type: 'metrics' }]);
      mockIndexTemplate('metrics-test.test');

      await expect(
        handleExperimentalDatastreamFeatureOptIn({
          soClient,
          esClient,
          packagePolicy: getPolicy('metrics-test.test', { columnar: true }),
        })
      ).rejects.toThrow(
        'data stream metrics-test.test is not columnar-ready: the package does not declare elasticsearch.columnar.supported'
      );

      expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('rejects enabling columnar when the package declares supported: false', async () => {
      mockInstalledFeatures('metrics-test.test', {}, [
        {
          dataset: 'test.test',
          type: 'metrics',
          elasticsearch: { columnar: { supported: false } },
        },
      ]);
      mockIndexTemplate('metrics-test.test');

      await expect(
        handleExperimentalDatastreamFeatureOptIn({
          soClient,
          esClient,
          packagePolicy: getPolicy('metrics-test.test', { columnar: true }),
        })
      ).rejects.toThrow(/is not columnar-ready/);
    });

    it('allows opting out of columnar on a data stream that is no longer declared ready', async () => {
      mockInstalledFeatures('metrics-test.test', { columnar: true }, [
        { dataset: 'test.test', type: 'metrics' },
      ]);
      mockIndexTemplate('metrics-test.test', { mode: 'columnar' });

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { columnar: false }),
      });

      expect(putIndexSettings()).toEqual({});
    });

    it('does not throw when a stale columnar opt-in is re-submitted unchanged', async () => {
      // The stored feature map is re-attached to the package policy on every save, so a
      // package that drops its readiness declaration must not make every later edit fail.
      mockInstalledFeatures('metrics-test.test', { columnar: true }, [
        { dataset: 'test.test', type: 'metrics' },
      ]);
      mockIndexTemplate('metrics-test.test', { mode: 'columnar' });

      await expect(
        handleExperimentalDatastreamFeatureOptIn({
          soClient,
          esClient,
          packagePolicy: getPolicy('metrics-test.test', { columnar: true }),
        })
      ).resolves.not.toThrow();

      // Nothing changed, so nothing is written.
      expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('does not throw when another feature changes while a stale columnar opt-in is kept', async () => {
      mockInstalledFeatures('metrics-test.test', { columnar: true }, [
        { dataset: 'test.test', type: 'metrics' },
      ]);
      mockIndexTemplate('metrics-test.test', { mode: 'columnar' });

      await expect(
        handleExperimentalDatastreamFeatureOptIn({
          soClient,
          esClient,
          packagePolicy: getPolicy('metrics-test.test', {
            columnar: true,
            synthetic_source: true,
          }),
        })
      ).resolves.not.toThrow();

      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
      // columnar itself did not change, so the index mode is left alone.
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('removes the index mode when opting out of columnar on a package without a declared mode', async () => {
      mockInstalledFeatures('metrics-test.test', { columnar: true });
      mockIndexTemplate('metrics-test.test', { mode: 'columnar', codec: 'best_compression' });

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('metrics-test.test', { columnar: false }),
      });

      expect(putIndexSettings()).toEqual({ codec: 'best_compression' });
      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          _meta: { has_experimental_data_stream_indexing_features: false },
        })
      );
    });

    it('preserves the package-declared index mode when opting out of columnar', async () => {
      jest.mocked(prepareDataStreamTemplates).mockResolvedValueOnce([
        {
          componentTemplates: {},
          indexTemplate: {
            templateName: 'logs-test.test',
            indexTemplate: {
              template: { settings: { index: { mode: 'logsdb_columnar' } } },
            },
          },
        },
      ] as any);
      mockInstalledFeatures('logs-test.test', { columnar: true });
      mockIndexTemplate('logs-test.test', { mode: 'logsdb_columnar' });

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy('logs-test.test', { columnar: false }),
      });

      expect(putIndexSettings()).toEqual({ mode: 'logsdb_columnar' });
    });
  });

  describe('_meta preservation on Fleet managed templates', () => {
    // Fleet stamps its own `_meta` on the templates it installs; the opt-in PUTs must not drop it.
    const EXISTING_META = {
      package: { name: 'test' },
      managed_by: 'fleet',
      managed: true,
    };

    beforeEach(() => {
      // The outer beforeEach queues templates without `_meta`, these tests supply their own.
      esClient.cluster.getComponentTemplate.mockReset();
      esClient.cluster.putComponentTemplate.mockClear();
      esClient.indices.getIndexTemplate.mockReset();
      esClient.indices.putIndexTemplate.mockClear();
    });

    function mockComponentTemplate(_meta?: Record<string, unknown>) {
      esClient.cluster.getComponentTemplate.mockResolvedValueOnce({
        component_templates: [
          {
            name: 'metrics-test.test@package',
            component_template: {
              template: {
                settings: {},
                mappings: {
                  properties: {
                    sequence: { type: 'long' },
                    name: { type: 'keyword' },
                  },
                },
              },
              ...(_meta ? { _meta } : {}),
            },
          },
        ],
      } as any);
    }

    function mockIndexTemplate(_meta?: Record<string, unknown>) {
      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: 'metrics-test.test',
            index_template: {
              template: { settings: { index: {} }, mappings: {} },
              composed_of: [],
              index_patterns: '',
              ...(_meta ? { _meta } : {}),
            },
          },
        ],
      } as any);
    }

    function getColumnarPolicy(columnar: boolean): NewPackagePolicy {
      return {
        name: 'Test policy',
        policy_id: 'agent-policy',
        policy_ids: ['agent-policy'],
        description: 'Test policy description',
        namespace: 'default',
        enabled: true,
        inputs: [],
        package: {
          name: 'test',
          title: 'Test',
          version: '0.0.1',
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.test',
              features: {
                synthetic_source: false,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
                columnar,
              },
            },
          ],
        },
      };
    }

    it('preserves the existing component template _meta when updating it', async () => {
      mockGetInstalledPackageWithAssets({
        experimental_data_stream_features: [
          {
            data_stream: 'metrics-test.test',
            features: {
              synthetic_source: false,
              tsdb: false,
              doc_value_only_numeric: false,
              doc_value_only_other: false,
            },
          },
        ],
      });
      mockComponentTemplate(EXISTING_META);
      mockIndexTemplate();

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getNewTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        }),
      });

      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
      expect((esClient.cluster.putComponentTemplate.mock.calls[0][0] as any)._meta).toEqual({
        ...EXISTING_META,
        has_experimental_data_stream_indexing_features: true,
      });
    });

    it('preserves the existing index template _meta when opting in to columnar', async () => {
      mockGetInstalledPackageWithAssets({
        experimental_data_stream_features: [
          {
            data_stream: 'metrics-test.test',
            features: {
              synthetic_source: false,
              tsdb: false,
              doc_value_only_numeric: false,
              doc_value_only_other: false,
              columnar: false,
            },
          },
        ],
      });
      mockComponentTemplate(EXISTING_META);
      mockIndexTemplate(EXISTING_META);

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getColumnarPolicy(true),
      });

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      const putCall = esClient.indices.putIndexTemplate.mock.calls[0][0] as any;
      expect(putCall.template.settings.index).toEqual({ mode: 'columnar' });
      expect(putCall._meta).toEqual({
        ...EXISTING_META,
        has_experimental_data_stream_indexing_features: true,
      });
    });

    it('preserves the existing index template _meta when opting out of columnar', async () => {
      mockGetInstalledPackageWithAssets({
        experimental_data_stream_features: [
          {
            data_stream: 'metrics-test.test',
            features: {
              synthetic_source: false,
              tsdb: false,
              doc_value_only_numeric: false,
              doc_value_only_other: false,
              columnar: true,
            },
          },
        ],
      });
      mockComponentTemplate(EXISTING_META);
      mockIndexTemplate(EXISTING_META);

      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getColumnarPolicy(false),
      });

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      expect((esClient.indices.putIndexTemplate.mock.calls[0][0] as any)._meta).toEqual({
        ...EXISTING_META,
        has_experimental_data_stream_indexing_features: false,
      });
    });
  });
});
