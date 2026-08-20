/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { packagePolicyService, appContextService } from '../..';
import { auditLoggingService } from '../../audit_logging';

import { updateIndexSettings } from '../elasticsearch/index/update_settings';

import {
  deleteESAsset,
  deletePrerequisiteAssets,
  removeInstallation,
  restoreAdoptedStreams,
  cleanupAssets,
  cleanupDependenciesStep,
} from './remove';
import { deleteClaims, findClaimsForPackage } from './dataset_ownership';
import type { DatasetClaimAttributes } from './dataset_ownership';
import { deletePackageKnowledgeBase } from './knowledge_base_index';
import { getInstallation } from './get';

jest.mock('../..', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      }),
      getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
      getSavedObjects: jest.fn().mockReturnValue({
        getUnsafeInternalClient: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue({ saved_objects: [] }),
          delete: jest.fn(),
          bulkDelete: jest.fn(),
        }),
      }),
      getExperimentalFeatures: jest.fn().mockReturnValue({
        enableResolveDependencies: false,
      }),
    },
    packagePolicyService: {
      list: jest.fn().mockImplementation((soClient, params) => {
        if (params.kuery.includes('system'))
          return Promise.resolve({ total: 1, items: [{ id: 'system-1', agents: 1 }] });
        else
          return Promise.resolve({
            total: 2,
            items: [{ id: 'elastic_agent-1' }, { id: 'elastic_agent-2' }],
          });
      }),
      delete: jest.fn(),
    },
  };
});
jest.mock('../../audit_logging');

jest.mock('../../package_policies/populate_package_policy_assigned_agents_count');

jest.mock('./knowledge_base_index', () => ({
  deletePackageKnowledgeBase: jest.fn(),
}));
jest.mock('./get', () => ({
  getPackageInfo: jest.fn().mockResolvedValue({
    name: 'test-package',
    version: '1.0.0',
    conditions: { kibana: { version: '^8.0.0' } },
  }),
  getInstallation: jest.fn(),
}));
jest.mock('../kibana/index_pattern/install', () => ({
  removeUnusedIndexPatterns: jest.fn(),
}));
jest.mock('../archive', () => ({
  deletePackageCache: jest.fn(),
}));
jest.mock('../archive/storage', () => ({
  removeArchiveEntries: jest.fn(),
}));
jest.mock('../elasticsearch/index/update_settings', () => ({
  updateIndexSettings: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./dataset_ownership', () => ({
  findClaimsForPackage: jest.fn().mockResolvedValue([]),
  deleteClaims: jest.fn().mockResolvedValue(undefined),
}));

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockDeletePackageKnowledgeBase = deletePackageKnowledgeBase as jest.MockedFunction<
  typeof deletePackageKnowledgeBase
>;
const mockGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;
const mockGetExperimentalFeatures = appContextService.getExperimentalFeatures as jest.Mock;
const mockedUpdateIndexSettings = updateIndexSettings as jest.MockedFunction<
  typeof updateIndexSettings
>;
const mockedFindClaimsForPackage = findClaimsForPackage as jest.MockedFunction<
  typeof findClaimsForPackage
>;
const mockedDeleteClaims = deleteClaims as jest.MockedFunction<typeof deleteClaims>;

describe('cleanupDependenciesStep', () => {
  let soClientMock: any;
  const esClientMock = {} as any;

  beforeEach(() => {
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;
    mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: true });
    mockGetInstallation.mockReset();
  });

  afterEach(() => {
    mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: false });
  });

  it('returns early when enableResolveDependencies is false', async () => {
    mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: false });
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [{ name: 'dep-a', version: '1.0.0' }],
      installed_kibana: [],
      installed_es: [],
    } as any;

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(mockGetInstallation).not.toHaveBeenCalled();
    expect(soClientMock.update).not.toHaveBeenCalled();
  });

  it('returns early when installation has no dependencies', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [],
      installed_kibana: [],
      installed_es: [],
    } as any;

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(mockGetInstallation).not.toHaveBeenCalled();
  });

  it('returns early when installation.dependencies is undefined', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [],
    } as any;

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(mockGetInstallation).not.toHaveBeenCalled();
  });

  it('skips dependency when getInstallation returns null for that dep', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [{ name: 'dep-a', version: '1.0.0' }],
      installed_kibana: [],
      installed_es: [],
    } as any;
    mockGetInstallation.mockResolvedValue(undefined);

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(soClientMock.update).not.toHaveBeenCalled();
  });

  it('does not remove or update dependency when is_dependency_of is empty (not installed by parent)', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [{ name: 'dep-a', version: '1.0.0' }],
      installed_kibana: [],
      installed_es: [],
    } as any;
    mockGetInstallation.mockImplementation(({ pkgName }: { pkgName: string }) => {
      if (pkgName === 'dep-a') {
        return Promise.resolve({
          name: 'dep-a',
          version: '1.0.0',
          is_dependency_of: [],
          installed_kibana: [],
          installed_es: [],
        } as any);
      }
      return Promise.resolve(undefined);
    });

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(soClientMock.update).not.toHaveBeenCalled();
    expect(soClientMock.delete).not.toHaveBeenCalled();
  });

  it('updates dep is_dependency_of and does not remove when other dependants remain', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [{ name: 'dep-a', version: '1.0.0' }],
      installed_kibana: [],
      installed_es: [],
    } as any;
    mockGetInstallation.mockImplementation(({ pkgName }: { pkgName: string }) => {
      if (pkgName === 'dep-a') {
        return Promise.resolve({
          name: 'dep-a',
          version: '1.0.0',
          is_dependency_of: [
            { name: 'parent', version: '1.0.0' },
            { name: 'other-parent', version: '2.0.0' },
          ],
          installed_kibana: [],
          installed_es: [],
        } as any);
      }
      return Promise.resolve(undefined);
    });

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(soClientMock.update).toHaveBeenCalledTimes(1);
    expect(soClientMock.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'dep-a', {
      is_dependency_of: [{ name: 'other-parent', version: '2.0.0' }],
    });
  });

  it('updates dep is_dependency_of and calls removeInstallation when no other dependants remain', async () => {
    const installation = {
      name: 'parent',
      version: '1.0.0',
      dependencies: [{ name: 'dep-a', version: '1.0.0' }],
      installed_kibana: [],
      installed_es: [],
    } as any;
    mockGetInstallation.mockImplementation(({ pkgName }: { pkgName: string }) => {
      if (pkgName === 'dep-a') {
        return Promise.resolve({
          name: 'dep-a',
          version: '1.0.0',
          is_dependency_of: [{ name: 'parent', version: '1.0.0' }],
          installed_as_dependency: true,
          dependencies: [],
          installed_kibana: [],
          installed_es: [],
          package_assets: [],
        } as any);
      }
      return Promise.resolve(undefined);
    });

    await cleanupDependenciesStep({
      savedObjectsClient: soClientMock,
      pkgName: 'parent',
      installation,
      esClient: esClientMock,
    });

    expect(soClientMock.delete).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'dep-a');
  });
});

describe('removeInstallation', () => {
  let soClientMock: any;
  const esClientMock = {} as any;
  beforeEach(() => {
    jest.clearAllMocks();
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;

    mockGetInstallation.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [],
      package_assets: [],
    } as any);
  });
  it('should remove package policies when force', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });
    expect(mockPackagePolicyService.delete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['system-1'],
      { force: true }
    );
  });

  it('should throw when trying to remove package with package policies when not force', async () => {
    await expect(
      removeInstallation({
        savedObjectsClient: soClientMock,
        pkgName: 'system',
        pkgVersion: '1.0.0',
        esClient: esClientMock,
        force: false,
      })
    ).rejects.toThrowError(
      `Unable to remove package system:1.0.0 with existing package policy(s) in use by agent(s)`
    );
  });

  it('should remove package policies when not used by agents', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'elastic_agent',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: false,
    });
    expect(mockPackagePolicyService.delete).toHaveBeenCalled();
  });

  it('should call audit logger', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'delete',
      id: 'system',
      name: 'system',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  });

  it('should delete knowledge base content when removing package', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });

    expect(mockDeletePackageKnowledgeBase).toHaveBeenCalledWith(esClientMock, 'test-package');
  });
});

describe('deleteESAsset', () => {
  it('should not delete @custom components template', async () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    await deleteESAsset(
      {
        id: 'logs@custom',
        type: ElasticsearchAssetType.componentTemplate,
      },
      esClient
    );

    expect(esClient.cluster.deleteComponentTemplate).not.toBeCalled();
  });

  it('should delete @package components template', async () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    await deleteESAsset(
      {
        id: 'logs-nginx.access@package',
        type: ElasticsearchAssetType.componentTemplate,
      },
      esClient
    );

    expect(esClient.cluster.deleteComponentTemplate).toBeCalledWith(
      { name: 'logs-nginx.access@package' },
      expect.anything()
    );
  });

  it('should delete esql views', async () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    await deleteESAsset(
      {
        id: 'view-1',
        type: ElasticsearchAssetType.esqlView,
      },
      esClient
    );

    expect(esClient.transport.request).toBeCalledWith(
      { method: 'DELETE', path: '/_query/view/view-1' },
      { ignore: [404, 400] }
    );
  });
});

describe('cleanupAssets', () => {
  let soClientMock: any;
  const esClientMock = {} as any;
  beforeEach(() => {
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      update: jest.fn().mockImplementation(async (type, id, data) => {
        return {
          id,
          type,
          attributes: {},
          references: [],
        };
      }),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;
  });

  it('should remove assets marked for deletion', async () => {
    const installation = {
      name: 'test',
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
          id: 'logs-udp.generic',
          type: 'index_template',
        },
        {
          id: 'logs-udp.generic@package',
          type: 'component_template',
        },
      ],
      es_index_patterns: {
        generic: 'logs-generic-*',
        'udp.generic': 'logs-udp.generic-*',
        'udp.test': 'logs-udp.test-*',
      },
    } as any;
    const installationToDelete = {
      name: 'test',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [
        {
          id: 'logs-udp.generic',
          type: 'index_template',
        },
        {
          id: 'logs-udp.generic@package',
          type: 'component_template',
        },
      ],
    } as any;
    await cleanupAssets('generic', installationToDelete, installation, esClientMock, soClientMock);

    expect(soClientMock.update).toBeCalledWith('epm-packages', 'test', {
      installed_es: [
        {
          id: 'logs@custom',
          type: 'component_template',
        },
        {
          id: 'udp@custom',
          type: 'component_template',
        },
      ],
      installed_kibana: [],
      es_index_patterns: {
        'udp.generic': 'logs-udp.generic-*',
        'udp.test': 'logs-udp.test-*',
      },
    });
  });
});

const assetsWithBoth = {
  indexAssets: [] as Array<{ id: string; type: ElasticsearchAssetType }>,
  transformAssets: [] as Array<{ id: string; type: ElasticsearchAssetType }>,
  // Pipeline first so a concurrent delete of the mixed list cannot accidentally match the required
  // template-then-pipeline order.
  indexTemplatesAndPipelines: [
    { id: 'logs-payroll.records-1.0.0', type: ElasticsearchAssetType.ingestPipeline },
    { id: 'logs-payroll.records', type: ElasticsearchAssetType.indexTemplate },
  ],
};

const assetsWithIndexAsset = {
  indexAssets: [{ id: 'metrics-endpoint.metadata', type: ElasticsearchAssetType.index }],
  transformAssets: [] as Array<{ id: string; type: ElasticsearchAssetType }>,
  indexTemplatesAndPipelines: [] as Array<{ id: string; type: ElasticsearchAssetType }>,
};

describe('deletePrerequisiteAssets ordering', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createInternalClient();
  });

  it('deletes index templates before ingest pipelines', async () => {
    const order: string[] = [];
    esClient.indices.deleteIndexTemplate.mockImplementation(async () => {
      order.push('template');
      return {} as never;
    });
    esClient.ingest.deletePipeline.mockImplementation(async () => {
      order.push('pipeline');
      return {} as never;
    });

    await deletePrerequisiteAssets(assetsWithBoth, esClient);

    expect(order).toEqual(['template', 'pipeline']);
  });

  it('runs the hook between templates and pipelines', async () => {
    const order: string[] = [];
    esClient.indices.deleteIndexTemplate.mockImplementation(async () => {
      order.push('template');
      return {} as never;
    });
    esClient.ingest.deletePipeline.mockImplementation(async () => {
      order.push('pipeline');
      return {} as never;
    });

    await deletePrerequisiteAssets(assetsWithBoth, esClient, {
      onTemplatesDeleted: async () => {
        order.push('restore');
      },
    });

    expect(order).toEqual(['template', 'restore', 'pipeline']);
  });

  it('does not delete pipelines when the hook fails', async () => {
    await expect(
      deletePrerequisiteAssets(assetsWithBoth, esClient, {
        onTemplatesDeleted: async () => {
          throw new Error('boom');
        },
      })
    ).rejects.toThrow(/boom/);

    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  it('still tolerates missing assets when no hook is supplied, for retry cleanup', async () => {
    esClient.indices.deleteIndexTemplate.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(deletePrerequisiteAssets(assetsWithBoth, esClient)).resolves.toBeUndefined();
  });

  it('propagates non-404 template deletion errors when the uninstall hook is supplied', async () => {
    esClient.indices.deleteIndexTemplate.mockRejectedValue({ meta: { statusCode: 500 } });

    await expect(
      deletePrerequisiteAssets(assetsWithBoth, esClient, {
        onTemplatesDeleted: async () => undefined,
      })
    ).rejects.toThrow(/Error deleting index template/);

    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  it('still swallows non-404 template deletion errors when no hook is supplied', async () => {
    esClient.indices.deleteIndexTemplate.mockRejectedValue({ meta: { statusCode: 500 } });

    await expect(deletePrerequisiteAssets(assetsWithBoth, esClient)).resolves.toBeUndefined();
  });

  it('still clears default_pipeline on tracked index assets', async () => {
    await deletePrerequisiteAssets(assetsWithIndexAsset, esClient);

    expect(mockedUpdateIndexSettings).toHaveBeenCalledWith(esClient, 'metrics-endpoint.metadata', {
      default_pipeline: '',
    });
  });
});

describe('restoreAdoptedStreams', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;
  const soClient = {} as never;

  const claim = (
    overrides: Partial<DatasetClaimAttributes> = {}
  ): { id: string; attributes: DatasetClaimAttributes } => ({
    id: 'logs-payroll.records',
    attributes: {
      package_name: 'evil',
      status: 'active',
      origin: 'adoption',
      attempt_id: 'attempt-1',
      index_patterns: ['logs-payroll.records-*'],
      adopted_streams: [
        { name: 'logs-payroll.records-teamb', previous_default_pipeline: 'logs@default-pipeline' },
      ],
      ...overrides,
    },
  });

  const stream = (name = 'logs-payroll.records-teamb') => ({
    name,
    indices: [{ index_name: '.ds-x' }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createInternalClient();
  });

  it('restores the recorded baseline for an adopted stream', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([claim()]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'logs-payroll.records-teamb',
      settings: { default_pipeline: 'logs@default-pipeline' },
    });
  });

  it('clears the pipeline when the recorded baseline had none', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([
      claim({ adopted_streams: [{ name: 'logs-payroll.records-teamb' }] }),
    ]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'logs-payroll.records-teamb',
      settings: { default_pipeline: '' },
    });
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
  });

  it('falls back to the next governing template for a stream with no record', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([claim({ adopted_streams: [] })]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      template: { settings: { index: { default_pipeline: 'logs@default-pipeline' } } },
    } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
    });

    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'logs-payroll.records-teamb',
    });
    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'logs-payroll.records-teamb',
      settings: { default_pipeline: 'logs@default-pipeline' },
    });
  });

  it('leaves a stream pointing at someone else pipeline untouched', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([claim()]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'someone-else' } } },
    } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
    });

    expect(esClient.indices.putSettings).not.toHaveBeenCalled();
  });

  it('enumerates a dataset_is_prefix pattern from the claim', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([
      claim({ index_patterns: ['logs-foo.*-*'], adopted_streams: [] }),
    ]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(),
    });

    expect(esClient.indices.getDataStream).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'logs-foo.*-*' })
    );
  });

  it('propagates a failed settings write instead of swallowing it', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([claim()]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);
    esClient.indices.putSettings.mockRejectedValue(new Error('boom'));

    await expect(
      restoreAdoptedStreams({
        esClient,
        soClient,
        packageName: 'evil',
        packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
      })
    ).rejects.toThrow(/boom/);
  });

  it('treats a 404 from getDataStream as nothing to restore', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([claim()]);
    esClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(
      restoreAdoptedStreams({
        esClient,
        soClient,
        packageName: 'evil',
        packagePipelineIds: new Set(),
      })
    ).resolves.toBeUndefined();
  });

  it('restores streams from fallback index patterns when the package has no claims', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([]);
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [stream()] } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      template: { settings: { index: { default_pipeline: 'logs@default-pipeline' } } },
    } as never);

    await restoreAdoptedStreams({
      esClient,
      soClient,
      packageName: 'evil',
      packagePipelineIds: new Set(['logs-payroll.records-1.0.0']),
      fallbackIndexPatterns: ['logs-payroll.records-*'],
    });

    expect(esClient.indices.getDataStream).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'logs-payroll.records-*' })
    );
    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'logs-payroll.records-teamb',
      settings: { default_pipeline: 'logs@default-pipeline' },
    });
  });
});

describe('removeInstallation claim release', () => {
  let soClientMock: any;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  const removeArgs = () => ({
    savedObjectsClient: soClientMock,
    pkgName: 'test-package',
    pkgVersion: '1.0.0',
    esClient,
    force: true,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createInternalClient();
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;
    mockGetInstallation.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      installed_kibana: [],
      installed_es: [
        { id: 'logs-payroll.records', type: ElasticsearchAssetType.indexTemplate },
        { id: 'logs-payroll.records-1.0.0', type: ElasticsearchAssetType.ingestPipeline },
      ],
      package_assets: [],
    } as never);
    mockedFindClaimsForPackage.mockResolvedValue([
      {
        id: 'logs-payroll.records',
        attributes: {
          package_name: 'test-package',
          status: 'active',
          origin: 'install',
          attempt_id: 'attempt-1',
          index_patterns: ['logs-payroll.records-*'],
        },
      },
    ]);
  });

  it('releases the package claims after assets are deleted', async () => {
    const order: string[] = [];
    esClient.indices.deleteIndexTemplate.mockImplementation(async () => {
      order.push('deleteAssets');
      return {} as never;
    });
    mockedDeleteClaims.mockImplementation(async () => {
      order.push('deleteClaims');
    });
    esClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 404 } });

    await removeInstallation(removeArgs());

    expect(order).toEqual(['deleteAssets', 'deleteClaims']);
  });

  it('does not release claims when asset deletion failed', async () => {
    mockedFindClaimsForPackage.mockResolvedValue([
      {
        id: 'logs-payroll.records',
        attributes: {
          package_name: 'test-package',
          status: 'active',
          origin: 'adoption',
          attempt_id: 'attempt-1',
          index_patterns: ['logs-payroll.records-*'],
          adopted_streams: [
            {
              name: 'logs-payroll.records-teamb',
              previous_default_pipeline: 'logs@default-pipeline',
            },
          ],
        },
      },
    ]);
    esClient.indices.getDataStream.mockResolvedValue({
      data_streams: [{ name: 'logs-payroll.records-teamb', indices: [{ index_name: '.ds-x' }] }],
    } as never);
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-x': { settings: { index: { default_pipeline: 'logs-payroll.records-1.0.0' } } },
    } as never);
    esClient.indices.putSettings.mockRejectedValue(new Error('boom'));

    await expect(removeInstallation(removeArgs())).rejects.toThrow();
    expect(mockedDeleteClaims).not.toHaveBeenCalled();
  });

  it('does not release claims during input package cleanup', async () => {
    await cleanupAssets(
      'logs-x',
      {
        name: 'test-package',
        version: '1.0.0',
        installed_kibana: [],
        installed_es: [],
      } as never,
      {
        name: 'test-package',
        version: '1.0.0',
        installed_kibana: [],
        installed_es: [],
        es_index_patterns: {},
      } as never,
      esClient,
      soClientMock as never
    );

    expect(mockedDeleteClaims).not.toHaveBeenCalled();
  });
});
