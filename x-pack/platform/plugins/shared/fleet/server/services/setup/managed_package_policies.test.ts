/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { packagePolicyService } from '../package_policy';
import { getInstallation, getInstallations, getPackageInfo } from '../epm/packages';
import { hasNewDeprecations } from '../epm/packages/deprecation_helpers';

import {
  upgradeManagedPackagePolicies,
  setupUpgradeManagedPackagePolicies,
} from './managed_package_policies';

vi.mock('../package_policy');
vi.mock('../epm/packages');
vi.mock('../epm/packages/deprecation_helpers');
vi.mock('../app_context', async () => {
  return {
    ...(await vi.importActual('../app_context')),
    appContextService: {
      getLogger: vi.fn(() => {
        return { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() };
      }),
      getConfig: vi.fn(() => ({})),
      getTaskManagerStart: vi.fn(() => ({
        ensureScheduled: vi.fn(),
      })),
    },
  };
});
vi.mock('../audit_logging');

describe('upgradeManagedPackagePolicies', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(packagePolicyService.fetchAllItems).mockReset();
  });

  it('should not upgrade policies for installed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (getInstallation as Mock).mockResolvedValueOnce(undefined);

    await upgradeManagedPackagePolicies(soClient, esClient, 'testpkg');

    expect(packagePolicyService.upgrade).not.toHaveBeenCalled();
  });

  it('should upgrade policies for managed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();
    const packagePolicy = {
      id: 'managed-package-id',
      inputs: {},
      version: '',
      revision: 1,
      updated_at: '',
      updated_by: '',
      created_at: '',
      created_by: '',
      package: {
        name: 'managed-package',
        title: 'Managed Package',
        version: '0.0.1',
      },
    };

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [packagePolicy];
      })()
    );

    (packagePolicyService.getUpgradeDryRunDiff as Mock).mockResolvedValueOnce({
      name: 'non-managed-package-policy',
      diff: [{ id: 'foo' }, { id: 'bar' }],
      hasErrors: false,
    });

    (getInstallation as Mock).mockResolvedValueOnce({
      id: 'test-installation',
      version: '1.0.0',
      keep_policies_up_to_date: true,
    });

    const results = await upgradeManagedPackagePolicies(soClient, esClient, 'pkgname');
    expect(results).toEqual([
      { packagePolicyId: 'managed-package-id', diff: [{ id: 'foo' }, { id: 'bar' }], errors: [] },
    ]);

    expect(packagePolicyService.upgrade).toHaveBeenCalledWith(
      soClient,
      esClient,
      'managed-package-id',
      { force: true },
      packagePolicy,
      '1.0.0'
    );
  });

  it('should not upgrade policy if newer than installed package version', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'managed-package-id',
            inputs: {},
            version: '',
            revision: 1,
            updated_at: '',
            updated_by: '',
            created_at: '',
            created_by: '',
            package: {
              name: 'managed-package',
              title: 'Managed Package',
              version: '1.0.1',
            },
          },
        ];
      })()
    );

    (getInstallation as Mock).mockResolvedValueOnce({
      id: 'test-installation',
      version: '1.0.0',
      keep_policies_up_to_date: true,
    });

    await upgradeManagedPackagePolicies(soClient, esClient, 'pkgname');

    expect(packagePolicyService.getUpgradeDryRunDiff).not.toHaveBeenCalled();
    expect(packagePolicyService.upgrade).not.toHaveBeenCalled();
  });

  describe('when dry run reports conflicts', () => {
    it('should return errors + diff without performing upgrade', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = savedObjectsClientMock.create();

      (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
        (async function* () {
          yield [
            {
              id: 'conflicting-package-policy',
              inputs: {},
              version: '',
              revision: 1,
              updated_at: '',
              updated_by: '',
              created_at: '',
              created_by: '',
              package: {
                name: 'conflicting-package',
                title: 'Conflicting Package',
                version: '0.0.1',
              },
            },
          ];
        })()
      );

      (packagePolicyService.getUpgradeDryRunDiff as Mock).mockResolvedValueOnce({
        name: 'conflicting-package-policy',
        diff: [
          { id: 'foo' },
          { id: 'bar', errors: [{ key: 'some.test.value', message: 'Conflict detected' }] },
        ],
        hasErrors: true,
      });

      (getInstallation as Mock).mockResolvedValueOnce({
        id: 'test-installation',
        version: '1.0.0',
        keep_policies_up_to_date: true,
      });

      const result = await upgradeManagedPackagePolicies(soClient, esClient, 'pkgname');

      expect(result).toEqual([
        {
          packagePolicyId: 'conflicting-package-policy',
          diff: [
            {
              id: 'foo',
            },
            {
              id: 'bar',
              errors: [
                {
                  key: 'some.test.value',
                  message: 'Conflict detected',
                },
              ],
            },
          ],
          errors: [
            {
              key: 'some.test.value',
              message: 'Conflict detected',
            },
          ],
        },
      ]);

      expect(packagePolicyService.upgrade).not.toHaveBeenCalled();
    });
  });
});

describe('setupUpgradeManagedPackagePolicies', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should block policy upgrade for non-autoUpgrade package with new deprecations', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'custom-pkg',
          attributes: {
            name: 'custom_package',
            version: '2.0.0',
            install_status: 'installed',
            keep_policies_up_to_date: true,
          },
        },
      ],
    });

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'custom_package', version: '1.0.0' },
          },
        ];
      })()
    );

    (getPackageInfo as Mock).mockImplementation(({ pkgVersion }: { pkgVersion: string }) =>
      Promise.resolve({ name: 'custom_package', version: pkgVersion })
    );

    vi.mocked(hasNewDeprecations).mockReturnValue(true);

    await setupUpgradeManagedPackagePolicies(soClient);

    expect(soClient.update).toHaveBeenCalledWith(
      'epm-packages',
      'custom-pkg',
      expect.objectContaining({
        pending_upgrade_review: expect.objectContaining({
          target_version: '2.0.0',
          reason: 'deprecated',
        }),
      })
    );
  });

  it('should skip if pending_upgrade_review.action is declined for this version', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'custom-pkg',
          attributes: {
            name: 'custom_package',
            version: '2.0.0',
            install_status: 'installed',
            keep_policies_up_to_date: true,
            pending_upgrade_review: {
              target_version: '2.0.0',
              reason: 'deprecated',
              created_at: '2026-01-01T00:00:00.000Z',
              action: 'declined',
            },
          },
        },
      ],
    });

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'custom_package', version: '1.0.0' },
          },
        ];
      })()
    );

    await setupUpgradeManagedPackagePolicies(soClient);

    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('should block upgrade when pending_upgrade_review.action is pending (re-enabled)', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'custom-pkg',
          attributes: {
            name: 'custom_package',
            version: '2.0.0',
            install_status: 'installed',
            keep_policies_up_to_date: true,
            pending_upgrade_review: {
              target_version: '2.0.0',
              reason: 'deprecated',
              created_at: '2026-01-01T00:00:00.000Z',
              action: 'pending',
            },
          },
        },
      ],
    });

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'custom_package', version: '1.0.0' },
          },
        ];
      })()
    );

    await setupUpgradeManagedPackagePolicies(soClient);

    expect(hasNewDeprecations).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('should proceed with upgrade if pending_upgrade_review.action is accepted', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'custom-pkg',
          attributes: {
            name: 'custom_package',
            version: '2.0.0',
            install_status: 'installed',
            keep_policies_up_to_date: true,
            pending_upgrade_review: {
              target_version: '2.0.0',
              reason: 'deprecated',
              created_at: '2026-01-01T00:00:00.000Z',
              action: 'accepted',
            },
          },
        },
      ],
    });

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'custom_package', version: '1.0.0' },
          },
        ];
      })()
    );

    await setupUpgradeManagedPackagePolicies(soClient);

    expect(hasNewDeprecations).not.toHaveBeenCalled();
  });

  it('should not gate autoUpgradePoliciesPackages even with deprecations', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'apm-pkg',
          attributes: {
            name: 'apm',
            version: '2.0.0',
            install_status: 'installed',
            keep_policies_up_to_date: true,
          },
        },
      ],
    });

    (packagePolicyService.fetchAllItems as Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'apm', version: '1.0.0' },
          },
        ];
      })()
    );

    await setupUpgradeManagedPackagePolicies(soClient);

    expect(hasNewDeprecations).not.toHaveBeenCalled();
  });
});
