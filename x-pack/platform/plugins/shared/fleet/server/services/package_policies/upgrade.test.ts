/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { PackagePolicyAssetsMap } from '../../../common/types';

import { createPackagePolicyMock, createAgentPolicyMock } from '../../../common/mocks';

import { createAppContextStartContractMock, createSavedObjectClientMock } from '../../mocks';

import { FleetError, PackagePolicyIneligibleForUpgradeError } from '../../errors';

import { packagePolicyService } from '../package_policy';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';
import { agentPolicyService } from '../agent_policy';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { getAgentTemplateAssetsMap } from '../epm/packages/get';
import { getPackageInfo } from '../epm/packages';

import { getAgentVersionBlocks } from './agent_version_guard';
import {
  _getUpgradePackagePolicyInfo,
  _packagePoliciesBulkUpgrade,
  _packagePoliciesGetUpgradeDryRunDiff,
  _packagePoliciesGetUpgradeDryRunDiffs,
  _packagePoliciesUpgrade,
} from './upgrade';

jest.mock('../spaces/helpers');

jest.mock('../license');

jest.mock('./agent_version_guard', () => {
  const mockGetAgentVersionBlocks = jest.fn().mockResolvedValue(new Map());
  return {
    ...jest.requireActual('./agent_version_guard'),
    getAgentVersionBlocks: mockGetAgentVersionBlocks,
    // Same as the actual function, on top of the mocked `getAgentVersionBlocks`
    getAgentVersionBlocksOrErrors: async (
      items: Array<{ key: string; pkgInfo: { conditions?: { agent?: { version?: string } } } }>
    ) => {
      try {
        return { blocks: await mockGetAgentVersionBlocks(items), errors: new Map() };
      } catch (error) {
        return {
          blocks: new Map(),
          errors: new Map(
            items
              .filter(({ pkgInfo }) => pkgInfo.conditions?.agent?.version)
              .map(({ key }) => [key, error])
          ),
        };
      }
    },
  };
});

async function mockedGetInstallation(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { version: '0.3.3' };
  if (params.pkgName === 'endpoint') pkg = { version: '1.0.0' };
  if (params.pkgName === 'test') pkg = { version: '0.0.1' };
  if (params.pkgName === 'test-var-groups') pkg = { version: '2.0.0' };
  return Promise.resolve(pkg);
}

async function mockedGetPackageInfo(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { name: 'aws', version: '0.3.3' };
  if (params.pkgName === 'endpoint') pkg = { name: 'endpoint', version: params.pkgVersion };
  if (params.pkgName === 'test') {
    pkg = {
      version: '1.0.2',
    };
  }
  if (params.pkgName === 'test-agent-condition') {
    pkg = {
      name: 'test-agent-condition',
      version: '1.0.2',
      conditions: { agent: { version: '^9.4.0' } },
    };
  }
  if (params.pkgName === 'test-conflict') {
    pkg = {
      version: '1.0.2',
      policy_templates: [
        {
          name: 'test-conflict',
          inputs: [
            {
              title: 'test',
              type: 'logs',
              description: 'test',
              vars: [
                {
                  name: 'test-var-required',
                  required: true,
                  type: 'integer',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  if (params.pkgName === 'test-var-groups') {
    // Mirrors the aws package's credential_type var_group introduced in 7.0.0
    pkg = {
      name: 'test-var-groups',
      version: '2.0.0',
      var_groups: [
        {
          name: 'credential_type',
          title: 'Setup Access',
          selector_title: 'Preferred method',
          required: true,
          options: [
            {
              name: 'identity_federation',
              title: 'Identity Federation',
              vars: ['role_arn', 'supports_identity_federation'],
              provider: 'aws',
            },
            {
              name: 'direct_access_key',
              title: 'Direct Access Keys',
              vars: ['access_key_id', 'secret_access_key'],
            },
          ],
        },
      ],
    };
  }

  if (params.pkgName === 'test-duplicated-vars') {
    pkg = {
      version: params.pkgVersion,
      policy_templates: [
        {
          name: 'test-duplicated-vars',
          inputs: [
            {
              title: 'test',
              type: 'logs',
              description: 'test',
              template_path: 'stream.yml.hbs',
              vars: [
                {
                  name: 'custom',
                  type: 'yaml',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  return Promise.resolve(pkg);
}

jest.mock('../epm/packages', () => {
  return {
    getPackageInfo: jest.fn().mockImplementation(mockedGetPackageInfo),
    getInstallation: mockedGetInstallation,
    ensureInstalledPackage: jest.fn(),
  };
});

jest.mock('../../../common/services/package_to_package_policy', () => ({
  ...jest.requireActual('../../../common/services/package_to_package_policy'),
  packageToPackagePolicy: jest.fn(),
}));

jest.mock('../epm/registry', () => ({
  getPackage: jest.fn().mockResolvedValue({ assetsMap: [] }),
}));

jest.mock('../epm/packages/get', () => ({
  getPackageAssetsMap: jest.fn().mockResolvedValue(new Map()),
  getAgentTemplateAssetsMap: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('../agent_policy');
const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

jest.mock('../epm/packages/cleanup', () => {
  return {
    removeOldAssets: jest.fn(),
  };
});

jest.mock('../upgrade_sender', () => {
  return {
    sendTelemetryEvents: jest.fn(),
  };
});

jest.mock('../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

jest.mock('../secrets', () => ({
  isSecretStorageEnabled: jest.fn(),
}));

describe('Upgrade', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
  });

  afterEach(() => {
    appContextService.stop();

    // `jest.resetAllMocks` breaks a ton of tests in this file 🤷‍♂️
    mockAgentPolicyService.get.mockReset();
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
  });

  describe('_getUpgradePackagePolicyInfo', () => {
    let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
    beforeEach(() => {
      savedObjectsClient = createSavedObjectClientMock();
    });

    function mockPackage(pkgName: string) {
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
        package: {
          ...mockPackagePolicy.package,
          name: pkgName,
        },
      };

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'package-policy-id',
            type: 'abcd',
            references: [],
            version: '1.3.2',
            attributes,
          },
        ],
      });
    }

    it('should return success if package and policy versions match', async () => {
      mockPackage('apache');

      const response = await _getUpgradePackagePolicyInfo({
        id: 'package-policy-id',
        packagePolicyService,
        soClient: savedObjectsClient,
      });

      expect(response).toBeDefined();
    });

    it('should return error if package policy newer than package version', async () => {
      mockPackage('aws');

      await expect(
        _getUpgradePackagePolicyInfo({
          id: 'package-policy-id',
          packagePolicyService,
          soClient: savedObjectsClient,
        })
      ).rejects.toEqual(
        new PackagePolicyIneligibleForUpgradeError(
          "Package policy c6d16e42-c32d-4dce-8a88-113cfe276ad1's package version 0.9.0 of package aws is newer than the installed package version. Please install the latest version of aws."
        )
      );
    });

    it('should return error if package not installed', async () => {
      mockPackage('notinstalled');

      await expect(
        _getUpgradePackagePolicyInfo({
          id: 'package-policy-id',
          packagePolicyService,
          soClient: savedObjectsClient,
        })
      ).rejects.toEqual(new FleetError('Package notinstalled is not installed'));
    });
  });

  describe('getUpgradeDryRunDiff', () => {
    let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
    beforeEach(() => {
      savedObjectsClient = createSavedObjectClientMock();
    });
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
    });

    afterEach(() => {
      appContextService.stop();
    });
    it('should return no errors if there is no conflict to upgrade', async () => {
      const res = await _packagePoliciesGetUpgradeDryRunDiff({
        id: 'package-policy-id',
        soClient: savedObjectsClient,
        packagePolicyService,
        packagePolicy: {
          id: '123',
          name: 'test-123',
          package: {
            title: 'test',
            name: 'test',
            version: '1.0.1',
          },
          namespace: 'default',
          inputs: [
            {
              id: 'toto',
              enabled: true,
              streams: [],
              type: 'logs',
            },
          ],
        } as any,
        pkgVersion: '1.0.2',
      });

      expect(res.hasErrors).toBeFalsy();
      expect(res.agent_version_block).toBeUndefined();
    });

    it('should report the agents blocking the upgrade without an error', async () => {
      const agentVersionBlock = {
        package_name: 'test',
        package_version: '1.0.2',
        version_condition: '^9.4.0',
        blocked_count: 2,
        observed_versions: ['9.3.1'],
        min_version: '9.4.0',
      };
      jest
        .mocked(getAgentVersionBlocks)
        .mockResolvedValueOnce(new Map([['package-policy-id', agentVersionBlock]]));

      const res = await _packagePoliciesGetUpgradeDryRunDiff({
        id: 'package-policy-id',
        soClient: savedObjectsClient,
        packagePolicyService,
        packagePolicy: {
          id: '123',
          name: 'test-123',
          package: { title: 'test', name: 'test', version: '1.0.1' },
          namespace: 'default',
          policy_ids: ['agent-policy-1'],
          inputs: [{ id: 'toto', enabled: true, streams: [], type: 'logs' }],
        } as any,
        pkgVersion: '1.0.2',
      });

      expect(res.hasErrors).toBeFalsy();
      expect(res.statusCode).toBeUndefined();
      expect(res.agent_version_block).toEqual(agentVersionBlock);
      expect(getAgentVersionBlocks).toHaveBeenCalledWith([
        expect.objectContaining({
          key: 'package-policy-id',
          pkgInfo: expect.objectContaining({ version: '1.0.2' }),
          agentPolicyIds: ['agent-policy-1'],
        }),
      ]);
    });

    it('should pass the condition of the current package version', async () => {
      // Both package versions have an agent version condition
      (getPackageInfo as jest.Mock).mockImplementation(async (params) => ({
        ...(await mockedGetPackageInfo(params)),
        conditions: { agent: { version: params.pkgVersion === '1.0.2' ? '^9.4.0' : '^9.3.0' } },
      }));
      try {
        await _packagePoliciesGetUpgradeDryRunDiff({
          id: 'package-policy-id',
          soClient: savedObjectsClient,
          packagePolicyService,
          packagePolicy: {
            id: '123',
            name: 'test-123',
            package: { title: 'test', name: 'test', version: '1.0.1' },
            namespace: 'default',
            policy_ids: ['agent-policy-1'],
            inputs: [{ id: 'toto', enabled: true, streams: [], type: 'logs' }],
          } as any,
          pkgVersion: '1.0.2',
        });
      } finally {
        (getPackageInfo as jest.Mock).mockImplementation(mockedGetPackageInfo);
      }

      expect(getAgentVersionBlocks).toHaveBeenLastCalledWith([
        expect.objectContaining({
          key: 'package-policy-id',
          currentCondition: { versionCondition: '^9.3.0', agentPolicyIds: ['agent-policy-1'] },
        }),
      ]);
    });

    it('should check the agents of several package policies with a single query', async () => {
      jest.mocked(getAgentVersionBlocks).mockClear();
      const getPackagePolicy = jest.fn(
        async (_soClient: unknown, id: string) =>
          ({
            id,
            name: `test-${id}`,
            package: { title: 'test', name: 'test', version: '1.0.1' },
            namespace: 'default',
            policy_ids: [`agent-policy-${id}`],
            inputs: [{ id: 'toto', enabled: true, streams: [], type: 'logs' }],
          } as any)
      );

      const res = await _packagePoliciesGetUpgradeDryRunDiffs({
        ids: ['1', '2'],
        soClient: savedObjectsClient,
        packagePolicyService: { ...packagePolicyService, get: getPackagePolicy } as any,
        pkgVersion: '1.0.2',
      });

      expect(res).toHaveLength(2);
      expect(getAgentVersionBlocks).toHaveBeenCalledTimes(1);
      expect(getAgentVersionBlocks).toHaveBeenCalledWith([
        expect.objectContaining({ key: '1', agentPolicyIds: ['agent-policy-1'] }),
        expect.objectContaining({ key: '2', agentPolicyIds: ['agent-policy-2'] }),
      ]);
    });

    it('should only fail the upgrades that needed the agents when they cannot be checked', async () => {
      jest.mocked(getAgentVersionBlocks).mockRejectedValueOnce(new FleetError('boom'));
      const packagePolicyOf = (id: string, pkgName: string) =>
        ({
          id,
          name: `test-${id}`,
          package: { title: pkgName, name: pkgName, version: '1.0.1' },
          namespace: 'default',
          policy_ids: [`agent-policy-${id}`],
          inputs: [{ id: 'toto', enabled: true, streams: [], type: 'logs' }],
        } as any);
      const getPackagePolicy = jest.fn(async (_soClient: unknown, id: string) =>
        id === 'with-condition'
          ? packagePolicyOf(id, 'test-agent-condition')
          : packagePolicyOf(id, 'test')
      );

      const [withoutCondition, withCondition] = await _packagePoliciesGetUpgradeDryRunDiffs({
        ids: ['without-condition', 'with-condition'],
        soClient: savedObjectsClient,
        packagePolicyService: { ...packagePolicyService, get: getPackagePolicy } as any,
        pkgVersion: '1.0.2',
      });

      // The package without agent version condition didn't need the agents
      expect(withoutCondition.hasErrors).toBe(false);
      expect(withoutCondition.diff).toHaveLength(2);
      // The upgrade that needed them is not presented as eligible
      expect(withCondition.hasErrors).toBe(true);
      expect(withCondition.body?.message).toBe('boom');
    });

    it('should return errors if there is a conflict to upgrade', async () => {
      jest
        .mocked(getAgentTemplateAssetsMap)
        .mockResolvedValueOnce(
          new Map([
            ['/agent/input/stream.yml.hbs', Buffer.from('test: 1\n{{custom}}\n')],
          ]) as PackagePolicyAssetsMap
        );
      const res = await _packagePoliciesGetUpgradeDryRunDiff({
        id: 'package-policy-id',
        soClient: savedObjectsClient,
        packagePolicyService,
        packagePolicy: {
          id: '123',
          name: 'test-123',
          package: {
            title: 'test',
            name: 'test-duplicated-vars',
            version: '1.0.1',
          },
          namespace: 'default',
          inputs: [
            {
              id: 'toto',
              policy_template: 'test-duplicated-vars',
              enabled: true,
              streams: [],
              type: 'logs',
              vars: {
                custom: {
                  type: 'yaml',
                  value: 'test: 1\nduplicated: 2\n',
                },
              },
            },
          ],
        } as any,
        pkgVersion: '1.0.2',
      });

      expect(res.hasErrors).toBeTruthy();
      expect(res?.diff?.[1]?.errors?.[0].message).toContain(
        'Duplicated key "test" found in agent policy yaml, please check your yaml variables.'
      );
    });

    it('should return errors if there is an error with duplicated variables during upgrade', async () => {
      const res = await _packagePoliciesGetUpgradeDryRunDiff({
        id: 'package-policy-id',
        soClient: savedObjectsClient,
        packagePolicyService,
        packagePolicy: {
          id: '123',
          name: 'test-123',
          package: {
            title: 'test',
            name: 'test-conflict',
            version: '1.0.1',
          },
          namespace: 'default',
          inputs: [
            {
              id: 'toto',
              enabled: true,
              streams: [],
              type: 'logs',
            },
          ],
        } as any,
        pkgVersion: '1.0.2',
      });

      expect(res.hasErrors).toBeTruthy();
    });
  });

  describe('bulk upgrade', () => {
    let soClient: jest.Mocked<SavedObjectsClientContract>;
    beforeEach(() => {
      soClient = createSavedObjectClientMock();
    });
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
    });

    afterEach(() => {
      appContextService.stop();
    });
    it('should return no errors if bulk upgrading 2 package policies', async () => {
      soClient.get.mockImplementation((type, id) =>
        Promise.resolve({
          id,
          type: 'abcd',
          references: [],
          version: '0.9.0',
          attributes: { ...createPackagePolicyMock(), id },
        })
      );

      soClient.bulkGet.mockImplementation((objects) =>
        Promise.resolve({
          saved_objects: objects.map(({ id }) => ({
            id,
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: { ...createPackagePolicyMock(), id, name: id },
          })),
        })
      );
      soClient.bulkUpdate.mockImplementation((objects) =>
        Promise.resolve({
          saved_objects: objects.map(({ id }) => ({
            id,
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              id,
              name: id,
              ...{
                package: {
                  name: 'endpoint',
                  version: '1.0.0',
                },
              },
            },
          })),
        })
      );

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesBulkUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        ids: ['package-policy-id', 'package-policy-id-2'],
      });

      expect(res).toEqual([
        {
          id: 'package-policy-id',
          name: 'package-policy-id',
          success: true,
        },
        {
          id: 'package-policy-id-2',
          name: 'package-policy-id-2',
          success: true,
        },
      ]);
    });
  });

  describe('upgrade', () => {
    let soClient: jest.Mocked<SavedObjectsClientContract>;
    beforeEach(() => {
      soClient = createSavedObjectClientMock();
    });
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
    });

    afterEach(() => {
      appContextService.stop();
    });
    it('should omit spaceIds when upgrading package policies with spaceIds', async () => {
      mockAgentPolicyService.get.mockResolvedValue({
        ...createAgentPolicyMock({ space_ids: ['test'] }),
      });
      soClient.bulkGet.mockImplementation((objects) =>
        Promise.resolve({
          saved_objects: objects.map(({ id }) => ({
            id,
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: { ...createPackagePolicyMock(), name: id, spaceIds: ['test'] },
          })),
        })
      );
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        id: 'package-policy-id-test-spaceId',
      });

      expect(res).toEqual([
        {
          id: 'package-policy-id-test-spaceId',
          name: 'package-policy-id-test-spaceId',
          success: true,
        },
      ]);

      expect(soClient.update).toHaveBeenCalledWith(
        'ingest-package-policies',
        'package-policy-id-test-spaceId',
        expect.not.objectContaining({
          spaceIds: expect.anything(),
        }),
        expect.anything()
      );
    });

    it('should infer var_group_selections from existing vars when the policy has none', async () => {
      // A pre-var_groups policy configured with direct access keys must not end up
      // presented as identity_federation (the first option) after upgrade
      mockAgentPolicyService.get.mockResolvedValue(createAgentPolicyMock());
      soClient.bulkGet.mockImplementation((objects) =>
        Promise.resolve({
          saved_objects: objects.map(({ id }) => ({
            id,
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              name: id,
              package: { name: 'test-var-groups', title: 'Test Var Groups', version: '1.0.0' },
              vars: {
                access_key_id: { type: 'text', value: 'AKIA123' },
                secret_access_key: { type: 'password', value: 'secret' },
                role_arn: { type: 'text', value: '' },
              },
            },
          })),
        })
      );
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        id: 'package-policy-id-test-var-groups',
      });

      expect(res).toEqual([
        {
          id: 'package-policy-id-test-var-groups',
          name: 'package-policy-id-test-var-groups',
          success: true,
        },
      ]);

      expect(soClient.update).toHaveBeenCalledWith(
        'ingest-package-policies',
        'package-policy-id-test-var-groups',
        expect.objectContaining({
          var_group_selections: { credential_type: 'direct_access_key' },
        }),
        expect.anything()
      );
    });

    it('should preserve existing var_group_selections on upgrade', async () => {
      mockAgentPolicyService.get.mockResolvedValue(createAgentPolicyMock());
      soClient.bulkGet.mockImplementation((objects) =>
        Promise.resolve({
          saved_objects: objects.map(({ id }) => ({
            id,
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              name: id,
              package: { name: 'test-var-groups', title: 'Test Var Groups', version: '1.0.0' },
              vars: {
                // Access keys populated, but the user explicitly saved identity_federation:
                // the stored selection must win over inference
                access_key_id: { type: 'text', value: 'AKIA123' },
                secret_access_key: { type: 'password', value: 'secret' },
                role_arn: { type: 'text', value: 'arn:aws:iam::123:role/x' },
              },
              var_group_selections: { credential_type: 'identity_federation' },
            },
          })),
        })
      );
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await _packagePoliciesUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        id: 'package-policy-id-test-var-groups-saved',
      });

      expect(soClient.update).toHaveBeenCalledWith(
        'ingest-package-policies',
        'package-policy-id-test-var-groups-saved',
        expect.objectContaining({
          var_group_selections: { credential_type: 'identity_federation' },
        }),
        expect.anything()
      );
    });
  });
});
