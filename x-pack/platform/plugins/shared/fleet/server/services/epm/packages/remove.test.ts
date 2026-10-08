/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { packagePolicyService, appContextService } from '../..';
import { auditLoggingService } from '../../audit_logging';
import { FleetUnauthorizedError } from '../../../errors';

import {
  deleteESAsset,
  removeInstallation,
  cleanupAssets,
  cleanupDependenciesStep,
} from './remove';
import { assertUninstallAuthorizedForAffectedSpaces } from './uninstall_authz';
import { deletePackageKnowledgeBase } from './knowledge_base_index';
import { getInstallation } from './get';

// These are defined outside jest.mock to be mutated by tests.
// Note: jest.mock is hoisted, so we use a module-level object that the factory closure can close over.
const mockFns = {
  checkPrivilegesAtSpaces: jest.fn().mockResolvedValue({ hasAllRequested: true }),
  useRbacForRequest: jest.fn().mockReturnValue(true),
};

jest.mock('../..', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      getInternalUserSOClientWithoutSpaceExtension: jest.fn().mockReturnValue({}),
      getExperimentalFeatures: jest.fn().mockReturnValue({
        enableResolveDependencies: false,
      }),
      getSecurity: jest.fn().mockReturnValue({
        authz: {
          mode: {
            useRbacForRequest: (...args: any[]) => mockFns.useRbacForRequest(...args),
          },
          actions: {
            api: {
              get: (name: string) => `api:${name}`,
            },
          },
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({
            atSpaces: (...args: any[]) => mockFns.checkPrivilegesAtSpaces(...args),
          }),
        },
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

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockDeletePackageKnowledgeBase = deletePackageKnowledgeBase as jest.MockedFunction<
  typeof deletePackageKnowledgeBase
>;
const mockGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;
const mockGetExperimentalFeatures = appContextService.getExperimentalFeatures as jest.Mock;

describe('assertUninstallAuthorizedForAffectedSpaces', () => {
  const mockRequest = {} as KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFns.useRbacForRequest.mockReturnValue(true);
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: true });
    // Re-wire after clearAllMocks: checkPrivilegesWithRequest must return the closure again
    (appContextService.getSecurity as jest.Mock).mockReturnValue({
      authz: {
        mode: {
          useRbacForRequest: (...args: any[]) => mockFns.useRbacForRequest(...args),
        },
        actions: {
          api: {
            get: (name: string) => `api:${name}`,
          },
        },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({
          atSpaces: (...args: any[]) => mockFns.checkPrivilegesAtSpaces(...args),
        }),
      },
    });
  });

  it('returns without error when security is unavailable', async () => {
    (appContextService.getSecurity as jest.Mock).mockReturnValue(undefined);

    await expect(
      assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: {
          name: 'nginx',
          installed_kibana_space_id: 'default',
        } as any,
        packagePolicies: [],
        savedObjectsClient: {} as any,
      })
    ).resolves.toBeUndefined();
  });

  it('returns without error when RBAC is not used for request', async () => {
    mockFns.useRbacForRequest.mockReturnValue(false);

    await expect(
      assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: {
          name: 'nginx',
          installed_kibana_space_id: 'default',
        } as any,
        packagePolicies: [],
        savedObjectsClient: {} as any,
      })
    ).resolves.toBeUndefined();

    expect(mockFns.checkPrivilegesAtSpaces).not.toHaveBeenCalled();
  });

  it('collects space IDs from package policies, installed_kibana_space_id, and additional_spaces', async () => {
    const installation = {
      name: 'nginx',
      installed_kibana_space_id: 'default',
      additional_spaces_installed_kibana: {
        space2: [],
      },
    } as any;
    const packagePolicies = [
      { id: 'policy-1', spaceIds: ['space3'] },
      { id: 'policy-2', spaceIds: ['default', 'space3'] },
    ] as any;

    await assertUninstallAuthorizedForAffectedSpaces({
      request: mockRequest,
      pkgName: 'nginx',
      installation,
      packagePolicies,
      savedObjectsClient: {} as any,
    });

    expect(mockFns.checkPrivilegesAtSpaces).toHaveBeenCalledWith(
      expect.arrayContaining(['default', 'space2', 'space3']),
      expect.anything()
    );
    // Ensure no duplicate entries
    const calledSpaces = mockFns.checkPrivilegesAtSpaces.mock.calls[0][0];
    expect(calledSpaces.length).toBe(new Set(calledSpaces).size);
  });

  it('throws FleetUnauthorizedError when hasAllRequested is false', async () => {
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: {
          name: 'nginx',
          installed_kibana_space_id: 'default',
        } as any,
        packagePolicies: [{ id: 'policy-1', spaceIds: ['other-space'] }] as any,
        savedObjectsClient: {} as any,
      })
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('does not include space names in the error message', async () => {
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: {
          name: 'nginx',
          installed_kibana_space_id: 'default',
        } as any,
        packagePolicies: [{ id: 'policy-1', spaceIds: ['secret-space'] }] as any,
        savedObjectsClient: {} as any,
      })
    ).rejects.toThrow(
      'Insufficient privileges to uninstall package nginx: it is used in spaces you are not authorized to access'
    );
  });
});

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
    mockFns.useRbacForRequest.mockReturnValue(true);
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: true });
    // Re-wire after clearAllMocks: checkPrivilegesWithRequest must return the closure again
    (appContextService.getSecurity as jest.Mock).mockReturnValue({
      authz: {
        mode: {
          useRbacForRequest: (...args: any[]) => mockFns.useRbacForRequest(...args),
        },
        actions: {
          api: {
            get: (name: string) => `api:${name}`,
          },
        },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({
          atSpaces: (...args: any[]) => mockFns.checkPrivilegesAtSpaces(...args),
        }),
      },
    });
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
    ).rejects.toThrow(
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

  it('should work without request (no privilege check)', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'elastic_agent',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: false,
    });
    // getSecurity should not be called when no request is provided
    expect(appContextService.getSecurity).not.toHaveBeenCalled();
    expect(mockPackagePolicyService.delete).toHaveBeenCalled();
  });

  it('should throw FleetUnauthorizedError when request is provided but privileges are insufficient', async () => {
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: false });
    const mockRequest = {} as KibanaRequest;

    await expect(
      removeInstallation({
        savedObjectsClient: soClientMock,
        pkgName: 'elastic_agent',
        pkgVersion: '1.0.0',
        esClient: esClientMock,
        force: false,
        request: mockRequest,
      })
    ).rejects.toThrow(FleetUnauthorizedError);

    expect(mockPackagePolicyService.delete).not.toHaveBeenCalled();
  });

  it('should proceed normally when request is provided and privileges are sufficient', async () => {
    mockFns.checkPrivilegesAtSpaces.mockResolvedValue({ hasAllRequested: true });
    const mockRequest = {} as KibanaRequest;

    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'elastic_agent',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: false,
      request: mockRequest,
    });

    expect(mockPackagePolicyService.delete).toHaveBeenCalled();
  });

  it('should throw when request is provided and total exceeds items returned (truncated result)', async () => {
    // Simulate SO_SEARCH_LIMIT truncation: total > items.length
    mockPackagePolicyService.list.mockResolvedValueOnce({
      total: 999,
      items: [{ id: 'elastic_agent-1' } as any, { id: 'elastic_agent-2' } as any],
      page: 1,
      perPage: 10000,
    });
    const mockRequest = {} as KibanaRequest;

    await expect(
      removeInstallation({
        savedObjectsClient: soClientMock,
        pkgName: 'elastic_agent',
        pkgVersion: '1.0.0',
        esClient: esClientMock,
        force: false,
        request: mockRequest,
      })
    ).rejects.toThrow(/too many package policies to enumerate/);

    // Nothing should be deleted when the result is truncated
    expect(mockPackagePolicyService.delete).not.toHaveBeenCalled();
  });

  it('should not fail-closed on truncated results when no request is provided', async () => {
    // Without request there is no authz check, so truncation is irrelevant — behaves as today
    mockPackagePolicyService.list.mockResolvedValueOnce({
      total: 999,
      items: [{ id: 'elastic_agent-1' } as any, { id: 'elastic_agent-2' } as any],
      page: 1,
      perPage: 10000,
    });

    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'elastic_agent',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: false,
    });

    expect(mockPackagePolicyService.delete).toHaveBeenCalled();
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

    expect(esClient.cluster.deleteComponentTemplate).not.toHaveBeenCalled();
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

    expect(esClient.cluster.deleteComponentTemplate).toHaveBeenCalledWith(
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

    expect(esClient.transport.request).toHaveBeenCalledWith(
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

    expect(soClientMock.update).toHaveBeenCalledWith('epm-packages', 'test', {
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
