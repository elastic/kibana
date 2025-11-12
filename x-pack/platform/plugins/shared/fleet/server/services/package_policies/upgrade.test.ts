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

import {
  _getUpgradePackagePolicyInfo,
  _packagePoliciesBulkUpgrade,
  _packagePoliciesGetUpgradeDryRunDiff,
  _packagePoliciesUpgrade,
} from './upgrade';

jest.mock('../spaces/helpers');

jest.mock('../license');

async function mockedGetInstallation(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { version: '0.3.3' };
  if (params.pkgName === 'endpoint') pkg = { version: '1.0.0' };
  if (params.pkgName === 'test') pkg = { version: '0.0.1' };
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

jest.mock('../agents/crud', () => {
  return {
    fetchAllAgentsByKuery: jest.fn(),
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
            attributes: { ...createPackagePolicyMock(), id, name: id },
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

    it('should fail an item when agent version constraint is not met and force is false', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'pp-1',
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              id: 'pp-1',
              name: 'pp-1',
              policy_ids: ['ap-1'],
              is_managed: false,
              package: { name: 'endpoint', title: 'Endpoint', version: '0.9.0' },
            },
          },
        ],
      } as any);
      soClient.bulkUpdate.mockResolvedValue({ saved_objects: [] } as any);

      const { getPackageInfo } = jest.requireMock('../epm/packages');
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      const { fetchAllAgentsByKuery } = jest.requireMock('../agents/crud');
      fetchAllAgentsByKuery.mockResolvedValue(
        (async function* () {
          yield [{ id: 'a1', local_metadata: { elastic: { agent: { version: '8.11.0' } } } }];
        })()
      );

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesBulkUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        ids: ['pp-1'],
        options: { force: false },
      });

      expect(res[0].success).toBe(false);
      expect(String((res[0] as any).body?.message)).toMatch(/required version range.*8\.12\.0/i);
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

      expect(soClient.update).toBeCalledWith(
        'ingest-package-policies',
        'package-policy-id-test-spaceId',
        expect.not.objectContaining({
          spaceIds: expect.anything(),
        }),
        expect.anything()
      );
    });

    it('should reject upgrade if agent version constraint is not satisfied and force is false', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'pp-2',
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              id: 'pp-2',
              name: 'pp-2',
              policy_ids: ['ap-1'],
              is_managed: false,
              package: { name: 'endpoint', title: 'Endpoint', version: '0.9.0' },
            },
          },
        ],
      } as any);

      const { getPackageInfo } = jest.requireMock('../epm/packages');
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      const { fetchAllAgentsByKuery } = jest.requireMock('../agents/crud');
      fetchAllAgentsByKuery.mockResolvedValue(
        (async function* () {
          yield [{ id: 'a1', local_metadata: { elastic: { agent: { version: '8.11.0' } } } }];
        })()
      );

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        id: 'pp-2',
        options: { force: false },
      });

      expect(res[0].success).toBe(false);
      expect(String((res[0] as any).body?.message)).toMatch(/required version range.*8\.12\.0/i);
    });

    it('should allow upgrade with force true if agent version constraint is not satisfied', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'pp-3',
            type: 'abcd',
            references: [],
            version: '0.9.0',
            attributes: {
              ...createPackagePolicyMock(),
              id: 'pp-3',
              name: 'pp-3',
              policy_ids: ['ap-1'],
              is_managed: false,
              package: { name: 'endpoint', title: 'Endpoint', version: '0.9.0' },
            },
          },
        ],
      } as any);

      // Mock packagePolicyService.update to succeed
      jest.spyOn(packagePolicyService, 'update').mockResolvedValue({
        ...createPackagePolicyMock(),
        id: 'pp-3',
        name: 'pp-3',
        package: { name: 'endpoint', title: 'Endpoint', version: '1.0.0' },
      } as any);

      const { getPackageInfo } = jest.requireMock('../epm/packages');
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      const { fetchAllAgentsByKuery } = jest.requireMock('../agents/crud');
      fetchAllAgentsByKuery.mockResolvedValue(
        (async function* () {
          yield [{ id: 'a1', local_metadata: { elastic: { agent: { version: '8.11.0' } } } }];
        })()
      );

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await _packagePoliciesUpgrade({
        packagePolicyService,
        soClient,
        esClient,
        id: 'pp-3',
        options: { force: true },
      });

      expect(res[0].success).toBe(true);
    });
  });
});
