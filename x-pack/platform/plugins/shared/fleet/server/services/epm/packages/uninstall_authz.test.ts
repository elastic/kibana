/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { FleetUnauthorizedError } from '../../../errors';
import { appContextService, packagePolicyService } from '../..';

import { assertUninstallAuthorizedForAffectedSpaces } from './uninstall_authz';
import { getInstallationObject } from '.';

// Mutable fns closed over by the mock factory so individual tests can override them.
const mockFns = {
  useRbacForRequest: jest.fn().mockReturnValue(true),
  atSpaces: jest.fn().mockResolvedValue({ hasAllRequested: true }),
};

jest.mock('../..', () => ({
  appContextService: {
    getSecurity: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn().mockReturnValue({}),
    getExperimentalFeatures: jest.fn().mockReturnValue({ enableResolveDependencies: false }),
  },
  packagePolicyService: {
    list: jest.fn(),
  },
}));

// Mock getInstallationObject so the dependency walker in collectSpacesForUninstallClosure
// finds no dependencies (returns undefined for any dep lookup).
jest.mock('.', () => ({
  getInstallationObject: jest.fn().mockResolvedValue(undefined),
  kibanaSavedObjectTypes: [],
  getPackageInfo: jest.fn(),
}));

const mockGetSecurity = appContextService.getSecurity as jest.Mock;
const mockGetExperimentalFeatures = appContextService.getExperimentalFeatures as jest.Mock;
const mockGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;

/** Convenience: return a full security stub using the shared mockFns. */
function makeSecurityStub() {
  return {
    authz: {
      mode: {
        useRbacForRequest: (...args: any[]) => mockFns.useRbacForRequest(...args),
      },
      actions: {
        api: { get: (name: string) => `api:${name}` },
      },
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({
        atSpaces: (...args: any[]) => mockFns.atSpaces(...args),
      }),
    },
  };
}

const mockRequest = {} as KibanaRequest;
const mockSavedObjectsClient = {} as SavedObjectsClientContract;

/** Minimal Installation fixture covering all space-related fields. */
function makeInstallation(overrides: object = {}) {
  return {
    name: 'nginx',
    version: '1.0.0',
    installed_kibana: [],
    installed_es: [],
    package_assets: [],
    installed_kibana_space_id: DEFAULT_SPACE_ID,
    additional_spaces_installed_kibana: {},
    ...overrides,
  } as any;
}

const mockPackagePolicyList = packagePolicyService.list as jest.MockedFunction<
  typeof packagePolicyService.list
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockFns.useRbacForRequest.mockReturnValue(true);
  mockFns.atSpaces.mockResolvedValue({ hasAllRequested: true });
  mockGetSecurity.mockReturnValue(makeSecurityStub());
  // Dependency resolution disabled by default — walker exits early, tests are root-only.
  mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: false });
  // getInstallationObject returns undefined — no dep installations to traverse.
  mockGetInstallationObject.mockResolvedValue(undefined);
  // Return empty policy list so the dependency walker finds nothing to traverse.
  mockPackagePolicyList.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10000 });
});

describe('assertUninstallAuthorizedForAffectedSpaces', () => {
  describe('early-return / skip conditions', () => {
    it('resolves without checking privileges when security is unavailable', async () => {
      mockGetSecurity.mockReturnValue(undefined);

      await expect(
        assertUninstallAuthorizedForAffectedSpaces({
          request: mockRequest,
          pkgName: 'nginx',
          installation: makeInstallation(),
          packagePolicies: [],
          savedObjectsClient: mockSavedObjectsClient,
        })
      ).resolves.toBeUndefined();

      expect(mockFns.atSpaces).not.toHaveBeenCalled();
    });

    it('resolves without checking privileges when RBAC is not used for the request', async () => {
      mockFns.useRbacForRequest.mockReturnValue(false);

      await expect(
        assertUninstallAuthorizedForAffectedSpaces({
          request: mockRequest,
          pkgName: 'nginx',
          installation: makeInstallation(),
          packagePolicies: [{ id: 'p1', spaceIds: ['some-space'] } as any],
          savedObjectsClient: mockSavedObjectsClient,
        })
      ).resolves.toBeUndefined();

      expect(mockFns.atSpaces).not.toHaveBeenCalled();
    });
  });

  describe('space ID collection', () => {
    it('includes installed_kibana_space_id', async () => {
      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({ installed_kibana_space_id: 'space-a' }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain('space-a');
    });

    it('falls back to DEFAULT_SPACE_ID when installed_kibana_space_id is absent', async () => {
      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({ installed_kibana_space_id: undefined }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain(DEFAULT_SPACE_ID);
    });

    it('includes keys of additional_spaces_installed_kibana', async () => {
      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          additional_spaces_installed_kibana: { 'extra-space': [], 'another-space': [] },
        }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain('extra-space');
      expect(calledSpaces).toContain('another-space');
    });

    it('includes spaceIds from each package policy', async () => {
      const packagePolicies = [
        { id: 'pp-1', spaceIds: ['policy-space-1', 'policy-space-2'] } as any,
        { id: 'pp-2', spaceIds: ['policy-space-3'] } as any,
      ];

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation(),
        packagePolicies,
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain('policy-space-1');
      expect(calledSpaces).toContain('policy-space-2');
      expect(calledSpaces).toContain('policy-space-3');
    });

    it('skips package policies that have no spaceIds', async () => {
      const packagePolicies = [
        { id: 'pp-legacy' } as any, // no spaceIds — legacy / space-awareness disabled
      ];

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({ installed_kibana_space_id: 'default' }),
        packagePolicies,
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      // Only the installation's own space should appear.
      expect(calledSpaces).toEqual(['default']);
    });

    it('deduplicates space IDs across all sources', async () => {
      const packagePolicies = [
        { id: 'pp-1', spaceIds: ['default', 'shared-space'] } as any,
        { id: 'pp-2', spaceIds: ['shared-space'] } as any,
      ];

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          installed_kibana_space_id: 'default',
          additional_spaces_installed_kibana: { 'shared-space': [] },
        }),
        packagePolicies,
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      // No duplicates.
      expect(calledSpaces.length).toBe(new Set(calledSpaces).size);
      expect(calledSpaces).toContain('default');
      expect(calledSpaces).toContain('shared-space');
    });

    it('combines all three sources in a single call', async () => {
      const packagePolicies = [{ id: 'pp-1', spaceIds: ['policy-space'] } as any];

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          installed_kibana_space_id: 'primary-space',
          additional_spaces_installed_kibana: { 'extra-space': [] },
        }),
        packagePolicies,
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain('primary-space');
      expect(calledSpaces).toContain('extra-space');
      expect(calledSpaces).toContain('policy-space');
    });
  });

  describe('privilege check', () => {
    it('requests both integrations-all and fleet-agent-policies-all', async () => {
      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation(),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [, { kibana: actions }] = mockFns.atSpaces.mock.calls[0];
      expect(actions).toContain('api:integrations-all');
      expect(actions).toContain('api:fleet-agent-policies-all');
    });

    it('resolves without error when hasAllRequested is true', async () => {
      mockFns.atSpaces.mockResolvedValue({ hasAllRequested: true });

      await expect(
        assertUninstallAuthorizedForAffectedSpaces({
          request: mockRequest,
          pkgName: 'nginx',
          installation: makeInstallation(),
          packagePolicies: [{ id: 'pp-1', spaceIds: ['space-b'] } as any],
          savedObjectsClient: mockSavedObjectsClient,
        })
      ).resolves.toBeUndefined();
    });

    it('throws FleetUnauthorizedError when hasAllRequested is false', async () => {
      mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

      await expect(
        assertUninstallAuthorizedForAffectedSpaces({
          request: mockRequest,
          pkgName: 'nginx',
          installation: makeInstallation(),
          packagePolicies: [{ id: 'pp-1', spaceIds: ['restricted-space'] } as any],
          savedObjectsClient: mockSavedObjectsClient,
        })
      ).rejects.toThrow(FleetUnauthorizedError);
    });

    it('error message does not reveal which spaces were unauthorized', async () => {
      mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

      const err = await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation(),
        packagePolicies: [{ id: 'pp-1', spaceIds: ['secret-space'] } as any],
        savedObjectsClient: mockSavedObjectsClient,
      }).catch((e) => e);

      expect(err).toBeInstanceOf(FleetUnauthorizedError);
      expect(err.message).not.toContain('secret-space');
    });

    it('error message includes the package name', async () => {
      mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

      const err = await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'my-package',
        installation: makeInstallation(),
        packagePolicies: [{ id: 'pp-1', spaceIds: ['space-b'] } as any],
        savedObjectsClient: mockSavedObjectsClient,
      }).catch((e) => e);

      expect(err).toBeInstanceOf(FleetUnauthorizedError);
      expect(err.message).toContain('my-package');
    });
  });

  describe('dependency closure', () => {
    it('does not traverse dependencies when enableResolveDependencies is false', async () => {
      // dep-space is only reachable through the dependency; root is in default.
      // If the walker incorrectly traverses deps, it would add dep-space and could 403.
      mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: false });
      mockGetInstallationObject.mockResolvedValue({
        attributes: makeInstallation({ name: 'dep-pkg', installed_kibana_space_id: 'dep-space' }),
      } as any);

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          dependencies: [{ name: 'dep-pkg', version: '1.0.0' }],
        }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).not.toContain('dep-space');
    });

    it('includes dependency spaces when enableResolveDependencies is true and dep would be removed', async () => {
      mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: true });

      const depInstallation = makeInstallation({
        name: 'dep-pkg',
        installed_kibana_space_id: 'dep-space',
        installed_as_dependency: true,
        is_dependency_of: [{ name: 'nginx', version: '1.0.0' }],
        dependencies: [],
      });
      mockGetInstallationObject.mockResolvedValue({ attributes: depInstallation } as any);
      // Dep has no package policies
      mockPackagePolicyList.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10000 });

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          dependencies: [{ name: 'dep-pkg', version: '1.0.0' }],
        }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain(DEFAULT_SPACE_ID); // root
      expect(calledSpaces).toContain('dep-space'); // dependency
    });

    it('includes shared transitive dep spaces when all its parents are in the closure', async () => {
      // Root -> A -> C (shared), Root -> B -> C (shared).
      // C.is_dependency_of = [A, B]. Pre-auth must include C's space because both A
      // and B are being removed, making C eventually orphaned at runtime.
      mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: true });

      const depC = makeInstallation({
        name: 'dep-c',
        installed_kibana_space_id: 'shared-dep-space',
        installed_as_dependency: true,
        is_dependency_of: [
          { name: 'dep-a', version: '1.0.0' },
          { name: 'dep-b', version: '1.0.0' },
        ],
        dependencies: [],
      });
      const depA = makeInstallation({
        name: 'dep-a',
        installed_kibana_space_id: 'dep-a-space',
        installed_as_dependency: true,
        is_dependency_of: [{ name: 'nginx', version: '1.0.0' }],
        dependencies: [{ name: 'dep-c', version: '1.0.0' }],
      });
      const depB = makeInstallation({
        name: 'dep-b',
        installed_kibana_space_id: 'dep-b-space',
        installed_as_dependency: true,
        is_dependency_of: [{ name: 'nginx', version: '1.0.0' }],
        dependencies: [{ name: 'dep-c', version: '1.0.0' }],
      });

      mockGetInstallationObject.mockImplementation(async ({ pkgName }: { pkgName: string }) => {
        if (pkgName === 'dep-a') return { attributes: depA } as any;
        if (pkgName === 'dep-b') return { attributes: depB } as any;
        if (pkgName === 'dep-c') return { attributes: depC } as any;
        return undefined;
      });
      mockPackagePolicyList.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10000 });

      await assertUninstallAuthorizedForAffectedSpaces({
        request: mockRequest,
        pkgName: 'nginx',
        installation: makeInstallation({
          dependencies: [
            { name: 'dep-a', version: '1.0.0' },
            { name: 'dep-b', version: '1.0.0' },
          ],
        }),
        packagePolicies: [],
        savedObjectsClient: mockSavedObjectsClient,
      });

      const [calledSpaces] = mockFns.atSpaces.mock.calls[0];
      expect(calledSpaces).toContain('dep-a-space');
      expect(calledSpaces).toContain('dep-b-space');
      expect(calledSpaces).toContain('shared-dep-space'); // shared dep correctly included
    });

    it('throws FleetUnauthorizedError when dep is in an inaccessible space and would be removed', async () => {
      mockGetExperimentalFeatures.mockReturnValue({ enableResolveDependencies: true });
      mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

      const depInstallation = makeInstallation({
        name: 'dep-pkg',
        installed_kibana_space_id: 'restricted-space',
        installed_as_dependency: true,
        is_dependency_of: [{ name: 'nginx', version: '1.0.0' }],
        dependencies: [],
      });
      mockGetInstallationObject.mockResolvedValue({ attributes: depInstallation } as any);
      mockPackagePolicyList.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10000 });

      await expect(
        assertUninstallAuthorizedForAffectedSpaces({
          request: mockRequest,
          pkgName: 'nginx',
          installation: makeInstallation({
            dependencies: [{ name: 'dep-pkg', version: '1.0.0' }],
          }),
          packagePolicies: [],
          savedObjectsClient: mockSavedObjectsClient,
        })
      ).rejects.toThrow(FleetUnauthorizedError);
    });
  });
});
