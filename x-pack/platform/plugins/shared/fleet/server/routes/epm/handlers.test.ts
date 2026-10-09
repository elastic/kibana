/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyNamespaceValidationError } from '../../../common/errors';
import { FleetUnauthorizedError } from '../../errors';
import { appContextService, licenseService } from '../../services';
import { getInstallation, getPackages } from '../../services/epm/packages/get';
import { updatePackage } from '../../services/epm/packages/update';
import { getPackagePoliciesCountByPackageName } from '../../services/package_policies/package_policies_aggregation';
import {
  getAllowedNamespacePrefixesForSpace,
  isNamespaceAllowedByPrefixes,
} from '../../services/spaces/policy_namespaces';

import { getListHandler, rollbackPackageHandler, updatePackageHandler } from './handlers';

const mockGlobalSoClient = { find: jest.fn() };

jest.mock('../../services', () => {
  return {
    licenseService: {
      isEnterprise: jest.fn(),
    },
    appContextService: {
      getTaskManagerStart: jest.fn().mockReturnValue({}),
      getIsFipsEnabled: jest.fn().mockReturnValue(false),
      getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
    },
  };
});

jest.mock('../../services/package_policies/package_policies_aggregation', () => ({
  getPackagePoliciesCountByPackageName: jest.fn(),
}));

jest.mock('../../services/epm/packages/rollback', () => {
  return {
    rollbackInstallation: jest.fn(),
  };
});

jest.mock('../../services/epm/packages/get', () => {
  return {
    getInstallation: jest.fn(),
    getPackages: jest.fn(),
  };
});

jest.mock('../../services/epm/packages/update', () => {
  return {
    updatePackage: jest.fn(),
  };
});

jest.mock('../../tasks/sync_namespace_templates_task', () => {
  return {
    scheduleSyncNamespaceTemplatesTask: jest.fn(),
  };
});

jest.mock('../../tasks/sync_ilm_policy_task', () => {
  return {
    scheduleSyncIlmPolicyTask: jest.fn(),
  };
});

jest.mock('../../services/spaces/policy_namespaces', () => {
  return {
    getAllowedNamespacePrefixesForSpace: jest.fn(),
    isNamespaceAllowedByPrefixes: jest.fn().mockReturnValue(true),
  };
});

jest.mock('./bulk_handler', () => {
  return {
    getPackagePolicyIdsForCurrentUser: jest.fn().mockResolvedValue({}),
  };
});

const context = {
  core: {
    elasticsearch: {
      client: {
        asIntegernalUser: jest.fn(),
      },
    },
  },
  fleet: {
    spaceId: 'default',
  },
} as any;
const request = {
  params: { pkgName: 'test-package' },
} as any;
const response = {
  ok: jest.fn(),
} as any;

describe('rollback package handler', () => {
  it('should throw if license is not enterprise', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);

    await expect(rollbackPackageHandler(context, request, response)).rejects.toThrow(
      FleetUnauthorizedError
    );
  });

  it('should continue if license is enterprise', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(true);

    await rollbackPackageHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
  });
});

describe('updatePackageHandler — ILM policy validation', () => {
  const getLifecycle = jest.fn();
  const hasPrivileges = jest.fn();
  const updateContext = {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            ilm: { getLifecycle },
            security: { hasPrivileges },
          },
        },
      },
    }),
    fleet: Promise.resolve({
      internalSoClient: {
        getCurrentNamespace: () => 'default',
      },
    }),
  } as any;
  const updateResponse = { ok: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getInstallation as jest.Mock).mockResolvedValue({
      namespace_customization_enabled_for: ['production'],
    });
    (updatePackage as jest.Mock).mockResolvedValue({
      packageInfo: {},
      namespaceCustomizationDiff: { addedNamespaces: [], removedNamespaces: [] },
      ilmPolicyChanges: [],
    });
    (getAllowedNamespacePrefixesForSpace as jest.Mock).mockResolvedValue(null);
    (isNamespaceAllowedByPrefixes as jest.Mock).mockReturnValue(true);
    (appContextService.getTaskManagerStart as jest.Mock).mockReturnValue({});
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
  });

  const buildRequest = (settings: Record<string, { ilm_policy?: string }>) =>
    ({
      params: { pkgName: 'nginx' },
      body: { namespace_customization_settings: settings },
    } as any);

  it('rejects the request when the caller lacks the manage_ilm privilege', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });

    await expect(
      updatePackageHandler(
        updateContext,
        buildRequest({ production: { ilm_policy: 'existing-policy' } }),
        updateResponse
      )
    ).rejects.toThrow(FleetUnauthorizedError);

    expect(getLifecycle).not.toHaveBeenCalled();
    expect(updatePackage).not.toHaveBeenCalled();
  });

  it('rejects an ILM policy that does not exist', async () => {
    getLifecycle.mockResolvedValue({ 'existing-policy': {} });

    await expect(
      updatePackageHandler(
        updateContext,
        buildRequest({ production: { ilm_policy: 'missing-policy' } }),
        updateResponse
      )
    ).rejects.toThrow(PolicyNamespaceValidationError);

    expect(updatePackage).not.toHaveBeenCalled();
  });

  it('allows an ILM policy that exists', async () => {
    getLifecycle.mockResolvedValue({ 'existing-policy': {} });

    await updatePackageHandler(
      updateContext,
      buildRequest({ production: { ilm_policy: 'existing-policy' } }),
      updateResponse
    );

    expect(updatePackage).toHaveBeenCalled();
    expect(updateResponse.ok).toHaveBeenCalled();
  });

  it('does not query manage_ilm or ILM when clearing a policy (ilm_policy undefined)', async () => {
    await updatePackageHandler(updateContext, buildRequest({ production: {} }), updateResponse);

    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(getLifecycle).not.toHaveBeenCalled();
    expect(updatePackage).toHaveBeenCalled();
  });
});

describe('getListHandler — withPackagePoliciesCount SO client', () => {
  const mockGetPackages = getPackages as jest.Mock;
  const mockGetCount = getPackagePoliciesCountByPackageName as jest.Mock;
  const mockGetGlobalClient =
    appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock;

  const listContext = {
    fleet: Promise.resolve({
      internalSoClient: {},
      spaceId: 'custom-space',
    }),
  } as any;

  const listResponse = { ok: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGlobalClient.mockReturnValue(mockGlobalSoClient);
    mockGetPackages.mockResolvedValue([
      { id: 'nginx', name: 'nginx', title: 'Nginx', version: '1.0.0' },
    ]);
    mockGetCount.mockResolvedValue({ nginx: 3 });
  });

  it('uses the global (all-spaces) SO client for the package policy count', async () => {
    await getListHandler(
      listContext,
      { query: { withPackagePoliciesCount: true } } as any,
      listResponse
    );

    expect(mockGetGlobalClient).toHaveBeenCalled();
    expect(mockGetCount).toHaveBeenCalledWith(mockGlobalSoClient);
  });

  it('sets packagePoliciesInfo.count on each item from the cross-space count', async () => {
    await getListHandler(
      listContext,
      { query: { withPackagePoliciesCount: true } } as any,
      listResponse
    );

    const body = listResponse.ok.mock.calls[0][0].body;
    expect(body.items[0].packagePoliciesInfo).toEqual({ count: 3 });
  });

  it('skips the count query when withPackagePoliciesCount is false', async () => {
    await getListHandler(
      listContext,
      { query: { withPackagePoliciesCount: false } } as any,
      listResponse
    );

    expect(mockGetGlobalClient).not.toHaveBeenCalled();
    expect(mockGetCount).not.toHaveBeenCalled();
  });
});

describe('getListHandler — FIPS filtering', () => {
  const fipsPkg = {
    name: 'all-non-fips',
    id: 'all-non-fips',
    status: 'not_installed',
    policy_templates: [{ name: 't', title: 't', description: '', fips_compatible: false }],
  };
  const mixedPkg = {
    name: 'mixed',
    id: 'mixed',
    status: 'not_installed',
    policy_templates: [
      { name: 'ok', title: 'ok', description: '', fips_compatible: undefined },
      { name: 'bad', title: 'bad', description: '', fips_compatible: false },
    ],
  };
  const cleanPkg = {
    name: 'clean',
    id: 'clean',
    status: 'not_installed',
    policy_templates: [{ name: 'good', title: 'good', description: '', fips_compatible: true }],
  };

  const listContext = {
    core: Promise.resolve({}),
    fleet: Promise.resolve({ internalSoClient: {}, spaceId: 'default' }),
  } as any;
  const listRequest = { query: {} } as any;
  const listResponse = { ok: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPackages as jest.Mock).mockResolvedValue([fipsPkg, mixedPkg, cleanPkg]);
    listResponse.ok.mockImplementation(() => {});
  });

  it('does not filter packages when FIPS is disabled', async () => {
    (appContextService.getIsFipsEnabled as jest.Mock).mockReturnValue(false);

    await getListHandler(listContext, listRequest, listResponse);

    const body = listResponse.ok.mock.calls[0][0].body;
    const names = body.items.map((p: any) => p.name);
    expect(names).toContain('all-non-fips');
    expect(names).toContain('mixed');
    expect(names).toContain('clean');
  });

  it('drops packages where all templates are non-FIPS when FIPS is enabled', async () => {
    (appContextService.getIsFipsEnabled as jest.Mock).mockReturnValue(true);

    await getListHandler(listContext, listRequest, listResponse);

    const body = listResponse.ok.mock.calls[0][0].body;
    const names = body.items.map((p: any) => p.name);
    expect(names).not.toContain('all-non-fips');
  });

  it('keeps partially-FIPS packages but strips their non-FIPS templates when FIPS is enabled', async () => {
    (appContextService.getIsFipsEnabled as jest.Mock).mockReturnValue(true);

    await getListHandler(listContext, listRequest, listResponse);

    const body = listResponse.ok.mock.calls[0][0].body;
    const mixed = body.items.find((p: any) => p.name === 'mixed');
    expect(mixed).toBeDefined();
    expect(mixed.policy_templates).toHaveLength(1);
    expect(mixed.policy_templates[0].name).toBe('ok');
  });

  it('always excludes security_ai_prompts regardless of FIPS mode', async () => {
    const aiPkg = {
      name: 'security_ai_prompts',
      id: 'security_ai_prompts',
      status: 'not_installed',
    };
    (getPackages as jest.Mock).mockResolvedValue([cleanPkg, aiPkg]);
    (appContextService.getIsFipsEnabled as jest.Mock).mockReturnValue(false);

    await getListHandler(listContext, listRequest, listResponse);

    const body = listResponse.ok.mock.calls[0][0].body;
    const names = body.items.map((p: any) => p.name);
    expect(names).not.toContain('security_ai_prompts');
  });
});
