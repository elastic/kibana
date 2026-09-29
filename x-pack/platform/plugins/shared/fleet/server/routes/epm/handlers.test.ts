/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { PolicyNamespaceValidationError } from '../../../common/errors';
import { FleetUnauthorizedError } from '../../errors';
import { appContextService, licenseService } from '../../services';
import { getInstallation } from '../../services/epm/packages/get';
import { updatePackage } from '../../services/epm/packages/update';
import {
  getAllowedNamespacePrefixesForSpace,
  isNamespaceAllowedByPrefixes,
} from '../../services/spaces/policy_namespaces';

import { rollbackPackageHandler, updatePackageHandler } from './handlers';

vi.mock('../../services', () => {
  return {
    licenseService: {
      isEnterprise: vi.fn(),
    },
    appContextService: {
      getTaskManagerStart: vi.fn().mockReturnValue({}),
    },
  };
});

vi.mock('../../services/epm/packages/rollback', () => {
  return {
    rollbackInstallation: vi.fn(),
  };
});

vi.mock('../../services/epm/packages/get', () => {
  return {
    getInstallation: vi.fn(),
  };
});

vi.mock('../../services/epm/packages/update', () => {
  return {
    updatePackage: vi.fn(),
  };
});

vi.mock('../../tasks/sync_namespace_templates_task', () => {
  return {
    scheduleSyncNamespaceTemplatesTask: vi.fn(),
  };
});

vi.mock('../../tasks/sync_ilm_policy_task', () => {
  return {
    scheduleSyncIlmPolicyTask: vi.fn(),
  };
});

vi.mock('../../services/spaces/policy_namespaces', () => {
  return {
    getAllowedNamespacePrefixesForSpace: vi.fn(),
    isNamespaceAllowedByPrefixes: vi.fn().mockReturnValue(true),
  };
});

vi.mock('./bulk_handler', () => {
  return {
    getPackagePolicyIdsForCurrentUser: vi.fn().mockResolvedValue({}),
  };
});

const context = {
  core: {
    elasticsearch: {
      client: {
        asIntegernalUser: vi.fn(),
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
  ok: vi.fn(),
} as any;

describe('rollback package handler', () => {
  it('should throw if license is not enterprise', async () => {
    (licenseService.isEnterprise as Mock).mockReturnValue(false);

    await expect(rollbackPackageHandler(context, request, response)).rejects.toThrow(
      FleetUnauthorizedError
    );
  });

  it('should continue if license is enterprise', async () => {
    (licenseService.isEnterprise as Mock).mockReturnValue(true);

    await rollbackPackageHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
  });
});

describe('updatePackageHandler — ILM policy validation', () => {
  const getLifecycle = vi.fn();
  const hasPrivileges = vi.fn();
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
  const updateResponse = { ok: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (getInstallation as Mock).mockResolvedValue({
      namespace_customization_enabled_for: ['production'],
    });
    (updatePackage as Mock).mockResolvedValue({
      packageInfo: {},
      namespaceCustomizationDiff: { addedNamespaces: [], removedNamespaces: [] },
      ilmPolicyChanges: [],
    });
    (getAllowedNamespacePrefixesForSpace as Mock).mockResolvedValue(null);
    (isNamespaceAllowedByPrefixes as Mock).mockReturnValue(true);
    (appContextService.getTaskManagerStart as Mock).mockReturnValue({});
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
