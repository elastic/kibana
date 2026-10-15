/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetUnauthorizedError } from '../../errors';
import { appContextService, licenseService } from '../../services';
import { getPackages } from '../../services/epm/packages/get';
import { getPackagePoliciesCountByPackageName } from '../../services/package_policies/package_policies_aggregation';

import { getListHandler, rollbackPackageHandler } from './handlers';

const mockGlobalSoClient = { find: jest.fn() };

jest.mock('../../services', () => {
  return {
    licenseService: {
      isEnterprise: jest.fn(),
    },
    appContextService: {
      getTaskManagerStart: jest.fn().mockReturnValue({}),
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
    getPackages: jest.fn(),
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
