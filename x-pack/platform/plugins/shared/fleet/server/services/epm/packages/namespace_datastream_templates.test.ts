/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { ElasticsearchAssetType } from '../../../../common/types';
import { appContextService } from '../../app_context';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { getInstalledPackageWithAssets, getInstallation } from './get';
import { updateEsAssetReferences } from './es_assets_reference';

import {
  handleNamespaceTemplateRestoreAfterPackageInstall,
  insertNamespaceCustomTemplate,
  isNamespaceCustomizationEnabledForPackage,
  syncNamespaceTemplates,
} from './namespace_datastream_templates';

jest.mock('./get');
jest.mock('../elasticsearch/template/template', () => {
  const actual = jest.requireActual('../elasticsearch/template/template');
  return {
    ...actual,
    updateCurrentWriteIndices: jest.fn(),
  };
});
jest.mock('./es_assets_reference');
jest.mock('../../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));
mockedAppContextService.getLogger.mockReturnValue({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any);

const mockedGetInstalledPackageWithAssets = getInstalledPackageWithAssets as jest.MockedFunction<
  typeof getInstalledPackageWithAssets
>;
const mockedGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;
const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;
const mockedUpdateEsAssetReferences = updateEsAssetReferences as jest.MockedFunction<
  typeof updateEsAssetReferences
>;

// ---------------------------------------------------------------------------
// insertNamespaceCustomTemplate — pure function tests
// ---------------------------------------------------------------------------

describe('insertNamespaceCustomTemplate', () => {
  it('inserts namespace entry before dataset-level @custom', () => {
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'logs-nginx.access@custom',
    ];
    const result = insertNamespaceCustomTemplate(composedOf, 'production', 'logs-nginx.access');
    expect(result).toEqual([
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'production@custom',
      'logs-nginx.access@custom',
    ]);
  });

  it('inserts namespace entry after last package-level @custom when no dataset entry exists', () => {
    const composedOf = ['logs-nginx.access@package', 'logs@custom', 'nginx@custom'];
    const result = insertNamespaceCustomTemplate(composedOf, 'default', 'logs-nginx.access');
    expect(result).toEqual([
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'default@custom',
    ]);
  });

  it('appends at end when no package-level @custom entries exist', () => {
    const composedOf = ['logs-nginx.access@package'];
    const result = insertNamespaceCustomTemplate(composedOf, 'default', 'logs-nginx.access');
    expect(result).toEqual(['logs-nginx.access@package', 'default@custom']);
  });

  it('is a no-op when namespace entry already present', () => {
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'default@custom',
      'logs-nginx.access@custom',
    ];
    const result = insertNamespaceCustomTemplate(composedOf, 'default', 'logs-nginx.access');
    expect(result).toEqual(composedOf);
  });

  it('does not treat hyphenated dataset-level entries as package-level entries', () => {
    const composedOf = ['logs-nginx.access@package', 'logs@custom', 'logs-nginx.access@custom'];
    const result = insertNamespaceCustomTemplate(composedOf, 'staging', 'logs-nginx.access');
    expect(result).toEqual([
      'logs-nginx.access@package',
      'logs@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ]);
  });
});

// ---------------------------------------------------------------------------
// isNamespaceCustomizationEnabledForPackage — per-package opt-in helper
// ---------------------------------------------------------------------------

describe('isNamespaceCustomizationEnabledForPackage', () => {
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when namespace is in the opt-in list', async () => {
    mockedGetInstallation.mockResolvedValue({
      namespace_customization_enabled_for: ['production', 'staging'],
    } as any);

    await expect(
      isNamespaceCustomizationEnabledForPackage(soClient, 'nginx', 'production')
    ).resolves.toBe(true);
  });

  it('returns false when namespace is not in the opt-in list', async () => {
    mockedGetInstallation.mockResolvedValue({
      namespace_customization_enabled_for: ['production'],
    } as any);

    await expect(
      isNamespaceCustomizationEnabledForPackage(soClient, 'nginx', 'staging')
    ).resolves.toBe(false);
  });

  it('returns false when the package is not installed', async () => {
    mockedGetInstallation.mockResolvedValue(undefined);

    await expect(
      isNamespaceCustomizationEnabledForPackage(soClient, 'nginx', 'production')
    ).resolves.toBe(false);
  });

  it('returns false when the opt-in list is missing from the installation', async () => {
    mockedGetInstallation.mockResolvedValue({} as any);

    await expect(
      isNamespaceCustomizationEnabledForPackage(soClient, 'nginx', 'production')
    ).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helpers shared by the remaining test suites
// ---------------------------------------------------------------------------

const BASE_COMPOSED_OF = [
  'logs-nginx.access@package',
  'logs@custom',
  'nginx@custom',
  'logs-nginx.access@custom',
];

function mockInstalledPackage(
  dataStreams: Array<{ dataset: string; type: string }> = [
    { dataset: 'nginx.access', type: 'logs' },
  ]
) {
  mockedGetInstalledPackageWithAssets.mockResolvedValue({
    packageInfo: { name: 'nginx', data_streams: dataStreams },
    installation: { installed_es: [] },
  } as any);
}

function makeEsClientWithTemplate(composedOf: string[] = BASE_COMPOSED_OF) {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getIndexTemplate.mockResolvedValue({
    index_templates: [
      {
        name: 'logs-nginx.access',
        index_template: {
          composed_of: composedOf,
          index_patterns: ['logs-nginx.access-*'],
          priority: 200,
          template: { settings: {}, mappings: {} },
          data_stream: {},
          _meta: { package: { name: 'nginx' } },
        },
      },
    ],
  } as any);
  return esClient;
}

// ---------------------------------------------------------------------------
// handleNamespaceTemplateRestoreAfterPackageInstall
// ---------------------------------------------------------------------------

describe('handleNamespaceTemplateRestoreAfterPackageInstall', () => {
  const soClient = savedObjectsClientMock.create();
  const dataStreams = [{ dataset: 'nginx.access', type: 'logs' }] as any[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getLogger.mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);
    mockedUpdateCurrentWriteIndices.mockResolvedValue(undefined);
    mockedUpdateEsAssetReferences.mockResolvedValue([]);
  });

  it('is a no-op when there are no data streams', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams: [],
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when the package opt-in list is empty', async () => {
    mockedGetInstallation.mockResolvedValue({
      namespace_customization_enabled_for: [],
    } as any);
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('rebuilds namespace templates for every opted-in namespace on the package', async () => {
    mockedGetInstallation.mockResolvedValue({
      namespace_customization_enabled_for: ['production', 'staging'],
      installed_es: [],
    } as any);
    const esClient = makeEsClientWithTemplate();

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    const putCalls = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls;
    const templateNames = putCalls.map((c: any) => c[0].name).sort();
    expect(templateNames).toEqual([
      'logs-nginx.access@namespace.production',
      'logs-nginx.access@namespace.staging',
    ]);
  });

  it('tracks restored namespace templates in installed_es', async () => {
    mockedGetInstallation.mockResolvedValue({
      namespace_customization_enabled_for: ['production'],
      installed_es: [],
    } as any);
    const esClient = makeEsClientWithTemplate();

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    expect(mockedUpdateEsAssetReferences).toHaveBeenCalledWith(
      soClient,
      'nginx',
      expect.any(Array),
      expect.objectContaining({
        assetsToAdd: expect.arrayContaining([
          {
            id: 'logs-nginx.access@namespace.production',
            type: ElasticsearchAssetType.indexTemplate,
          },
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// syncNamespaceTemplates — per-package opt-in sync
// ---------------------------------------------------------------------------

describe('syncNamespaceTemplates', () => {
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getLogger.mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);
    mockedUpdateCurrentWriteIndices.mockResolvedValue(undefined);
    mockedUpdateEsAssetReferences.mockResolvedValue([]);
    mockedGetInstallation.mockResolvedValue({ installed_es: [] } as any);
  });

  it('is a no-op when both added and removed are empty', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: [],
      removedNamespaces: [],
    });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
    expect(summary.created).toEqual([]);
    expect(summary.removed).toEqual([]);
  });

  it('marks the summary as skipped when the package is not installed', async () => {
    mockedGetInstalledPackageWithAssets.mockResolvedValue(undefined);
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: ['production'],
      removedNamespaces: [],
    });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ packageName: 'nginx', skipped: true });
  });

  it('creates namespace templates for added namespaces', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: ['production'],
      removedNamespaces: [],
    });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'logs-nginx.access@namespace.production',
        priority: 250,
        composed_of: expect.arrayContaining(['production@custom']),
      }),
      expect.any(Object)
    );
    expect(summary.created).toEqual(['production']);
    expect(summary.removed).toEqual([]);
  });

  it('does not throw when no data stream exists yet for the new namespace', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    // updateCurrentWriteIndices throws index_not_found when the namespace's
    // data stream doesn't exist yet (no data ingested). The handler should
    // swallow the 404 so the sync task can complete.
    mockedUpdateCurrentWriteIndices.mockRejectedValueOnce({
      meta: { statusCode: 404 },
      message: 'index_not_found_exception',
    });

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: ['production'],
      removedNamespaces: [],
    });

    expect(summary.created).toEqual(['production']);
  });

  it('deletes namespace templates for removed namespaces', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: [],
      removedNamespaces: ['staging'],
    });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      expect.objectContaining({ ignore: [404] })
    );
    expect(summary.removed).toEqual(['staging']);
    expect(summary.created).toEqual([]);
  });

  it('tracks created templates and removes deleted ones from installed_es', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();

    await syncNamespaceTemplates({
      soClient,
      esClient,
      packageName: 'nginx',
      addedNamespaces: ['production'],
      removedNamespaces: ['staging'],
    });

    const updateCalls = mockedUpdateEsAssetReferences.mock.calls;
    const assetsToAddCall = updateCalls.find((c) => c[3]?.assetsToAdd);
    const assetsToRemoveCall = updateCalls.find((c) => c[3]?.assetsToRemove);

    expect(assetsToAddCall?.[3].assetsToAdd).toEqual(
      expect.arrayContaining([
        {
          id: 'logs-nginx.access@namespace.production',
          type: ElasticsearchAssetType.indexTemplate,
        },
      ])
    );
    expect(assetsToRemoveCall?.[3].assetsToRemove).toEqual(
      expect.arrayContaining([
        {
          id: 'logs-nginx.access@namespace.staging',
          type: ElasticsearchAssetType.indexTemplate,
        },
      ])
    );
  });
});
