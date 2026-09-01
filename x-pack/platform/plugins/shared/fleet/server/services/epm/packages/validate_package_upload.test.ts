/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { ElasticsearchClient, SavedObject } from '@kbn/core/server';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchAssetType } from '../../../../common';
import type { Installation } from '../../../../common';
import { PackageInvalidArchiveError, PackageNotFoundError, RegistryError } from '../../../errors';
import { appContextService } from '../../app_context';
import * as Registry from '../registry';

import { getBundledPackageByName } from './bundled_packages';
import { getPackageSavedObjects } from './get';
import { validatePackageUpload } from './validate_package_upload';

jest.mock('../../app_context', () => ({
  appContextService: {
    getConfig: jest.fn(() => ({})),
    getExperimentalFeatures: jest.fn(() => ({ enableOtelIntegrations: true })),
  },
}));

jest.mock('../registry', () => ({
  fetchFindLatestPackageOrThrow: jest.fn(),
}));

jest.mock('./get', () => ({
  getPackageSavedObjects: jest.fn(),
}));

jest.mock('./bundled_packages', () => ({
  getBundledPackageByName: jest.fn(),
}));

const mockedGetConfig = appContextService.getConfig as jest.Mock;
const mockedGetExperimentalFeatures = appContextService.getExperimentalFeatures as jest.Mock;
const mockedFetchLatest = Registry.fetchFindLatestPackageOrThrow as jest.Mock;
const mockedGetPackageSavedObjects = getPackageSavedObjects as jest.Mock;
const mockedGetBundledPackageByName = getBundledPackageByName as jest.Mock;

const soClient = savedObjectsClientMock.create();
const esClient = elasticsearchServiceMock.createElasticsearchClient();

const validPackage = {
  name: 'my_integration',
  data_streams: [{ dataset: 'my_integration.logs', type: 'logs' }],
};

function liveDataStream(
  overrides: Pick<IndicesDataStream, 'name' | 'template'> & Partial<IndicesDataStream>
): IndicesDataStream {
  return {
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: `.ds-${overrides.name}-000001`,
        index_uuid: 'uuid',
      },
    ],
    generation: 1,
    hidden: false,
    next_generation_managed_by: 'Index Lifecycle Management',
    prefer_ilm: true,
    rollover_on_write: false,
    settings: {},
    status: 'GREEN',
    ...overrides,
  };
}

function uploadedInstallation(name = 'my_integration'): SavedObject<Installation> {
  return {
    attributes: { name, install_source: 'upload' },
  } as SavedObject<Installation>;
}

function validateUpload(
  params: Omit<Parameters<typeof validatePackageUpload>[0], 'esClient'> & {
    esClient?: ElasticsearchClient;
  }
) {
  return validatePackageUpload({ esClient, ...params });
}

async function expectUploadRejected(params: Parameters<typeof validateUpload>[0]) {
  await expect(validateUpload(params)).rejects.toBeInstanceOf(PackageInvalidArchiveError);
}

describe('validatePackageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConfig.mockReturnValue({});
    mockedGetExperimentalFeatures.mockReturnValue({ enableOtelIntegrations: true });
    mockedFetchLatest.mockRejectedValue(new PackageNotFoundError('not found'));
    mockedGetPackageSavedObjects.mockResolvedValue({ saved_objects: [] });
    mockedGetBundledPackageByName.mockResolvedValue(undefined);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] });
  });

  describe('V5 package name', () => {
    it('rejects a name with a dot', async () => {
      await expectUploadRejected({
        packageInfo: { ...validPackage, name: 'nginx.access' },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a name with a hyphen', async () => {
      await expectUploadRejected({
        packageInfo: { ...validPackage, name: 'my-integration' },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a one-character name', async () => {
      await expectUploadRejected({
        packageInfo: { ...validPackage, name: 'a' },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects uppercase letters without rewriting them', async () => {
      await expectUploadRejected({
        packageInfo: { ...validPackage, name: 'My_Integration' },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('accepts a lowercase underscored name', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('V4 archive assets', () => {
    it('rejects a prebuilt index template', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/index_template/logs.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a prebuilt component template', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/component_template/settings.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a data-stream prebuilt index template', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/data_stream/logs/elasticsearch/index_template/template.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a top-level ingest pipeline', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/ingest_pipeline/shared.yml'],
        savedObjectsClient: soClient,
      });
    });

    it('allows a dataset-scoped ingest pipeline', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [
            'my_integration-1.0.0/data_stream/logs/elasticsearch/ingest_pipeline/default.yml',
          ],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows an ILM policy', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/elasticsearch/ilm_policy/logs.json'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows a data-stream ILM policy', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/data_stream/logs/elasticsearch/ilm/policy.json'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows an ES|QL view', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/elasticsearch/esql_view/view.yml'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows an ML model', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/elasticsearch/ml_model/model.json'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows a transform', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/elasticsearch/transform/transform.json'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows a knowledge base asset', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: ['my_integration-1.0.0/docs/knowledge_base/guide.md'],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('V1 registry-installed shadow', () => {
    it('rejects an upload that shadows a registry-installed package', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
        installedPkg: {
          attributes: { name: 'my_integration', install_source: 'registry' },
        } as SavedObject<Installation>,
      });
    });

    it('allows upgrading an already uploaded package', async () => {
      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: uploadedInstallation(),
        })
      ).resolves.toBeUndefined();
    });

    it('rejects an existing package when install_source is missing', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
        installedPkg: {
          attributes: { name: 'my_integration' },
        } as SavedObject<Installation>,
      });
    });

    it('rejects a non-upload installed package before querying the registry', async () => {
      mockedFetchLatest.mockResolvedValue({ name: 'my_integration', version: '1.0.0' });

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
        installedPkg: {
          attributes: { name: 'my_integration', install_source: 'registry' },
        } as SavedObject<Installation>,
      });

      expect(mockedFetchLatest).not.toHaveBeenCalled();
    });

    it('rejects a legacy bundled installation recorded as upload', async () => {
      mockedGetBundledPackageByName.mockResolvedValue({
        name: 'my_integration',
        version: '1.0.0',
        getBuffer: async () => Buffer.from(''),
      });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: uploadedInstallation(),
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot upload a package that replaces the bundled-installed package'
          ),
        })
      );

      expect(mockedFetchLatest).not.toHaveBeenCalled();
    });
  });

  describe('V2 registry or bundled name', () => {
    it('rejects a registry package name by default', async () => {
      mockedFetchLatest.mockResolvedValue({ name: 'my_integration', version: '1.0.0' });

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('searches the registry without compatibility constraints', async () => {
      await validateUpload({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
      });

      expect(mockedFetchLatest).toHaveBeenCalledWith('my_integration', {
        ignoreConstraints: true,
        prerelease: true,
        throwOnError: true,
      });
    });

    it('rejects the upload when the registry is unavailable', async () => {
      mockedFetchLatest.mockRejectedValue(new RegistryError('registry down'));

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('does not query the registry when re-uploading an existing upload package', async () => {
      mockedFetchLatest.mockResolvedValue({ name: 'my_integration', version: '1.0.0' });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: uploadedInstallation(),
        })
      ).resolves.toBeUndefined();

      expect(mockedFetchLatest).not.toHaveBeenCalled();
    });

    it('still validates archive assets when skipping the registry lookup on re-upload', async () => {
      mockedFetchLatest.mockResolvedValue({ name: 'my_integration', version: '1.0.0' });

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/index_template/logs.json'],
        savedObjectsClient: soClient,
        installedPkg: uploadedInstallation(),
      });

      expect(mockedFetchLatest).not.toHaveBeenCalled();
    });

    it('allows a first upload in air-gapped mode when the name has no bundled match', async () => {
      mockedGetConfig.mockReturnValue({ isAirGapped: true });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();

      // The registry is never contacted for installs in air-gapped mode, so pre-squatting
      // a registry name has nothing to intercept there; only local bundled names matter.
      expect(mockedFetchLatest).not.toHaveBeenCalled();
    });

    it('rejects a bundled package name in air-gapped mode', async () => {
      mockedGetConfig.mockReturnValue({ isAirGapped: true });
      mockedGetBundledPackageByName.mockResolvedValue({
        name: 'my_integration',
        version: '1.0.0',
        getBuffer: async () => Buffer.from(''),
      });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot upload a package whose name already exists in the package registry'
          ),
        })
      );
    });
  });

  describe('V3 dataset ownership', () => {
    it('rejects a dataset already owned by another installed package', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                { id: 'logs-nginx.access', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a prefix overlap with an owned dataset', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [{ id: 'logs-nginx', type: ElasticsearchAssetType.indexTemplate }],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a case-folded dataset that maps to the same Elasticsearch assets', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                { id: 'logs-nginx.access', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'Nginx.Access', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('does not treat logs and metrics datasets with the same name as a collision', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [{ id: 'logs-foo', type: ElasticsearchAssetType.indexTemplate }],
            },
          },
        ],
      });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'hostile',
            data_streams: [{ dataset: 'foo', type: 'metrics' }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('does not treat the same package upgrade as a foreign owner', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'my_integration',
              installed_es: [
                { id: 'logs-my_integration.logs', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: uploadedInstallation(),
        })
      ).resolves.toBeUndefined();
    });

    it('rejects a dataset that embeds a template suffix', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                { id: 'logs-nginx.access', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'nginx.access@namespace.prod', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a data-stream type that is not a Fleet type', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                { id: 'logs-nginx-access', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'access', type: 'logs-nginx' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('compares canonical Elasticsearch asset names, including owned @ suffixes', async () => {
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                {
                  id: 'logs-nginx.access@namespace.prod',
                  type: ElasticsearchAssetType.indexTemplate,
                },
              ],
            },
          },
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a dataset that matches an existing generic-logs data stream', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-payroll.records-default',
            template: 'logs',
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'evilclaim',
          data_streams: [{ dataset: 'payroll.records', type: 'logs' }],
        },
        paths: [
          'evilclaim-1.0.0/data_stream/payroll.records/elasticsearch/ingest_pipeline/default.yml',
        ],
        savedObjectsClient: soClient,
      });

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: 'logs-payroll.records-*',
        expand_wildcards: ['open', 'hidden'],
      });
    });

    it('rejects a live data stream owned by a different Fleet package', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-nginx.access-default',
            template: 'logs-nginx.access',
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'nginx' } },
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'hostile',
          data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a first upload when a matching live stream has the same package metadata', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-payroll.records-default',
            template: 'logs-payroll.records',
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'evilclaim' } },
          }),
        ],
      });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'evilclaim',
            data_streams: [{ dataset: 'payroll.records', type: 'logs' }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/must be migrated or removed/),
        })
      );
    });

    it('rejects a first upload of an OTel dataset when a matching .otel stream has the same package metadata', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-payroll.records.otel-default',
            template: 'logs-payroll.records',
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'evilclaim' } },
          }),
        ],
      });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'evilclaim',
            data_streams: [
              {
                dataset: 'payroll.records',
                type: 'logs',
                streams: [{ input: 'otelcol' }],
              },
            ],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/must be migrated or removed/),
        })
      );

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: 'logs-payroll.records.otel-*',
        expand_wildcards: ['open', 'hidden'],
      });
    });

    it('allows an upgrade when live data streams are owned by this package', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-my_integration.logs-default',
            template: 'logs-my_integration.logs',
            _meta: {
              managed_by: 'fleet',
              managed: true,
              package: { name: 'my_integration' },
            },
          }),
        ],
      });

      await expect(
        validateUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: uploadedInstallation(),
        })
      ).resolves.toBeUndefined();
    });

    it('rejects a re-upload when a matching live stream has no owner', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-my_integration.logs-default',
            template: 'logs-my_integration.logs',
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
        installedPkg: uploadedInstallation(),
      });
    });

    it('rejects a re-upload when a matching live stream is owned by another package', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-my_integration.logs-default',
            template: 'logs-my_integration.logs',
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'nginx' } },
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: validPackage,
        paths: [],
        savedObjectsClient: soClient,
        installedPkg: uploadedInstallation(),
      });
    });

    it('treats a missing data stream as unclaimed', async () => {
      esClient.indices.getDataStream.mockRejectedValue({ statusCode: 404 });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'evilclaim',
            data_streams: [{ dataset: 'payroll.records', type: 'logs' }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('rejects the upload when live data stream lookup fails', async () => {
      esClient.indices.getDataStream.mockRejectedValue({
        statusCode: 503,
        message: 'cluster unavailable',
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'evilclaim',
          data_streams: [{ dataset: 'payroll.records', type: 'logs' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a direct otelcol stream that matches an existing .otel data stream', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-payroll.records.otel-default',
            template: 'logs-payroll.records',
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'evilclaim',
          data_streams: [
            {
              dataset: 'payroll.records',
              type: 'logs',
              streams: [{ input: 'otelcol' }],
            },
          ],
        },
        paths: [],
        savedObjectsClient: soClient,
      });

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: 'logs-payroll.records.otel-*',
        expand_wildcards: ['open', 'hidden'],
      });
    });

    it('rejects a named otelcol stream that matches an existing .otel data stream', async () => {
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-payroll.records.otel-default',
            template: 'logs-payroll.records',
          }),
        ],
      });

      await expectUploadRejected({
        packageInfo: {
          name: 'evilclaim',
          policy_templates: [
            {
              inputs: [{ name: 'otel_logs', type: 'otelcol' }],
            },
          ],
          data_streams: [
            {
              dataset: 'payroll.records',
              type: 'logs',
              streams: [{ input: 'otel_logs' }],
            },
          ],
        },
        paths: [],
        savedObjectsClient: soClient,
      });

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: 'logs-payroll.records.otel-*',
        expand_wildcards: ['open', 'hidden'],
      });
    });

    it('does not query the .otel pattern when enableOtelIntegrations is off', async () => {
      mockedGetExperimentalFeatures.mockReturnValue({ enableOtelIntegrations: false });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'evilclaim',
            data_streams: [
              {
                dataset: 'payroll.records',
                type: 'logs',
                streams: [{ input: 'otelcol' }],
              },
            ],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: 'logs-payroll.records-*',
        expand_wildcards: ['open', 'hidden'],
      });
    });
  });

  describe('skipUploadPackageValidation escape hatch', () => {
    it('skips every check without querying the registry, saved objects, or Elasticsearch', async () => {
      mockedGetConfig.mockReturnValue({ internal: { skipUploadPackageValidation: true } });

      // A package that violates every rule at once: invalid name, forbidden archive
      // asset, shadowing a registry install, registry-existing name, a dataset owned
      // by another installed package, and a matching unowned live data stream.
      mockedFetchLatest.mockResolvedValue({ name: 'My-Integration', version: '1.0.0' });
      mockedGetPackageSavedObjects.mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              name: 'nginx',
              installed_es: [
                { id: 'logs-nginx.access', type: ElasticsearchAssetType.indexTemplate },
              ],
            },
          },
        ],
      });
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          liveDataStream({
            name: 'logs-nginx.access-default',
            template: 'logs-nginx.access',
          }),
        ],
      });

      await expect(
        validateUpload({
          packageInfo: {
            name: 'My-Integration',
            data_streams: [{ dataset: 'nginx.access', type: 'logs' }],
          },
          paths: ['My-Integration-1.0.0/elasticsearch/index_template/logs.json'],
          savedObjectsClient: soClient,
          installedPkg: {
            attributes: { name: 'My-Integration', install_source: 'registry' },
          } as SavedObject<Installation>,
        })
      ).resolves.toBeUndefined();

      expect(mockedFetchLatest).not.toHaveBeenCalled();
      expect(mockedGetPackageSavedObjects).not.toHaveBeenCalled();
      expect(esClient.indices.getDataStream).not.toHaveBeenCalled();
    });
  });

  describe('capabilities outside the upload takeover scope', () => {
    it('allows top-level cluster privileges', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            ...validPackage,
            elasticsearch: { privileges: { cluster: ['all'] } },
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows data-stream cluster privileges', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            name: 'my_integration',
            data_streams: [
              {
                dataset: 'my_integration.logs',
                type: 'logs',
                elasticsearch: { privileges: { cluster: ['manage'] } },
              },
            ],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows dynamic_dataset', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            name: 'my_integration',
            data_streams: [
              {
                dataset: 'my_integration.logs',
                type: 'logs',
                elasticsearch: { dynamic_dataset: true },
              },
            ],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows dynamic_namespace', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            name: 'my_integration',
            data_streams: [
              {
                dataset: 'my_integration.logs',
                type: 'logs',
                elasticsearch: { dynamic_namespace: true },
              },
            ],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows an input package that declares no data streams', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            name: 'my_integration',
            type: 'input',
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows dynamic_signal_types on a policy template', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            ...validPackage,
            policy_templates: [{ dynamic_signal_types: true }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows dynamic_signal_types on a policy template input', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            ...validPackage,
            policy_templates: [{ inputs: [{ dynamic_signal_types: true }] }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows a profiles data stream', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            name: 'my_integration',
            data_streams: [{ dataset: 'my_integration.profile', type: 'profiles' }],
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('allows package-level index privileges', async () => {
      await expect(
        validateUpload({
          packageInfo: {
            ...validPackage,
            elasticsearch: { privileges: { indices: ['all'] } },
          },
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });
  });
});
