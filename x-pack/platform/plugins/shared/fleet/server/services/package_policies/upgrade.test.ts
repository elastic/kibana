/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { createPackagePolicyMock } from '../../../common/mocks';

import { createAppContextStartContractMock, createSavedObjectClientMock } from '../../mocks';

import { FleetError, PackagePolicyIneligibleForUpgradeError } from '../../errors';

import { packagePolicyService } from '../package_policy';
import { appContextService } from '../app_context';

import { auditLoggingService } from '../audit_logging';
import { agentPolicyService } from '../agent_policy';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';

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
    });

    it('should no errors if there is a conflict to upgrade', async () => {
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
  });
});
