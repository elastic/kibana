/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { PackagePolicy } from '../../types';
import { ElasticsearchAssetType } from '../../../common/types';
import { appContextService } from '../app_context';
import { updateCurrentWriteIndices } from '../epm/elasticsearch/template/template';
import {
  getInstalledPackageWithAssets,
  getInstallation,
  getPackageSavedObjects,
} from '../epm/packages/get';
import { updateEsAssetReferences } from '../epm/packages/es_assets_reference';
import { isNamespaceIndexTemplateEnabled } from '../spaces/space_settings';

import {
  handleNamespaceTemplateDelete,
  handleNamespaceTemplateRestoreAfterPackageInstall,
  handleNamespaceTemplateUpdate,
  handleOldNamespaceTemplateCleanup,
  insertNamespaceCustomTemplate,
  syncNamespaceTemplates,
} from './namespace_datastream_templates';

jest.mock('../epm/packages/get');
jest.mock('../epm/elasticsearch/template/template', () => {
  const actual = jest.requireActual('../epm/elasticsearch/template/template');
  return {
    ...actual,
    updateCurrentWriteIndices: jest.fn(),
  };
});
jest.mock('../epm/packages/es_assets_reference');
jest.mock('../spaces/helpers', () => ({
  isSpaceAwarenessEnabled: jest.fn().mockResolvedValue(false),
}));
jest.mock('../spaces/space_settings', () => ({
  isNamespaceIndexTemplateEnabled: jest.fn().mockResolvedValue(true),
}));
jest.mock('../app_context');

const mockedIsNamespaceIndexTemplateEnabled =
  isNamespaceIndexTemplateEnabled as jest.MockedFunction<typeof isNamespaceIndexTemplateEnabled>;

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
const mockedGetPackageSavedObjects = getPackageSavedObjects as jest.MockedFunction<
  typeof getPackageSavedObjects
>;
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
// handleNamespaceTemplateUpdate — integration-style unit tests
// ---------------------------------------------------------------------------

function makePackagePolicy(overrides: Partial<PackagePolicy> = {}): PackagePolicy {
  return {
    id: 'policy-1',
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['agent-policy-1'],
    package: { name: 'nginx', title: 'Nginx', version: '1.0.0' },
    inputs: [],
    revision: 1,
    updated_at: '',
    updated_by: '',
    created_at: '',
    created_by: '',
    ...overrides,
  } as unknown as PackagePolicy;
}

function mockInstalledPackage(
  dataStreams: Array<{ dataset: string; type: string }> = [
    { dataset: 'nginx.access', type: 'logs' },
  ],
  installedEs: Array<{ id: string; type: ElasticsearchAssetType }> = []
) {
  mockedGetInstalledPackageWithAssets.mockResolvedValue({
    packageInfo: {
      name: 'nginx',
      data_streams: dataStreams,
    },
    installation: {
      installed_es: installedEs,
    },
  } as any);
}

const BASE_COMPOSED_OF = [
  'logs-nginx.access@package',
  'logs@custom',
  'nginx@custom',
  'logs-nginx.access@custom',
];

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

describe('handleNamespaceTemplateUpdate', () => {
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
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(true);

    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });
  });

  it('is a no-op when package is absent', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: { namespace: 'default', inputs: [] } as any,
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when namespace has not changed (explicit default)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy = makePackagePolicy({ namespace: 'default' });
    const oldPolicy = makePackagePolicy({ namespace: 'default' });
    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: policy,
      oldPackagePolicy: oldPolicy,
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when namespace is not opted in', async () => {
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(false);
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    const policy = makePackagePolicy({ namespace: 'production' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('creates a namespace-scoped index template on policy create', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    const policy = makePackagePolicy({ namespace: 'production' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'logs-nginx.access@namespace.production',
        index_patterns: ['logs-nginx.access-production*'],
        priority: 250,
        composed_of: expect.arrayContaining(['production@custom']),
      })
    );
  });

  it('does not modify the base template', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    const policy = makePackagePolicy({ namespace: 'production' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    // putIndexTemplate should only be called with the namespace template name
    const calls = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].name).toBe('logs-nginx.access@namespace.production');
  });

  it('creates new namespace template on namespace change, without deleting old (deletion is deferred)', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'production' });
    const oldPolicy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: policy,
      oldPackagePolicy: oldPolicy,
    });

    // Should create the new namespace template
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'logs-nginx.access@namespace.production' })
    );

    // Should NOT delete the old namespace template — that is handled by
    // handleOldNamespaceTemplateCleanup after the SO save
    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('tracks namespace template refs in the Installation SO', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();
    const policy = makePackagePolicy({ namespace: 'production' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

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

  it('skips data streams whose index template does not exist in ES', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getIndexTemplate.mockRejectedValue({ meta: { statusCode: 404 } });

    const policy = makePackagePolicy({ namespace: 'production' });
    await expect(
      handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy })
    ).resolves.toBeUndefined();

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(mockedUpdateCurrentWriteIndices).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleOldNamespaceTemplateCleanup — post-SO-save old namespace deletion
// ---------------------------------------------------------------------------

describe('handleOldNamespaceTemplateCleanup', () => {
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
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(true);

    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });
  });

  it('deletes the old namespace template when no other policy uses that namespace', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await handleOldNamespaceTemplateCleanup({
      soClient,
      esClient,
      packageName: 'nginx',
      oldNamespace: 'staging',
    });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );
  });

  it('is a no-op when another policy still uses the old namespace', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'policy-2', attributes: { namespace: 'staging', package: { name: 'nginx' } } },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    await handleOldNamespaceTemplateCleanup({
      soClient,
      esClient,
      packageName: 'nginx',
      oldNamespace: 'staging',
    });

    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when the old namespace is not opted in', async () => {
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(false);
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await handleOldNamespaceTemplateCleanup({
      soClient,
      esClient,
      packageName: 'nginx',
      oldNamespace: 'staging',
    });

    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('removes old namespace refs from the Installation SO', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    mockedGetInstallation.mockResolvedValue({
      installed_es: [
        {
          id: 'logs-nginx.access@namespace.staging',
          type: ElasticsearchAssetType.indexTemplate,
        },
      ],
    } as any);

    await handleOldNamespaceTemplateCleanup({
      soClient,
      esClient,
      packageName: 'nginx',
      oldNamespace: 'staging',
    });

    expect(mockedUpdateEsAssetReferences).toHaveBeenCalledWith(
      soClient,
      'nginx',
      expect.any(Array),
      expect.objectContaining({
        assetsToRemove: expect.arrayContaining([
          {
            id: 'logs-nginx.access@namespace.staging',
            type: ElasticsearchAssetType.indexTemplate,
          },
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// handleNamespaceTemplateDelete
// ---------------------------------------------------------------------------

describe('handleNamespaceTemplateDelete', () => {
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
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(true);

    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });
  });

  it('deletes the namespace index template when the last policy for that namespace is deleted', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );
  });

  it('keeps namespace template when another policy still uses that namespace', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'policy-2', attributes: { namespace: 'staging', package: { name: 'nginx' } } },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('handles deleting multiple policies with different namespaces', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy1 = makePackagePolicy({ id: 'policy-1', namespace: 'production' });
    const policy2 = makePackagePolicy({ id: 'policy-2', namespace: 'staging' });

    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [policy1, policy2],
    });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.production' },
      { ignore: [404] }
    );
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );
  });

  it('excludes all being-deleted IDs when multiple policies share the same namespace', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy1 = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    const policy2 = makePackagePolicy({ id: 'policy-2', namespace: 'staging' });

    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });

    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [policy1, policy2],
    });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );
  });

  it('is a no-op when policies have no package', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [{ namespace: 'default', inputs: [] } as any],
    });
    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when namespace is not opted in', async () => {
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(false);
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('removes namespace refs from the Installation saved object', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    mockedGetInstallation.mockResolvedValue({
      installed_es: [
        {
          id: 'logs-nginx.access@namespace.staging',
          type: ElasticsearchAssetType.indexTemplate,
        },
        { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
      ],
    } as any);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(mockedUpdateEsAssetReferences).toHaveBeenCalledWith(
      soClient,
      'nginx',
      expect.any(Array),
      expect.objectContaining({
        assetsToRemove: expect.arrayContaining([
          {
            id: 'logs-nginx.access@namespace.staging',
            type: ElasticsearchAssetType.indexTemplate,
          },
          { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// handleNamespaceTemplateRestoreAfterPackageInstall — post-reinstall restore
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
    mockedGetInstallation.mockResolvedValue({ installed_es: [] } as any);
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(true);
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
    expect(soClient.find).not.toHaveBeenCalled();
  });

  it('is a no-op when there are no existing policies', async () => {
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when namespaces are not opted in', async () => {
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(false);
    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'p1', attributes: { namespace: 'default' } }],
      total: 1,
      page: 1,
      per_page: 10000,
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

  it('rebuilds namespace templates for all opted-in namespaces', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'p1', attributes: { namespace: 'default' } },
        { id: 'p2', attributes: { namespace: 'production' } },
        { id: 'p3', attributes: { namespace: 'default' } }, // duplicate — should be deduped
      ],
      total: 3,
      page: 1,
      per_page: 10000,
    } as any);

    const esClient = makeEsClientWithTemplate();

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    const putCalls = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls;
    const templateNames = putCalls.map((c: any) => c[0].name);
    expect(templateNames).toContain('logs-nginx.access@namespace.default');
    expect(templateNames).toContain('logs-nginx.access@namespace.production');
    expect(putCalls).toHaveLength(2); // deduped
  });

  it('updates installed_es with all restored namespace refs', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'p1', attributes: { namespace: 'default' } },
        { id: 'p2', attributes: { namespace: 'staging' } },
      ],
      total: 2,
      page: 1,
      per_page: 10000,
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
            id: 'logs-nginx.access@namespace.default',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-nginx.access@namespace.staging',
            type: ElasticsearchAssetType.indexTemplate,
          },
        ]),
      })
    );
  });

  it('cleans up stale namespace templates for namespaces no longer opted in', async () => {
    // One opted-in namespace, but installed_es has refs for a stale namespace
    mockedIsNamespaceIndexTemplateEnabled.mockImplementation(
      async (ns: string) => ns === 'default'
    );

    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'p1', attributes: { namespace: 'default' } }],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    const esClient = makeEsClientWithTemplate();

    // installed_es contains a stale ref for 'staging' which is no longer opted in
    mockedGetInstallation.mockResolvedValue({
      installed_es: [
        {
          id: 'logs-nginx.access@namespace.staging',
          type: ElasticsearchAssetType.indexTemplate,
        },
        { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
      ],
    } as any);

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    // Should delete the stale staging namespace template
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );

    // Should remove stale refs from installed_es (second updateEsAssetReferences call)
    const updateCalls = mockedUpdateEsAssetReferences.mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1];
    expect(lastCall[3]).toEqual(
      expect.objectContaining({
        assetsToRemove: expect.arrayContaining([
          {
            id: 'logs-nginx.access@namespace.staging',
            type: ElasticsearchAssetType.indexTemplate,
          },
          { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// syncNamespaceTemplates — bulk create/remove on settings change
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
    mockedIsNamespaceIndexTemplateEnabled.mockResolvedValue(true);
  });

  it('creates namespace templates for added namespaces', async () => {
    // Package policies query returns a policy using 'production'
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'policy-1',
          attributes: { namespace: 'production', package: { name: 'nginx' } },
        },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      addedNamespaces: ['production'],
      removedNamespaces: [],
    });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'logs-nginx.access@namespace.production',
        priority: 250,
      }),
      expect.any(Object)
    );
    expect(summary.created).toEqual({ production: ['nginx'] });
    expect(summary.removed).toEqual({});
  });

  it('removes namespace templates for removed namespaces', async () => {
    // getPackageSavedObjects returns a package with namespace template refs
    mockedGetPackageSavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'nginx',
          attributes: {
            name: 'nginx',
            installed_es: [
              {
                id: 'logs-nginx.access@namespace.staging',
                type: ElasticsearchAssetType.indexTemplate,
              },
              { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
            ],
          },
        },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      addedNamespaces: [],
      removedNamespaces: ['staging'],
    });

    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'logs-nginx.access@namespace.staging' },
      { ignore: [404] }
    );
    expect(summary.removed).toEqual({ staging: ['nginx'] });
    expect(summary.created).toEqual({});
  });

  it('is a no-op when there are no policies for the added namespace', async () => {
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });

    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      addedNamespaces: ['production'],
      removedNamespaces: [],
    });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(summary.created).toEqual({});
  });

  it('is a no-op for removal when no packages have namespace templates for the namespace', async () => {
    mockedGetPackageSavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'nginx',
          attributes: {
            name: 'nginx',
            installed_es: [],
          },
        },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const summary = await syncNamespaceTemplates({
      soClient,
      esClient,
      addedNamespaces: [],
      removedNamespaces: ['staging'],
    });

    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
    expect(summary.removed).toEqual({});
  });
});
