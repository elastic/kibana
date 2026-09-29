/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

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

import {
  _getUpgradePackagePolicyInfo,
  _packagePoliciesBulkUpgrade,
  _packagePoliciesGetUpgradeDryRunDiff,
  _packagePoliciesUpgrade,
} from './upgrade';

vi.mock('../spaces/helpers');

vi.mock('../license');

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

vi.mock('../epm/packages', () => {
  return {
    getPackageInfo: vi.fn().mockImplementation(mockedGetPackageInfo),
    getInstallation: mockedGetInstallation,
    ensureInstalledPackage: vi.fn(),
  };
});

vi.mock('../../../common/services/package_to_package_policy', async () => {
      const mocked = {
      ...(await vi.importActual('../../../common/services/package_to_package_policy')),
      packageToPackagePolicy: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../epm/registry', () => {
      const mocked = {
      getPackage: vi.fn().mockResolvedValue({ assetsMap: [] }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../epm/packages/get', () => {
      const mocked = {
      getPackageAssetsMap: vi.fn().mockResolvedValue(new Map()),
      getAgentTemplateAssetsMap: vi.fn().mockResolvedValue(new Map()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../agent_policy');
const mockAgentPolicyService = agentPolicyService as Mocked<typeof agentPolicyService>;

vi.mock('../epm/packages/cleanup', () => {
  return {
    removeOldAssets: vi.fn(),
  };
});

vi.mock('../upgrade_sender', () => {
  return {
    sendTelemetryEvents: vi.fn(),
  };
});

vi.mock('../audit_logging');
const mockedAuditLoggingService = auditLoggingService as Mocked<typeof auditLoggingService>;

vi.mock('../secrets', () => {
      const mocked = {
      isSecretStorageEnabled: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('Upgrade', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    vi.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
  });

  afterEach(() => {
    appContextService.stop();

    // `jest.resetAllMocks` breaks a ton of tests in this file 🤷‍♂️
    mockAgentPolicyService.get.mockReset();
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
  });

  describe('_getUpgradePackagePolicyInfo', () => {
    let savedObjectsClient: Mocked<SavedObjectsClientContract>;
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
    let savedObjectsClient: Mocked<SavedObjectsClientContract>;
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
    });

    it('should return errors if there is a conflict to upgrade', async () => {
      vi
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
    let soClient: Mocked<SavedObjectsClientContract>;
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
    let soClient: Mocked<SavedObjectsClientContract>;
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

      expect(soClient.update).toBeCalledWith(
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

      expect(soClient.update).toBeCalledWith(
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
