/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType } from '../../../../common';
import { PackageInvalidArchiveError, PackageNotFoundError, RegistryError } from '../../../errors';
import { appContextService } from '../../app_context';
import * as Registry from '../registry';

import { getPackageSavedObjects } from './get';
import { validatePackageUpload } from './validate_package_upload';

import type { Installation } from '../../../../common';
import type { SavedObject } from '@kbn/core/server';

jest.mock('../../app_context', () => ({
  appContextService: {
    getConfig: jest.fn(() => ({})),
  },
}));

jest.mock('../registry', () => ({
  fetchFindLatestPackageOrThrow: jest.fn(),
}));

jest.mock('./get', () => ({
  getPackageSavedObjects: jest.fn(),
}));

const mockedGetConfig = appContextService.getConfig as jest.Mock;
const mockedFetchLatest = Registry.fetchFindLatestPackageOrThrow as jest.Mock;
const mockedGetPackageSavedObjects = getPackageSavedObjects as jest.Mock;

const soClient = savedObjectsClientMock.create();

const validPackage = {
  name: 'my_integration',
  data_streams: [{ dataset: 'my_integration.logs', type: 'logs' }],
};

async function expectUploadRejected(params: Parameters<typeof validatePackageUpload>[0]) {
  await expect(validatePackageUpload(params)).rejects.toBeInstanceOf(PackageInvalidArchiveError);
}

describe('validatePackageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConfig.mockReturnValue({});
    mockedFetchLatest.mockRejectedValue(new PackageNotFoundError('not found'));
    mockedGetPackageSavedObjects.mockResolvedValue({ saved_objects: [] });
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
        validatePackageUpload({
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
        validatePackageUpload({
          packageInfo: validPackage,
          paths: [
            'my_integration-1.0.0/data_stream/logs/elasticsearch/ingest_pipeline/default.yml',
          ],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
    });

    it('rejects an ILM policy', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/ilm_policy/logs.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a data-stream ILM policy', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/data_stream/logs/elasticsearch/ilm/policy.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects an ES|QL view', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/esql_view/view.yml'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects an ML model', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/ml_model/model.json'],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a transform', async () => {
      await expectUploadRejected({
        packageInfo: validPackage,
        paths: ['my_integration-1.0.0/elasticsearch/transform/transform.json'],
        savedObjectsClient: soClient,
      });
    });

    it('allows a knowledge base asset', async () => {
      await expect(
        validatePackageUpload({
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
        validatePackageUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: {
            attributes: { name: 'my_integration', install_source: 'upload' },
          } as SavedObject<Installation>,
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
      await validatePackageUpload({
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

    it('allows a registry package name when allowRegistryPackageUploads is true', async () => {
      mockedGetConfig.mockReturnValue({ internal: { allowRegistryPackageUploads: true } });
      mockedFetchLatest.mockResolvedValue({ name: 'my_integration', version: '1.0.0' });

      await expect(
        validatePackageUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
        })
      ).resolves.toBeUndefined();
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
        validatePackageUpload({
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
        validatePackageUpload({
          packageInfo: validPackage,
          paths: [],
          savedObjectsClient: soClient,
          installedPkg: {
            attributes: { name: 'my_integration', install_source: 'upload' },
          } as SavedObject<Installation>,
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
  });

  describe('cluster privileges and dynamic index patterns', () => {
    it('rejects top-level cluster privileges', async () => {
      await expectUploadRejected({
        packageInfo: {
          ...validPackage,
          elasticsearch: { privileges: { cluster: ['all'] } },
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects data-stream cluster privileges', async () => {
      await expectUploadRejected({
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
      });
    });

    it('rejects dynamic_dataset', async () => {
      await expectUploadRejected({
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
      });
    });

    it('rejects dynamic_namespace', async () => {
      await expectUploadRejected({
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
      });
    });

    it('rejects an input package even when it declares no data streams', async () => {
      await expectUploadRejected({
        packageInfo: {
          name: 'my_integration',
          type: 'input',
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects dynamic_signal_types on a policy template', async () => {
      await expectUploadRejected({
        packageInfo: {
          ...validPackage,
          policy_templates: [{ dynamic_signal_types: true }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects dynamic_signal_types on a policy template input', async () => {
      await expectUploadRejected({
        packageInfo: {
          ...validPackage,
          policy_templates: [{ inputs: [{ dynamic_signal_types: true }] }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects a profiles data stream', async () => {
      await expectUploadRejected({
        packageInfo: {
          name: 'my_integration',
          data_streams: [{ dataset: 'my_integration.profile', type: 'profiles' }],
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });

    it('rejects package-level index privileges', async () => {
      await expectUploadRejected({
        packageInfo: {
          ...validPackage,
          elasticsearch: { privileges: { indices: ['all'] } },
        },
        paths: [],
        savedObjectsClient: soClient,
      });
    });
  });
});
