/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { packagePolicyService } from '../../services';
import { FleetUnauthorizedError } from '../../errors';
import { getInstallationsByName } from '../../services/epm/packages/get';
import {
  assertUninstallAuthorizedForAffectedSpaces,
  collectSpacesForUninstallClosure,
} from '../../services/epm/packages/uninstall_authz';
import { scheduleBulkUninstall } from '../../tasks/packages_bulk_operations';

import { postBulkUninstallPackagesHandler } from './bulk_handler';

jest.mock('../../services', () => ({
  appContextService: {
    getInternalUserSOClientWithoutSpaceExtension: jest.fn().mockReturnValue({}),
    getTaskManagerStart: jest.fn().mockReturnValue({}),
  },
  packagePolicyService: {
    list: jest.fn(),
  },
  licenseService: {
    isAtLeast: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../services/epm/packages/get', () => ({
  getInstallationsByName: jest.fn(),
}));

jest.mock('../../services/epm/packages/uninstall_authz', () => ({
  assertUninstallAuthorizedForAffectedSpaces: jest.fn().mockResolvedValue(undefined),
  collectSpacesForUninstallClosure: jest
    .fn()
    .mockResolvedValue({ spaceIds: new Set(['default']), truncated: false }),
}));

jest.mock('../../tasks/packages_bulk_operations', () => ({
  scheduleBulkUninstall: jest.fn().mockResolvedValue('task-id-123'),
  scheduleBulkUpgrade: jest.fn(),
  getBulkOperationTaskResults: jest.fn(),
  scheduleBulkRollback: jest.fn(),
}));

// validateInstalledPackages uses getInstallationsByName internally — keep it simple by
// making every package appear installed.
const mockGetInstallationsByName = getInstallationsByName as jest.MockedFunction<
  typeof getInstallationsByName
>;
const mockPackagePolicyServiceList = packagePolicyService.list as jest.MockedFunction<
  typeof packagePolicyService.list
>;
const mockAssertUninstallAuthorized =
  assertUninstallAuthorizedForAffectedSpaces as jest.MockedFunction<
    typeof assertUninstallAuthorizedForAffectedSpaces
  >;
const mockCollectSpacesForUninstallClosure =
  collectSpacesForUninstallClosure as jest.MockedFunction<typeof collectSpacesForUninstallClosure>;
const mockScheduleBulkUninstall = scheduleBulkUninstall as jest.MockedFunction<
  typeof scheduleBulkUninstall
>;

function makeContext(request: Record<string, unknown> = {}) {
  const mockRequest = {
    body: { packages: [{ name: 'nginx', version: '3.2.2' }] },
    ...request,
  } as unknown as Parameters<typeof postBulkUninstallPackagesHandler>[1];

  const context = {
    fleet: Promise.resolve({
      internalSoClient: {} as SavedObjectsClientContract,
    }),
  } as any;

  const response = {
    ok: jest.fn((body) => ({ status: 200, ...body })),
    forbidden: jest.fn((body) => ({ status: 403, ...body })),
    badRequest: jest.fn((body) => ({ status: 400, ...body })),
    customError: jest.fn((body) => body),
  } as any;

  return { mockRequest, context, response };
}

const INSTALLATION = {
  name: 'nginx',
  version: '3.2.2',
  installed_kibana_space_id: 'default',
  additional_spaces_installed_kibana: {},
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInstallationsByName.mockResolvedValue([INSTALLATION]);
  mockPackagePolicyServiceList.mockResolvedValue({
    total: 0,
    items: [],
    page: 1,
    perPage: 10000,
  });
  mockAssertUninstallAuthorized.mockResolvedValue(undefined);
  mockCollectSpacesForUninstallClosure.mockResolvedValue({
    spaceIds: new Set(['default']),
    truncated: false,
  });
  mockScheduleBulkUninstall.mockResolvedValue('task-id-123');
});

describe('postBulkUninstallPackagesHandler — truncated policy list', () => {
  it('throws FleetUnauthorizedError when the combined policy list is truncated (total > items.length)', async () => {
    // More policies exist than were returned — we cannot safely determine all affected spaces
    mockPackagePolicyServiceList.mockResolvedValue({
      total: 99999,
      items: [{ id: 'pp-1', package: { name: 'nginx' }, spaceIds: ['default'] } as any],
      page: 1,
      perPage: 10000,
    });

    const { mockRequest, context, response } = makeContext();

    await expect(postBulkUninstallPackagesHandler(context, mockRequest, response)).rejects.toThrow(
      FleetUnauthorizedError
    );

    // The task must NOT have been scheduled
    expect(mockScheduleBulkUninstall).not.toHaveBeenCalled();
  });

  it('proceeds normally when total equals items.length (no truncation)', async () => {
    mockPackagePolicyServiceList.mockResolvedValue({
      total: 1,
      items: [{ id: 'pp-1', package: { name: 'nginx' }, spaceIds: ['default'] } as any],
      page: 1,
      perPage: 10000,
    });

    const { mockRequest, context, response } = makeContext();

    await postBulkUninstallPackagesHandler(context, mockRequest, response);

    expect(mockScheduleBulkUninstall).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: { taskId: 'task-id-123' } })
    );
  });

  it('proceeds normally when there are no policies at all', async () => {
    mockPackagePolicyServiceList.mockResolvedValue({
      total: 0,
      items: [],
      page: 1,
      perPage: 10000,
    });

    const { mockRequest, context, response } = makeContext();

    await postBulkUninstallPackagesHandler(context, mockRequest, response);

    expect(mockScheduleBulkUninstall).toHaveBeenCalled();
  });

  it('does not schedule the task when assertUninstallAuthorizedForAffectedSpaces throws', async () => {
    mockAssertUninstallAuthorized.mockRejectedValue(
      new FleetUnauthorizedError('Insufficient privileges')
    );

    const { mockRequest, context, response } = makeContext();

    await expect(postBulkUninstallPackagesHandler(context, mockRequest, response)).rejects.toThrow(
      FleetUnauthorizedError
    );

    expect(mockScheduleBulkUninstall).not.toHaveBeenCalled();
  });

  it('uses a shared beingRemoved set across all packages so shared deps are included in the closure', async () => {
    // Two packages requested; collectSpacesForUninstallClosure must be called with the
    // same beingRemoved set so a shared dep C (parent of both) is caught on the second call.
    const INSTALLATION_B = {
      name: 'apache',
      version: '1.0.0',
      installed_kibana_space_id: 'default',
      additional_spaces_installed_kibana: {},
    } as any;
    mockGetInstallationsByName.mockResolvedValue([INSTALLATION, INSTALLATION_B]);

    let capturedBeingRemovedOnFirstCall: Set<string> | undefined;
    mockCollectSpacesForUninstallClosure.mockImplementation(
      async (_soClient, _inst, _policies, beingRemoved) => {
        if (!capturedBeingRemovedOnFirstCall) {
          capturedBeingRemovedOnFirstCall = beingRemoved;
        }
        return { spaceIds: new Set(['default']), truncated: false };
      }
    );

    const { mockRequest, context, response } = makeContext({
      body: {
        packages: [
          { name: 'nginx', version: '3.2.2' },
          { name: 'apache', version: '1.0.0' },
        ],
      },
    });

    await postBulkUninstallPackagesHandler(context, mockRequest, response);

    // Both calls must share the same beingRemoved reference
    expect(mockCollectSpacesForUninstallClosure).toHaveBeenCalledTimes(2);
    const firstCallBeingRemoved = mockCollectSpacesForUninstallClosure.mock.calls[0][3];
    const secondCallBeingRemoved = mockCollectSpacesForUninstallClosure.mock.calls[1][3];
    expect(firstCallBeingRemoved).toBe(secondCallBeingRemoved);
  });

  it('rejects and does not schedule when the combined closure includes an inaccessible shared dep space', async () => {
    // Two packages (nginx, apache) share auto-installed dep-c in 'restricted-space'.
    // collectSpacesForUninstallClosure returns that space on the second call (after both
    // roots are in beingRemoved). assertUninstallAuthorizedForAffectedSpaces then rejects.
    const INSTALLATION_B = {
      name: 'apache',
      version: '1.0.0',
      installed_kibana_space_id: 'default',
      additional_spaces_installed_kibana: {},
    } as any;
    mockGetInstallationsByName.mockResolvedValue([INSTALLATION, INSTALLATION_B]);

    let callCount = 0;
    mockCollectSpacesForUninstallClosure.mockImplementation(async () => {
      callCount++;
      // Second call (apache) reveals the shared dep space once nginx is in beingRemoved
      const spaces =
        callCount === 2 ? new Set(['default', 'restricted-space']) : new Set(['default']);
      return { spaceIds: spaces, truncated: false };
    });
    mockAssertUninstallAuthorized.mockRejectedValue(
      new FleetUnauthorizedError('Insufficient privileges')
    );

    const { mockRequest, context, response } = makeContext({
      body: {
        packages: [
          { name: 'nginx', version: '3.2.2' },
          { name: 'apache', version: '1.0.0' },
        ],
      },
    });

    await expect(postBulkUninstallPackagesHandler(context, mockRequest, response)).rejects.toThrow(
      FleetUnauthorizedError
    );
    expect(mockScheduleBulkUninstall).not.toHaveBeenCalled();
  });
});
