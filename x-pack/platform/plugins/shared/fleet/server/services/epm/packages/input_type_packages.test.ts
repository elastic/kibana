/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

import { appContextService } from '../../app_context';
import { PackageNotFoundError } from '../../../errors';

import { dataStreamService } from '../../data_streams';

import { getInstalledPackageWithAssets, getInstallation } from './get';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';
import {
  installAssetsForInputPackagePolicy,
  removeAssetsForInputPackagePolicy,
  isInputPackageDatasetUsedByMultiplePolicies,
} from './input_type_packages';
import { cleanupAssets } from './remove';

jest.mock('../../data_streams');
jest.mock('./get');
jest.mock('./install_index_template_pipeline');
jest.mock('./es_assets_reference');
jest.mock('./remove');

const cleanupAssetsMock = cleanupAssets as jest.MockedFunction<typeof cleanupAssets>;

jest.mock('../../app_context', () => {
  const logger = { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
  const mockedSavedObjectTagging = {
    createInternalAssignmentService: jest.fn(),
    createTagClient: jest.fn(),
  };

  return {
    appContextService: {
      getLogger: jest.fn(() => {
        return logger;
      }),
      getTelemetryEventsSender: jest.fn(),
      getSavedObjects: jest.fn(() => ({
        createImporter: jest.fn(),
      })),
      getConfig: jest.fn(() => ({})),
      getSavedObjectsTagging: jest.fn(() => mockedSavedObjectTagging),
      getInternalUserSOClientForSpaceId: jest.fn(),
      getExperimentalFeatures: jest.fn(),
    },
  };
});

describe('installAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    jest.mocked(optimisticallyAddEsAssetReferences).mockReset();
    const mockedLogger = jest.mocked(appContextService.getLogger());
    mockedLogger.debug.mockClear();
    mockedLogger.error.mockClear();
    mockedLogger.warn.mockClear();
    mockedLogger.info.mockClear();
  });

  it('should do nothing for non input package', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await installAssetsForInputPackagePolicy({
      pkgInfo: {
        type: 'integration',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {} as any,
    });
    expect(jest.mocked(optimisticallyAddEsAssetReferences)).not.toBeCalled();
  });

  const TEST_PKG_INFO_INPUT = {
    type: 'input',
    name: 'test',
    version: '1.0.0',
    policy_templates: [
      {
        name: 'log',
        type: 'log',
      },
    ],
  };

  it('should throw for input package if package is not installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue(undefined);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await expect(() =>
      installAssetsForInputPackagePolicy({
        pkgInfo: TEST_PKG_INFO_INPUT as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              type: 'log',
              streams: [{ data_stream: { type: 'log' }, vars: { dataset: 'test.tata' } }],
            },
          ],
        } as any,
      })
    ).rejects.toThrowError(PackageNotFoundError);
  });

  it('should install es index patterns for input package if package is installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: TEST_PKG_INFO_INPUT,
      assetsMap: new Map(),
      paths: [],
    } as any);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: TEST_PKG_INFO_INPUT as any,

      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'log' },
                vars: { 'data_stream.dataset': { value: 'test.tata' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(jest.mocked(optimisticallyAddEsAssetReferences)).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        'test.tata': 'log-test.tata-*',
      }
    );
  });

  it('should remove time_series index mode for non-metrics data stream types', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      ...TEST_PKG_INFO_INPUT,
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'test.tata' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring time_series index mode')
    );
  });

  it('should preserve time_series index mode for metrics data stream type', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      type: 'input',
      name: 'test',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'metrics',
          type: 'metrics',
        },
      ],
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'metrics',
            type: 'metrics',
            streams: [
              {
                data_stream: { type: 'metrics' },
                vars: { 'data_stream.dataset': { value: 'test.metrics' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('Ignoring time_series index mode')
    );
  });

  it('should use data_stream_type var when provided', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      ...TEST_PKG_INFO_INPUT,
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'traces',
            type: 'traces',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: {
                  'data_stream.dataset': { value: 'test.traces' },
                  'data_stream.type': { value: 'traces' },
                },
              },
            ],
          },
        ],
      } as any,
    });

    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring time_series index mode')
    );
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('data stream type is "traces"')
    );
  });

  it('should add time_series index mode for OTel metrics data streams when not present', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithoutTimeSeries = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'metrics',
          type: 'metrics',
        },
      ],
      // No elasticsearch config with index_mode
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'otel',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithoutTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithoutTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'otelcol',
            type: 'otelcol',
            streams: [
              {
                data_stream: { type: 'metrics' },
                vars: { 'data_stream.dataset': { value: 'otel.metrics' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Adding time_series index mode for OTel package')
    );
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('data stream type is "metrics"')
    );
  });

  it('should preserve existing time_series index mode for OTel metrics data streams', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'metrics',
          type: 'metrics',
        },
      ],
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'otel',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'otelcol',
            type: 'otelcol',
            streams: [
              {
                data_stream: { type: 'metrics' },
                vars: { 'data_stream.dataset': { value: 'otel.metrics' } },
              },
            ],
          },
        ],
      } as any,
    });

    // Should not log about ignoring or adding time_series
    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('Ignoring time_series index mode')
    );
    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('Adding time_series index mode')
    );
  });

  it('should not add time_series index mode for non-OTel metrics data streams without it', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithoutTimeSeries = {
      type: 'input',
      name: 'test',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'metrics',
          type: 'metrics',
        },
      ],
      // No elasticsearch config with index_mode
    };

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithoutTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: pkgInfoWithoutTimeSeries as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'metrics' },
                vars: { 'data_stream.dataset': { value: 'test.metrics' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(mockedLogger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('Adding time_series index mode')
    );
  });
});

describe('removeAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    jest.mocked(cleanupAssetsMock).mockReset();
  });

  it('should do nothing for non input package', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'integration',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should do nothing for input packages with status !== than installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'not_installed',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should clean up assets for input packages with status = installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    const installation = {
      name: 'logs',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [
        {
          id: 'logs@custom',
          type: 'component_template',
        },
        {
          id: 'udp@custom',
          type: 'component_template',
        },
        {
          id: 'logs-udp.test',
          type: 'index_template',
        },
        {
          id: 'logs-udp.test@package',
          type: 'component_template',
        },
      ],
      es_index_patterns: {
        generic: 'logs-udp.generic-*',
        test: 'logs-udp.test-*',
      },
    } as any;
    jest.mocked(getInstallation).mockResolvedValue(installation);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).toBeCalledWith(
      'test',
      {
        es_index_patterns: { test: 'logs-udp.test-*' },
        installed_es: [
          { id: 'logs-udp.test', type: 'index_template' },
          { id: 'logs-udp.test@package', type: 'component_template' },
        ],
        installed_kibana: [],
        name: 'logs',
        package_assets: [],
        version: '1.0.0',
      },
      installation,
      expect.anything(),
      expect.anything()
    );
  });

  it('should clean up assets matching exactly the datasetName', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    const installation = {
      name: 'logs',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [
        {
          id: 'logs-udp.test',
          type: 'index_template',
        },
        {
          id: 'logs-udp.test@package',
          type: 'component_template',
        },
        {
          id: 'logs-udp.test1',
          type: 'index_template',
        },
        {
          id: 'logs-udp.test1@package',
          type: 'component_template',
        },
      ],
    } as any;
    jest.mocked(getInstallation).mockResolvedValue(installation);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).toBeCalledWith(
      'test',
      {
        installed_es: [
          { id: 'logs-udp.test', type: 'index_template' },
          { id: 'logs-udp.test@package', type: 'component_template' },
        ],
        installed_kibana: [],
        es_index_patterns: {},
        name: 'logs',
        package_assets: [],
        version: '1.0.0',
      },
      installation,
      expect.anything(),
      expect.anything()
    );
  });

  it('should not clean up assets for input packages with status not installed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    jest.mocked(getInstallation).mockResolvedValue(undefined);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).not.toBeCalled();
  });

  it('should log error if cleanupAssets failed', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    jest.mocked(getInstallation).mockResolvedValue({
      name: 'logs',
      version: '1.0.0',
    } as any);

    cleanupAssetsMock.mockRejectedValueOnce('error');

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'input',
        status: 'installed',
        name: 'logs',
        version: '1.0.0',
      } as any,
      datasetName: 'test',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(mockedLogger.error).toBeCalled();
  });

  describe('isInputPackageDatasetUsedByMultiplePolicies', () => {
    const policy1 = {
      id: 'policy1',
      name: 'Policy',
      policy_ids: ['agent-policy'],
      description: 'Policy description',
      namespace: 'default',
      inputs: [],
      package: {
        name: 'logs',
        title: 'Test',
        version: '1.0.0',
        type: 'input',
      },
    };
    const policy2 = {
      id: 'test-package-policy',
      name: 'Test policy',
      policy_ids: ['agent-policy'],
      description: 'Test policy description',
      namespace: 'default',
      inputs: [],
      package: {
        name: 'logs',
        title: 'Test',
        version: '1.0.0',
        type: 'input',
      },
    };

    it('should return false if there are no other policies using the dataset', async () => {
      const res = await isInputPackageDatasetUsedByMultiplePolicies(
        [policy1, policy2] as any,
        'generic',
        'logs'
      );
      expect(res).toEqual(false);
    });

    it('should return true if there other policies using the same dataset ', async () => {
      const res = await isInputPackageDatasetUsedByMultiplePolicies(
        [
          {
            ...policy1,
            inputs: [
              {
                streams: [
                  { vars: { 'data_stream.dataset': { value: 'udp.generic', type: 'text' } } },
                ],
              },
            ],
            namespace: 'another',
          },
          {
            ...policy2,
            inputs: [
              {
                streams: [
                  { vars: { 'data_stream.dataset': { value: 'udp.generic', type: 'text' } } },
                ],
              },
            ],
          },
        ] as any,
        'udp.generic',
        'logs'
      );
      expect(res).toEqual(true);
    });
  });
});
