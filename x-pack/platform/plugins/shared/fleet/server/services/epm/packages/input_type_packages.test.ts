/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

import { appContextService } from '../../app_context';
import { PackageNotFoundError, PackagePolicyValidationError } from '../../../errors';

import { dataStreamService } from '../../data_streams';

import { getInstalledPackageWithAssets, getInstallation } from './get';
import { installIndexTemplatesAndPipelines } from './install_index_template_pipeline';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';
import {
  installAssetsForInputPackagePolicy,
  installAssetsForCustomDatasetPolicy,
  getCustomDatasetStreams,
  removeAssetsForInputPackagePolicy,
  isInputPackageDatasetUsedByMultiplePolicies,
} from './input_type_packages';
import { cleanupAssets } from './remove';

vi.mock('../../data_streams');
vi.mock('./get');
vi.mock('./install_index_template_pipeline');
vi.mock('./es_assets_reference');
vi.mock('./remove');

const cleanupAssetsMock = cleanupAssets as MockedFunction<typeof cleanupAssets>;

vi.mock('../../app_context', () => {
  const logger = { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const mockedSavedObjectTagging = {
    createInternalAssignmentService: vi.fn(),
    createTagClient: vi.fn(),
  };

  return {
    appContextService: {
      getLogger: vi.fn(() => {
        return logger;
      }),
      getTelemetryEventsSender: vi.fn(),
      getSavedObjects: vi.fn(() => ({
        createImporter: vi.fn(),
      })),
      getConfig: vi.fn(() => ({})),
      getSavedObjectsTagging: vi.fn(() => mockedSavedObjectTagging),
      getInternalUserSOClientForSpaceId: vi.fn(),
      getExperimentalFeatures: vi.fn(),
    },
  };
});

describe('installAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    vi.mocked(optimisticallyAddEsAssetReferences).mockReset();
    vi.mocked(installIndexTemplatesAndPipelines).mockClear();
    vi.mocked(appContextService.getConfig).mockReturnValue({} as any);
    const mockedLogger = vi.mocked(appContextService.getLogger());
    mockedLogger.debug.mockClear();
    mockedLogger.error.mockClear();
    mockedLogger.warn.mockClear();
    mockedLogger.info.mockClear();
  });

  it('should do nothing for non input package', async () => {
    const mockedLogger = vi.mocked(appContextService.getLogger());
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
    expect(vi.mocked(optimisticallyAddEsAssetReferences)).not.toHaveBeenCalled();
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
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue(undefined);
    const mockedLogger = vi.mocked(appContextService.getLogger());

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
              streams: [
                {
                  data_stream: { type: 'log' },
                  vars: { 'data_stream.dataset': { value: 'test.tata' } },
                },
              ],
            },
          ],
        } as any,
      })
    ).rejects.toThrow(PackageNotFoundError);
  });

  it('should skip index template creation when existing data stream is owned by different package with force true', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: { name: 'filestream', version: '2.0.0' },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
        _meta: { package: { name: 'other_package' } },
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
  });

  it('should skip index template creation when existing index template is owned by different package with force true', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: { name: 'filestream', version: '2.0.0' },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue({
      name: 'logs-my_dataset',
      _meta: { package: { name: 'other_package' } },
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
  });

  it('should install templates when existing data stream has no _meta field', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: { name: 'filestream', version: '2.0.0' },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalled();
  });

  it('should throw for an uploaded package when the existing data stream has no _meta field', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: { name: 'uploaded_probe', version: '1.0.0', install_source: 'upload' },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await expect(
      installAssetsForInputPackagePolicy({
        pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: true,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'log',
              type: 'log',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_dataset' } },
                },
              ],
            },
          ],
        } as any,
      })
    ).rejects.toThrowError(PackagePolicyValidationError);

    expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
  });

  it('should throw for an uploaded package when a same-name stream is not corroborated by installed assets', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'uploaded_probe',
        version: '1.0.0',
        install_source: 'upload',
        installed_es: [],
      },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
        _meta: { package: { name: 'uploaded_probe' } },
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await expect(
      installAssetsForInputPackagePolicy({
        pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: true,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'log',
              type: 'log',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_dataset' } },
                },
              ],
            },
          ],
        } as any,
      })
    ).rejects.toThrowError(PackagePolicyValidationError);

    expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
  });

  it('should install templates for an uploaded package when the live stream is corroborated by installed assets', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'uploaded_probe',
        version: '1.0.0',
        install_source: 'upload',
        installed_es: [{ id: 'logs-my_dataset', type: 'index_template' }],
      },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
        _meta: { package: { name: 'uploaded_probe' } },
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalled();
  });

  it('should throw for an uploaded package when a same-name index template is not corroborated by installed assets', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'uploaded_probe',
        version: '1.0.0',
        install_source: 'upload',
        installed_es: [],
      },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue({
      name: 'logs-my_dataset',
      _meta: { package: { name: 'uploaded_probe' } },
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await expect(
      installAssetsForInputPackagePolicy({
        pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: true,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'log',
              type: 'log',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_dataset' } },
                },
              ],
            },
          ],
        } as any,
      })
    ).rejects.toThrowError(PackagePolicyValidationError);

    expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
  });

  it('should install templates for an uploaded package when the existing index template is corroborated by installed assets', async () => {
    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'uploaded_probe',
        version: '1.0.0',
        install_source: 'upload',
        installed_es: [{ id: 'logs-my_dataset', type: 'index_template' }],
      },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue({
      name: 'logs-my_dataset',
      _meta: { package: { name: 'uploaded_probe' } },
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalled();
  });

  it('should skip the corroboration guard when skipUploadPackageValidation is set', async () => {
    vi
      .mocked(appContextService.getConfig)
      .mockReturnValue({ internal: { skipUploadPackageValidation: true } } as any);

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'uploaded_probe',
        version: '1.0.0',
        install_source: 'upload',
        installed_es: [],
      },
      packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' },
      assetsMap: new Map(),
      paths: [],
    } as any);

    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-my_dataset-default',
        _meta: { package: { name: 'uploaded_probe' } },
      },
    ] as any);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    const mockedLogger = vi.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'uploaded_probe', version: '1.0.0' } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: true,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'logs' },
                vars: { 'data_stream.dataset': { value: 'my_dataset' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalled();
  });

  it('should install es index patterns for input package if package is installed', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: TEST_PKG_INFO_INPUT,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    expect(vi.mocked(optimisticallyAddEsAssetReferences)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        'test.tata': 'log-test.tata-*',
      }
    );
  });

  describe('OTel es_index_patterns', () => {
    afterEach(() => {
      vi.mocked(appContextService.getExperimentalFeatures).mockReset();
    });

    it('stores an .otel-suffixed es index pattern for an otelcol input package', async () => {
      vi
        .mocked(appContextService.getExperimentalFeatures)
        .mockReturnValue({ enableOtelIntegrations: true } as any);
      const OTEL_PKG_INFO = {
        type: 'input',
        name: 'verifier_otel',
        version: '0.1.1',
        policy_templates: [
          {
            name: 'verifierreceiver',
            title: 'Permission Verifier',
            type: 'logs',
            input: 'otelcol',
            template_path: 'input.yml.hbs',
          },
        ],
      };
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null as any);
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: { name: 'verifier_otel', version: '0.1.1', installed_es: [] },
        packageInfo: OTEL_PKG_INFO,
        assetsMap: new Map(),
        paths: [],
      } as any);

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: vi.mocked(appContextService.getLogger()),
        packagePolicy: {
          inputs: [
            {
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'verifier.status' } },
                },
              ],
            },
          ],
        } as any,
      });

      expect(vi.mocked(optimisticallyAddEsAssetReferences)).toHaveBeenCalledWith(
        expect.anything(),
        'verifier_otel',
        [],
        { 'verifier.status': 'logs-verifier.status.otel-*' }
      );
    });
  });

  it('should remove time_series index mode for non-metrics data stream types', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      ...TEST_PKG_INFO_INPUT,
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was actually removed
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBeUndefined();
  });

  it('should preserve time_series index mode for metrics data stream type', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

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

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was preserved
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBe('time_series');
  });

  it('should use data_stream_type var when provided', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    const pkgInfoWithTimeSeries = {
      ...TEST_PKG_INFO_INPUT,
      elasticsearch: {
        index_mode: 'time_series',
        'index_template.mappings': {},
      },
    };

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was removed
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBeUndefined();
  });

  it('should add time_series index mode for OTel metrics data streams when not present', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

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

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'otel',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithoutTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was added
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBe('time_series');
  });

  it('should preserve existing time_series index mode for OTel metrics data streams', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);

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

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'otel',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was preserved
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBe('time_series');
  });

  it('should not add time_series index mode for non-OTel metrics data streams without it', async () => {
    vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

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

    vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: pkgInfoWithoutTimeSeries,
      assetsMap: new Map(),
      paths: [],
    } as any);

    const mockedLogger = vi.mocked(appContextService.getLogger());

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

    // Verify index_mode was not added
    const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
    const dataStreams = installCall?.[0]?.onlyForDataStreams;
    expect(dataStreams?.[0]?.elasticsearch?.index_mode).toBeUndefined();
  });

  describe('with dynamic_signal_types', () => {
    const OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'otel',
          type: 'logs',
          input: 'otelcol',
          dynamic_signal_types: true,
        },
      ],
    };

    const OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES_NO_TYPE = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'otel',
          input: 'otelcol',
          template_path: 'otel/otel.hbl',
          dynamic_signal_types: true,
        },
      ],
    };

    const OTEL_PKG_INFO_NO_DYNAMIC_SIGNAL_TYPES = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'otel',
          type: 'logs',
          input: 'otelcol',
          dynamic_signal_types: false,
        },
      ],
    };

    const OTEL_PKG_INFO_WITHOUT_FLAG = {
      type: 'input',
      name: 'otel',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'otel',
          type: 'logs',
          input: 'otelcol',
        },
      ],
    };

    beforeEach(() => {
      vi.mocked(installIndexTemplatesAndPipelines).mockReset();
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);
    });

    it('should install index templates for all signal types when dynamic_signal_types is true', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'otel.test' } },
                },
              ],
            },
          ],
        } as any,
      });

      // Should be called 3 times (once for each signal type: logs, metrics, traces)
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(3);

      // Verify it was called for logs
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyForDataStreams: [
            expect.objectContaining({
              type: 'logs',
              dataset: 'otel.test',
            }),
          ],
        })
      );

      // Verify it was called for metrics
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyForDataStreams: [
            expect.objectContaining({
              type: 'metrics',
              dataset: 'otel.test',
            }),
          ],
        })
      );

      // Verify it was called for traces
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyForDataStreams: [
            expect.objectContaining({
              type: 'traces',
              dataset: 'otel.test',
            }),
          ],
        })
      );
    });

    it('should install index templates for all signal types when dynamic_signal_types is true and policy template has no type', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES_NO_TYPE,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES_NO_TYPE as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'otel.test' } },
                },
              ],
            },
          ],
        } as any,
      });

      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(3);
      const calls = vi.mocked(installIndexTemplatesAndPipelines).mock.calls;
      const types = calls.map((c) => c[0]?.onlyForDataStreams?.[0]?.type);
      expect(types.sort()).toEqual(['logs', 'metrics', 'traces']);
    });

    it('should install index template for single signal type when dynamic_signal_types is false', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_NO_DYNAMIC_SIGNAL_TYPES,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_NO_DYNAMIC_SIGNAL_TYPES as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'otel.test' } },
                },
              ],
            },
          ],
        } as any,
      });

      // Should only be called once for the single signal type
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(1);

      // Verify it was called only for logs
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyForDataStreams: [
            expect.objectContaining({
              type: 'logs',
              dataset: 'otel.test',
            }),
          ],
        })
      );
    });

    it('should install index template for single signal type when dynamic_signal_types is not defined (backward compatibility)', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_WITHOUT_FLAG,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_WITHOUT_FLAG as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'metrics' },
                  vars: { 'data_stream.dataset': { value: 'otel.test' } },
                },
              ],
            },
          ],
        } as any,
      });

      // Should only be called once for the single signal type
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(1);

      // Verify it was called only for metrics
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyForDataStreams: [
            expect.objectContaining({
              type: 'metrics',
              dataset: 'otel.test',
            }),
          ],
        })
      );
    });

    it('should not install any index templates for a profiles input package', async () => {
      const OTEL_PKG_INFO_PROFILES = {
        type: 'input',
        name: 'profiling_otel',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'profilingreceiver',
            type: 'profiles',
            input: 'otelcol',
          },
        ],
      };
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'profiling_otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_PROFILES,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_PROFILES as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'profilingreceiver',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'profiles' },
                  vars: { 'data_stream.dataset': { value: 'profilingreceiver' } },
                },
              ],
            },
          ],
        } as any,
      });

      // profiles is owned end-to-end by Universal Profiling; Fleet must not create data streams
      // for it (elastic/package-spec#1191).
      expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
    });

    it('should respect data_stream.type var when dynamic_signal_types is true', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES,
        assetsMap: new Map(),
        paths: [],
      } as any);
      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: {
                    'data_stream.dataset': { value: 'otel.custom' },
                    'data_stream.type': { value: 'traces' },
                  },
                },
              ],
            },
          ],
        } as any,
      });

      // Should still create all 3 templates with the custom dataset
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(3);

      const calls = vi.mocked(installIndexTemplatesAndPipelines).mock.calls;
      const datasets = calls.map((call) => call[0]?.onlyForDataStreams?.[0]).filter(Boolean);

      expect(datasets).toEqual([
        expect.objectContaining({ type: 'logs', dataset: 'otel.custom' }),
        expect.objectContaining({ type: 'metrics', dataset: 'otel.custom' }),
        expect.objectContaining({ type: 'traces', dataset: 'otel.custom' }),
      ]);
    });

    it('should skip existing data streams for each signal type', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'otel',
          version: '1.0.0',
        },
        packageInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES,
        assetsMap: new Map(),
        paths: [],
      } as any);

      // Mock that logs data stream already exists (from same package)
      vi
        .mocked(dataStreamService)
        .getMatchingDataStreams.mockImplementation(async (esClient, params) => {
          if (params.type === 'logs') {
            return [
              {
                name: 'logs-otel.test-default',
                _meta: {
                  package: {
                    name: 'otel',
                  },
                },
              },
            ] as any;
          }
          return [];
        });

      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: OTEL_PKG_INFO_DYNAMIC_SIGNAL_TYPES as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'otel',
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'otel.test' } },
                },
              ],
            },
          ],
        } as any,
      });

      // Should only be called 2 times (metrics and traces, logs skipped because it already exists)
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(2);

      // Verify logs was skipped
      const calls = vi.mocked(installIndexTemplatesAndPipelines).mock.calls;
      const types = calls.map((call) => call[0]?.onlyForDataStreams?.[0]?.type).filter(Boolean);
      expect(types).not.toContain('logs');
      expect(types).toContain('metrics');
      expect(types).toContain('traces');
    });

    it('should install new asset structure when force is true and index template already exists (e.g. upgrade from integration 1.x to input 2.x)', async () => {
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: {
          name: 'filestream',
          version: '2.0.0',
        },
        packageInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' },
        assetsMap: new Map(),
        paths: [],
      } as any);

      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      // Legacy index template from 1.x exists
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue({
        name: 'logs-filestream.generic',
        _meta: { package: { name: 'filestream' } },
      } as any);

      const mockedLogger = vi.mocked(appContextService.getLogger());

      await installAssetsForInputPackagePolicy({
        pkgInfo: { ...TEST_PKG_INFO_INPUT, name: 'filestream', version: '2.0.0' } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: true,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              name: 'log',
              type: 'log',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_dataset' } },
                },
              ],
            },
          ],
        } as any,
      });

      // Should install new component templates and ingest pipelines (not skip)
      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(1);
    });
  });
});

describe('removeAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    vi.mocked(cleanupAssetsMock).mockReset();
  });

  it('should clean up assets for integration packages with status = installed', async () => {
    const mockedLogger = vi.mocked(appContextService.getLogger());
    const installation = {
      name: 'my-integration',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [
        {
          id: 'logs-my-integration.custom_dataset',
          type: 'index_template',
        },
        {
          id: 'logs-my-integration.custom_dataset@package',
          type: 'component_template',
        },
      ],
      es_index_patterns: {
        custom_dataset: 'logs-my-integration.custom_dataset-*',
      },
    } as any;
    vi.mocked(getInstallation).mockResolvedValue(installation);

    await removeAssetsForInputPackagePolicy({
      packageInfo: {
        type: 'integration',
        status: 'installed',
        name: 'my-integration',
        version: '1.0.0',
      } as any,
      datasetName: 'custom_dataset',
      savedObjectsClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      logger: mockedLogger,
    });
    expect(cleanupAssetsMock).toHaveBeenCalledWith(
      'custom_dataset',
      {
        es_index_patterns: { custom_dataset: 'logs-my-integration.custom_dataset-*' },
        installed_es: [
          { id: 'logs-my-integration.custom_dataset', type: 'index_template' },
          { id: 'logs-my-integration.custom_dataset@package', type: 'component_template' },
        ],
        installed_kibana: [],
        name: 'my-integration',
        package_assets: [],
        version: '1.0.0',
      },
      installation,
      expect.anything(),
      expect.anything()
    );
  });

  it('should do nothing for packages with status !== installed', async () => {
    const mockedLogger = vi.mocked(appContextService.getLogger());
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
    expect(cleanupAssetsMock).not.toHaveBeenCalled();
  });

  it('should clean up assets for input packages with status = installed', async () => {
    const mockedLogger = vi.mocked(appContextService.getLogger());
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
    vi.mocked(getInstallation).mockResolvedValue(installation);

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
    expect(cleanupAssetsMock).toHaveBeenCalledWith(
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
    const mockedLogger = vi.mocked(appContextService.getLogger());
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
    vi.mocked(getInstallation).mockResolvedValue(installation);

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
    expect(cleanupAssetsMock).toHaveBeenCalledWith(
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
    const mockedLogger = vi.mocked(appContextService.getLogger());
    vi.mocked(getInstallation).mockResolvedValue(undefined);

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
    expect(cleanupAssetsMock).not.toHaveBeenCalled();
  });

  it('should log error if cleanupAssets failed', async () => {
    const mockedLogger = vi.mocked(appContextService.getLogger());
    vi.mocked(getInstallation).mockResolvedValue({
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
    expect(mockedLogger.error).toHaveBeenCalled();
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
      const res = isInputPackageDatasetUsedByMultiplePolicies(
        [policy1, policy2] as any,
        'generic',
        'logs'
      );
      expect(res).toEqual(false);
    });

    it('should return true if there other policies using the same dataset', async () => {
      const res = isInputPackageDatasetUsedByMultiplePolicies(
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

    it('should return false when the only matching policy is excluded', () => {
      const res = isInputPackageDatasetUsedByMultiplePolicies(
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
          },
        ] as any,
        'udp.generic',
        'logs',
        'policy1'
      );
      expect(res).toEqual(false);
    });

    it('should return true when another policy uses the dataset even with exclusion', () => {
      const res = isInputPackageDatasetUsedByMultiplePolicies(
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
        'logs',
        'policy1'
      );
      expect(res).toEqual(true);
    });

    it('should not false-positive when one policy has the dataset on multiple inputs', () => {
      const res = isInputPackageDatasetUsedByMultiplePolicies(
        [
          {
            ...policy1,
            inputs: [
              {
                streams: [{ vars: { 'data_stream.dataset': { value: 'custom', type: 'text' } } }],
              },
              {
                streams: [{ vars: { 'data_stream.dataset': { value: 'custom', type: 'text' } } }],
              },
            ],
          },
        ] as any,
        'custom',
        'logs',
        'policy1'
      );
      expect(res).toEqual(false);
    });
  });

  describe('getCustomDatasetStreams', () => {
    it('should return empty for input package without dataset var', () => {
      const result = getCustomDatasetStreams(
        { inputs: [{ type: 'log', streams: [{ data_stream: { type: 'logs' } }] }] } as any,
        { type: 'input', policy_templates: [{ name: 'log', type: 'logs' }] } as any
      );
      expect(result).toEqual([]);
    });

    it('should return single stream for input package with custom dataset', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              type: 'log',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_custom' } },
                },
              ],
            },
          ],
        } as any,
        { type: 'input', policy_templates: [{ name: 'log', type: 'logs' }] } as any
      );
      expect(result).toHaveLength(1);
      expect(result[0].datasetName).toBe('my_custom');
      expect(result[0].dataStreamType).toBe('logs');
      expect(result[0].inputType).toBe('log');
    });

    it('should return all signal types for input package with dynamic_signal_types', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              type: 'otelcol',
              streams: [
                {
                  data_stream: { type: 'logs' },
                  vars: { 'data_stream.dataset': { value: 'my_otel' } },
                },
              ],
            },
          ],
        } as any,
        {
          type: 'input',
          policy_templates: [
            { name: 'otel', type: 'logs', input: 'otelcol', dynamic_signal_types: true },
          ],
        } as any
      );
      expect(result).toHaveLength(3);
      expect(result.map((s) => s.dataStreamType)).toEqual(['logs', 'metrics', 'traces']);
    });

    it('should return empty for integration package with no custom datasets', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              enabled: true,
              type: 'nginx/metrics',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'metrics', dataset: 'nginx.stubstatus' },
                  vars: {},
                },
              ],
            },
          ],
        } as any,
        {
          type: 'integration',
          data_streams: [{ dataset: 'nginx.stubstatus', type: 'metrics' }],
        } as any
      );
      expect(result).toEqual([]);
    });

    it('should return custom dataset streams for integration package', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              enabled: true,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom_access' } },
                },
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.error' },
                  vars: {},
                },
              ],
            },
          ],
        } as any,
        {
          type: 'integration',
          data_streams: [
            { dataset: 'nginx.access', type: 'logs', path: 'access' },
            { dataset: 'nginx.error', type: 'logs', path: 'error' },
          ],
        } as any
      );
      expect(result).toHaveLength(1);
      expect(result[0].datasetName).toBe('my_custom_access');
      expect(result[0].dataStreamType).toBe('logs');
      expect(result[0].resolvedDataStream).toEqual(
        expect.objectContaining({
          dataset: 'my_custom_access',
          path: 'access',
          type: 'logs',
        })
      );
    });

    it('should deduplicate streams with same custom dataset and type', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              enabled: true,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom' } },
                },
              ],
            },
            {
              enabled: true,
              type: 'httpjson',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom' } },
                },
              ],
            },
          ],
        } as any,
        {
          type: 'integration',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        } as any
      );
      expect(result).toHaveLength(1);
    });

    it('should skip disabled inputs and streams', () => {
      const result = getCustomDatasetStreams(
        {
          inputs: [
            {
              enabled: false,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom' } },
                },
              ],
            },
          ],
        } as any,
        {
          type: 'integration',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        } as any
      );
      expect(result).toEqual([]);
    });
  });

  describe('installAssetsForCustomDatasetPolicy', () => {
    beforeEach(() => {
      vi.mocked(optimisticallyAddEsAssetReferences).mockReset();
      vi.mocked(installIndexTemplatesAndPipelines).mockClear();
      vi.mocked(dataStreamService).getMatchingDataStreams.mockReset();
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockReset();
    });

    it('should do nothing when there are no custom dataset streams', async () => {
      const mockedLogger = vi.mocked(appContextService.getLogger());
      await installAssetsForCustomDatasetPolicy({
        pkgInfo: {
          type: 'integration',
          data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
        } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              enabled: true,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: {},
                },
              ],
            },
          ],
        } as any,
      });
      expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
    });

    it('should install templates for integration package with custom dataset', async () => {
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: { name: 'nginx', version: '1.0.0', installed_es: [] },
        packageInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        },
        assetsMap: new Map(),
        paths: [],
      } as any);

      const mockedLogger = vi.mocked(appContextService.getLogger());
      await installAssetsForCustomDatasetPolicy({
        pkgInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              enabled: true,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom_access' } },
                },
              ],
            },
          ],
        } as any,
      });

      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(1);
      const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0];
      const dataStreams = installCall?.[0]?.onlyForDataStreams;
      expect(dataStreams?.[0]?.dataset).toBe('my_custom_access');
      expect(dataStreams?.[0]?.type).toBe('logs');
      expect(dataStreams?.[0]?.path).toBe('access');

      expect(vi.mocked(optimisticallyAddEsAssetReferences)).toHaveBeenCalledTimes(1);
      const esPatternCall = vi.mocked(optimisticallyAddEsAssetReferences).mock.calls[0];
      const esIndexPatterns = esPatternCall?.[3];
      expect(esIndexPatterns).toHaveProperty('my_custom_access');
    });

    it('should throw for an uploaded package when a custom dataset matches an ownerless live stream', async () => {
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([
        {
          name: 'logs-generic-default',
        },
      ] as any);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: { name: 'uploaded_probe', version: '1.0.0', install_source: 'upload' },
        packageInfo: {
          type: 'integration',
          name: 'uploaded_probe',
          version: '1.0.0',
          data_streams: [{ dataset: 'uploaded_probe.safe', type: 'logs', path: 'safe' }],
        },
        assetsMap: new Map(),
        paths: [],
      } as any);

      const mockedLogger = vi.mocked(appContextService.getLogger());
      await expect(
        installAssetsForCustomDatasetPolicy({
          pkgInfo: {
            type: 'integration',
            name: 'uploaded_probe',
            version: '1.0.0',
            data_streams: [{ dataset: 'uploaded_probe.safe', type: 'logs', path: 'safe' }],
          } as any,
          soClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
          force: true,
          logger: mockedLogger,
          packagePolicy: {
            inputs: [
              {
                enabled: true,
                type: 'logfile',
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'uploaded_probe.safe' },
                    vars: { 'data_stream.dataset': { value: 'generic' } },
                  },
                ],
              },
            ],
          } as any,
        })
      ).rejects.toThrowError(PackagePolicyValidationError);

      expect(vi.mocked(installIndexTemplatesAndPipelines)).not.toHaveBeenCalled();
    });

    it('should pass customDataStreamOriginDataset and customDataStreamOriginType to installIndexTemplatesAndPipelines', async () => {
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: { name: 'nginx', version: '1.0.0', installed_es: [] },
        packageInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        },
        assetsMap: new Map(),
        paths: [],
      } as any);

      const mockedLogger = vi.mocked(appContextService.getLogger());
      await installAssetsForCustomDatasetPolicy({
        pkgInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [{ dataset: 'nginx.access', type: 'logs', path: 'access' }],
        } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              enabled: true,
              type: 'logfile',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'nginx.access' },
                  vars: { 'data_stream.dataset': { value: 'my_custom_access' } },
                },
              ],
            },
          ],
        } as any,
      });

      expect(vi.mocked(installIndexTemplatesAndPipelines)).toHaveBeenCalledTimes(1);
      const installCall = vi.mocked(installIndexTemplatesAndPipelines).mock.calls[0][0];
      expect(installCall.customDataStreamOriginDataset).toBe('nginx.access');
      expect(installCall.customDataStreamOriginType).toBe('logs');
    });

    it('should not apply applyTimeSeriesIndexMode for integration packages', async () => {
      vi.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
      vi.mocked(dataStreamService).getMatchingIndexTemplate.mockResolvedValue(null);
      vi.mocked(getInstalledPackageWithAssets).mockResolvedValue({
        installation: { name: 'nginx', version: '1.0.0', installed_es: [] },
        packageInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'nginx.stubstatus',
              type: 'metrics',
              path: 'stubstatus',
              elasticsearch: { index_mode: 'time_series' },
            },
          ],
        },
        assetsMap: new Map(),
        paths: [],
      } as any);

      const mockedLogger = vi.mocked(appContextService.getLogger());
      await installAssetsForCustomDatasetPolicy({
        pkgInfo: {
          type: 'integration',
          name: 'nginx',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'nginx.stubstatus',
              type: 'metrics',
              path: 'stubstatus',
              elasticsearch: { index_mode: 'time_series' },
            },
          ],
        } as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              enabled: true,
              type: 'nginx/metrics',
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'metrics', dataset: 'nginx.stubstatus' },
                  vars: { 'data_stream.dataset': { value: 'my_custom_metrics' } },
                },
              ],
            },
          ],
        } as any,
      });

      expect(mockedLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Ignoring time_series index mode')
      );
      expect(mockedLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Adding time_series index mode')
      );
    });
  });
});
