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
import { getInstalledPackageWithAssets, getInstallation } from '../epm/packages/get';
import { updateEsAssetReferences } from '../epm/packages/es_assets_reference';

import {
  handleNamespaceTemplateDelete,
  handleNamespaceTemplateRestoreAfterPackageInstall,
  handleNamespaceTemplateUpdate,
  insertNamespaceCustomTemplate,
} from './namespace_datastream_templates';

jest.mock('../epm/packages/get');
jest.mock('../epm/elasticsearch/template/template');
jest.mock('../epm/packages/es_assets_reference');
jest.mock('../spaces/helpers', () => ({
  isSpaceAwarenessEnabled: jest.fn().mockResolvedValue(false),
}));
jest.mock('../app_context');

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
    // "logs-nginx.access@custom" contains a hyphen before @custom → not package-level
    const composedOf = ['logs-nginx.access@package', 'logs@custom', 'logs-nginx.access@custom'];
    const result = insertNamespaceCustomTemplate(composedOf, 'staging', 'logs-nginx.access');
    // Should insert before 'logs-nginx.access@custom', after 'logs@custom'
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

function makeEsClientWithTemplate(composedOf: string[]) {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getIndexTemplate.mockResolvedValue({
    index_templates: [
      {
        name: 'logs-nginx.access',
        index_template: {
          composed_of: composedOf,
          index_patterns: ['logs-nginx.access-*'],
          priority: 200,
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

    // By default, soClient.find returns no matching policies (safe to remove)
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

  it('is a no-op when namespace has not changed (empty string == default)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    // Empty string and 'default' are both treated as the default namespace
    const policy = makePackagePolicy({ namespace: '' });
    const oldPolicy = makePackagePolicy({ namespace: 'default' });
    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: policy,
      oldPackagePolicy: oldPolicy,
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('treats empty string namespace as default on policy create', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    // Fleet stores empty string when user selects "default" namespace
    const policy = makePackagePolicy({ namespace: '' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).toContain('default@custom');
  });

  it('inserts namespace@custom on policy create', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ namespace: 'production' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'logs-nginx.access',
        composed_of: [
          'logs-nginx.access@package',
          'logs@custom',
          'nginx@custom',
          'production@custom',
          'logs-nginx.access@custom',
        ],
        ignore_missing_component_templates: [
          'logs@custom',
          'nginx@custom',
          'production@custom',
          'logs-nginx.access@custom',
        ],
      })
    );
  });

  it('swaps old namespace for new namespace when namespace changes', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'production' });
    const oldPolicy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    // No other policies use 'staging', so it's safe to remove
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });

    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: policy,
      oldPackagePolicy: oldPolicy,
    });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).toContain('production@custom');
    expect(call.composed_of).not.toContain('staging@custom');
  });

  it('keeps old namespace if another policy still uses it', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'production' });
    const oldPolicy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    // Another policy (policy-2) also uses 'staging'
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'policy-2',
          attributes: { namespace: 'staging', package: { name: 'nginx' } },
        },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    await handleNamespaceTemplateUpdate({
      soClient,
      esClient,
      packagePolicy: policy,
      oldPackagePolicy: oldPolicy,
    });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).toContain('staging@custom');
    expect(call.composed_of).toContain('production@custom');
  });

  it('does not duplicate namespace entry if already present', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'default@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ namespace: 'default' });
    // No oldPackagePolicy → namespace "undefined" differs from "default", so it runs
    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    const defaultCount = call.composed_of.filter((e: string) => e === 'default@custom').length;
    expect(defaultCount).toBe(1);
  });

  it('updates the Installation saved object with the new namespace ref', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate(['logs-nginx.access@package', 'nginx@custom']);
    const policy = makePackagePolicy({ namespace: 'default' });

    await handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy });

    expect(mockedUpdateEsAssetReferences).toHaveBeenCalledWith(
      soClient,
      'nginx',
      expect.any(Array),
      expect.objectContaining({
        assetsToAdd: [{ id: 'default@custom', type: ElasticsearchAssetType.componentTemplate }],
      })
    );
  });

  it('skips data streams whose index template does not exist in ES', async () => {
    mockInstalledPackage();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('not found'));

    const policy = makePackagePolicy({ namespace: 'default' });
    // Should not throw
    await expect(
      handleNamespaceTemplateUpdate({ soClient, esClient, packagePolicy: policy })
    ).resolves.toBeUndefined();

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(mockedUpdateCurrentWriteIndices).not.toHaveBeenCalled();
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

    // By default no remaining policies — all namespaces are safe to remove
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });
  });

  it('removes namespace@custom from the index template when the last policy for that namespace is deleted', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).not.toContain('staging@custom');
  });

  it('keeps namespace@custom when another policy still uses that namespace', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    // Another policy also uses 'staging'
    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'policy-2', attributes: { namespace: 'staging', package: { name: 'nginx' } } },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('handles deleting multiple policies with different namespaces in one call', async () => {
    mockInstalledPackage();
    const initialComposedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'production@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    // Track latest composed_of so the second getIndexTemplate reflects the first putIndexTemplate
    let currentComposedOf = [...initialComposedOf];
    esClient.indices.getIndexTemplate.mockImplementation(async () => ({
      index_templates: [
        {
          name: 'logs-nginx.access',
          index_template: {
            composed_of: currentComposedOf,
            index_patterns: ['logs-nginx.access-*'],
            priority: 200,
          },
        },
      ],
    }));
    (esClient.indices.putIndexTemplate as unknown as jest.Mock).mockImplementation(
      async (params: any) => {
        currentComposedOf = params.composed_of;
      }
    );

    const policy1 = makePackagePolicy({ id: 'policy-1', namespace: 'production' });
    const policy2 = makePackagePolicy({ id: 'policy-2', namespace: 'staging' });

    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [policy1, policy2],
    });

    // Each namespace triggers one putIndexTemplate call; first removes production, second removes staging
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
    const firstCall = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(firstCall.composed_of).not.toContain('production@custom');
    const secondCall = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[1][0];
    expect(secondCall.composed_of).not.toContain('staging@custom');
    // Verify the cumulative result: the final put should have neither namespace
    expect(secondCall.composed_of).not.toContain('production@custom');
  });

  it('is a no-op when policies have no package', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [{ namespace: 'default', inputs: [] } as any],
    });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('excludes all being-deleted IDs when multiple policies share the same namespace', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    // Two policies both use the same namespace
    const policy1 = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    const policy2 = makePackagePolicy({ id: 'policy-2', namespace: 'staging' });

    // No remaining policies after both are deleted → safe to remove
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10000 });

    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [policy1, policy2],
    });

    // The find query should be called with a filter for the package name (isNamespaceSafeToRemove);
    // we verify the namespace is removed, meaning both IDs were correctly excluded
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).not.toContain('staging@custom');
  });

  it('keeps namespace when a third policy still uses it despite two being deleted', async () => {
    mockInstalledPackage();
    const composedOf = [
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ];
    const esClient = makeEsClientWithTemplate(composedOf);
    const policy1 = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });
    const policy2 = makePackagePolicy({ id: 'policy-2', namespace: 'staging' });

    // A third policy (policy-3) also uses 'staging', so it's not safe to remove
    soClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'policy-3', attributes: { namespace: 'staging', package: { name: 'nginx' } } },
      ],
      total: 1,
      page: 1,
      per_page: 10000,
    } as any);

    await handleNamespaceTemplateDelete({
      soClient,
      esClient,
      packagePolicies: [policy1, policy2],
    });

    // Namespace is still in use by policy-3 → no removal
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('removes namespace@custom from the Installation saved object', async () => {
    mockInstalledPackage();
    const esClient = makeEsClientWithTemplate([
      'logs-nginx.access@package',
      'nginx@custom',
      'staging@custom',
      'logs-nginx.access@custom',
    ]);
    mockedGetInstallation.mockResolvedValue({
      installed_es: [{ id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate }],
    } as any);
    const policy = makePackagePolicy({ id: 'policy-1', namespace: 'staging' });

    await handleNamespaceTemplateDelete({ soClient, esClient, packagePolicies: [policy] });

    expect(mockedUpdateEsAssetReferences).toHaveBeenCalledWith(
      soClient,
      'nginx',
      expect.any(Array),
      expect.objectContaining({
        assetsToRemove: [{ id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate }],
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

  it('re-injects all unique namespace refs when existing policies are found', async () => {
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

    const esClient = makeEsClientWithTemplate([
      'logs-nginx.access@package',
      'logs@custom',
      'nginx@custom',
      'logs-nginx.access@custom',
    ]);

    await handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient,
      esClient,
      packageName: 'nginx',
      dataStreams,
    });

    const call = (esClient.indices.putIndexTemplate as unknown as jest.Mock).mock.calls[0][0];
    expect(call.composed_of).toContain('default@custom');
    expect(call.composed_of).toContain('production@custom');
    // Deduplication: each namespace appears exactly once
    expect(call.composed_of.filter((e: string) => e === 'default@custom').length).toBe(1);
    expect(call.composed_of.filter((e: string) => e === 'production@custom').length).toBe(1);
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

    const esClient = makeEsClientWithTemplate(['logs-nginx.access@package', 'nginx@custom']);

    mockedGetInstallation.mockResolvedValue({
      installed_es: [{ id: 'nginx@custom', type: ElasticsearchAssetType.componentTemplate }],
    } as any);

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
          { id: 'default@custom', type: ElasticsearchAssetType.componentTemplate },
          { id: 'staging@custom', type: ElasticsearchAssetType.componentTemplate },
        ]),
      })
    );
  });
});
