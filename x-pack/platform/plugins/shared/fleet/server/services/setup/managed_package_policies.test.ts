/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getInstallation, getInstallations, getPackageInfo } from '../epm/packages';

import {
  upgradeManagedPackagePolicies,
  setupUpgradeManagedPackagePolicies,
} from './managed_package_policies';

jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../epm/packages');
jest.mock('../epm/packages/deprecation_helpers');
jest.mock('../app_context', () => {
  return {
    ...jest.requireActual('../app_context'),
    appContextService: {
      getLogger: jest.fn(() => {
        return { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
      }),
      getConfig: jest.fn(() => ({})),
      getTaskManagerStart: jest.fn(() => ({
        ensureScheduled: jest.fn(),
      })),
    },
  };
});
jest.mock('../audit_logging');

describe('upgradeManagedPackagePolicies', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.mocked(packagePolicyService.fetchAllItems).mockReset();
    jest.mocked(packagePolicyService.getUpgradeDryRunDiff).mockReset();
    jest.mocked(packagePolicyService.upgrade).mockReset();
  });

  it('should not upgrade policies for installed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (getInstallation as jest.Mock).mockResolvedValueOnce(undefined);

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
      policy_ids: ['agent-policy-1'],
      package: {
        name: 'managed-package',
        title: 'Managed Package',
        version: '0.0.1',
      },
    };

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
      (async function* () {
        yield [packagePolicy];
      })()
    );

    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValueOnce({
      name: 'non-managed-package-policy',
      diff: [{ id: 'foo' }, { id: 'bar' }],
      hasErrors: false,
    });
    (packagePolicyService.upgrade as jest.Mock).mockResolvedValueOnce([
      { id: 'managed-package-id', success: true },
    ]);

    (getInstallation as jest.Mock).mockResolvedValueOnce({
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
      { force: true, bumpRevision: false },
      packagePolicy,
      '1.0.0'
    );
    expect(agentPolicyService.bumpRevision).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpRevision).toHaveBeenCalledWith(
      soClient,
      esClient,
      'agent-policy-1'
    );
  });

  it('should bump each agent policy revision once after all package policies are upgraded', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();
    const makePackagePolicy = (id: string, policyIds: string[]) => ({
      id,
      inputs: {},
      policy_ids: policyIds,
      package: { name: 'managed-package', title: 'Managed Package', version: '0.0.1' },
    });

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          makePackagePolicy('pp-1', ['agent-policy-1']),
          makePackagePolicy('pp-2', ['agent-policy-1']),
        ];
        yield [makePackagePolicy('pp-3', ['agent-policy-1', 'agent-policy-2'])];
      })()
    );
    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValue({
      diff: [],
      hasErrors: false,
    });
    (packagePolicyService.upgrade as jest.Mock).mockImplementation(async (_so, _es, id) => [
      { id, success: true },
    ]);
    (getInstallation as jest.Mock).mockResolvedValueOnce({
      id: 'test-installation',
      version: '1.0.0',
      keep_policies_up_to_date: true,
    });

    await upgradeManagedPackagePolicies(soClient, esClient, 'pkgname');

    expect(packagePolicyService.upgrade).toHaveBeenCalledTimes(3);
    expect(agentPolicyService.bumpRevision).toHaveBeenCalledTimes(2);
    expect(agentPolicyService.bumpRevision).toHaveBeenCalledWith(
      soClient,
      esClient,
      'agent-policy-1'
    );
    expect(agentPolicyService.bumpRevision).toHaveBeenCalledWith(
      soClient,
      esClient,
      'agent-policy-2'
    );
  });

  it('should not bump agent policies whose package policy upgrade failed', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'failing-package-policy',
            inputs: {},
            policy_ids: ['agent-policy-1'],
            package: { name: 'managed-package', title: 'Managed Package', version: '0.0.1' },
          },
        ];
      })()
    );
    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValueOnce({
      diff: [],
      hasErrors: false,
    });
    (packagePolicyService.upgrade as jest.Mock).mockResolvedValueOnce([
      { id: 'failing-package-policy', success: false, body: { message: 'upgrade failed' } },
    ]);
    (getInstallation as jest.Mock).mockResolvedValueOnce({
      id: 'test-installation',
      version: '1.0.0',
      keep_policies_up_to_date: true,
    });

    const results = await upgradeManagedPackagePolicies(soClient, esClient, 'pkgname');

    expect(results).toEqual([
      { packagePolicyId: 'failing-package-policy', diff: [], errors: ['upgrade failed'] },
    ]);
    expect(agentPolicyService.bumpRevision).not.toHaveBeenCalled();
  });

  it('should not upgrade policy if newer than installed package version', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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

    (getInstallation as jest.Mock).mockResolvedValueOnce({
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

      (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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

      (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValueOnce({
        name: 'conflicting-package-policy',
        diff: [
          { id: 'foo' },
          { id: 'bar', errors: [{ key: 'some.test.value', message: 'Conflict detected' }] },
        ],
        hasErrors: true,
      });

      (getInstallation as jest.Mock).mockResolvedValueOnce({
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
  const { hasNewDeprecations } = jest.requireMock('../epm/packages/deprecation_helpers');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should block policy upgrade for non-autoUpgrade package with new deprecations', async () => {
    const soClient = savedObjectsClientMock.create();

    (getInstallations as jest.Mock).mockResolvedValueOnce({
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

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'policy-1',
            package: { name: 'custom_package', version: '1.0.0' },
          },
        ];
      })()
    );

    (getPackageInfo as jest.Mock).mockImplementation(({ pkgVersion }: { pkgVersion: string }) =>
      Promise.resolve({ name: 'custom_package', version: pkgVersion })
    );

    hasNewDeprecations.mockReturnValue(true);

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

    (getInstallations as jest.Mock).mockResolvedValueOnce({
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

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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

    (getInstallations as jest.Mock).mockResolvedValueOnce({
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

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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

    (getInstallations as jest.Mock).mockResolvedValueOnce({
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

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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

    (getInstallations as jest.Mock).mockResolvedValueOnce({
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

    (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValueOnce(
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
