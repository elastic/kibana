/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGES_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';
import { agentPolicyService, appContextService, packagePolicyService } from '../..';
import type { PackagePolicyClient } from '../../package_policy_service';

import { sendTelemetryEvents } from '../../upgrade_sender';

import { installPackage } from './install';
import {
  bulkRollbackAvailableCheck,
  isIntegrationRollbackTTLExpired,
  rollbackAvailableCheck,
  rollbackInstallation,
} from './rollback';

jest.mock('../..', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ info: jest.fn(), debug: jest.fn() } as any),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
    getTelemetryEventsSender: jest.fn(),
    getConfig: jest.fn().mockReturnValue({}),
    getInternalUserSOClient: jest.fn(),
  },
  packagePolicyService: {
    getPackagePolicySavedObjects: jest.fn(),
    rollback: jest.fn(),
    restoreRollback: jest.fn(),
    cleanupRollbackSavedObjects: jest.fn(),
    bumpAgentPolicyRevisionAfterRollback: jest.fn(),
  },
  agentPolicyService: {
    getByIds: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../audit_logging');

jest.mock('../../upgrade_sender');

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;
const agentPolicyServiceMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const esClient = {} as any;
const pkgName = 'test-package';
const oldPkgVersion = '1.0.0';
const newPkgVersion = '1.5.0';
const spaceId = 'default';

const sendTelemetryEventsMock = sendTelemetryEvents as jest.Mock;

jest.mock('./install', () => ({
  installPackage: jest.fn(),
}));

describe('rollbackInstallation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if the package is not installed', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [],
      }),
    });
    await expect(
      rollbackInstallation({ esClient, currentUserPolicyIds: [], pkgName, spaceId })
    ).rejects.toThrow('Package test-package not found');
  });

  it('should throw an error if no previous package version is found', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { install_source: 'registry', previous_version: null },
          },
        ],
      }),
    });

    await expect(
      rollbackInstallation({ esClient, currentUserPolicyIds: [], pkgName, spaceId })
    ).rejects.toThrow('No previous version found for package test-package');
  });

  it('should throw an error if the package was not installed from the registry', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { install_source: 'upload', previous_version: oldPkgVersion },
          },
        ],
      }),
    });

    await expect(
      rollbackInstallation({ esClient, currentUserPolicyIds: [], pkgName, spaceId })
    ).rejects.toThrow('test-package was not installed from the registry (install source: upload)');
  });

  it('should throw an error if TTL expired', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              install_started_at: '2023-01-01T00:00:00Z',
            },
          },
        ],
      }),
    });

    await expect(
      rollbackInstallation({ esClient, currentUserPolicyIds: [], pkgName, spaceId })
    ).rejects.toThrow('Rollback not allowed as TTL expired');
  });

  it('should throw an error if at least one package policy does not have a previous version', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    });
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
      ],
    } as any);

    await expect(
      rollbackInstallation({
        esClient,
        currentUserPolicyIds: ['test-package-policy'],
        pkgName,
        spaceId,
      })
    ).rejects.toThrow('No previous version found for package policies: test-package-policy');
  });

  it('should throw an error if at least one package policy is not upgraded to the current package version', async () => {
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
        {
          id: 'test-package-policy2',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
      ],
    } as any);

    await expect(
      rollbackInstallation({
        esClient,
        currentUserPolicyIds: ['test-package-policy'],
        pkgName,
        spaceId,
      })
    ).rejects.toThrow(
      `Rollback not available because some integration policies are not upgraded to version ${newPkgVersion}`
    );
  });

  it('should throw an error if at least one package policy has a different previous version', async () => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    });
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: '1.2.0' },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);

    await expect(
      rollbackInstallation({
        esClient,
        currentUserPolicyIds: ['test-package-policy', 'test-package-policy:prev'],
        pkgName,
        spaceId,
      })
    ).rejects.toThrow(
      'Rollback not available because not all integration policies were upgraded from the same previous version 1.0.0'
    );
  });

  it('should throw an error and cancel the rollback if the package could not be installed on the previous version', async () => {
    (installPackage as jest.Mock).mockResolvedValue({ error: new Error('Installation failed') });
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    } as any;
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      savedObjectsClient
    );
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);

    await expect(
      rollbackInstallation({
        esClient,
        currentUserPolicyIds: ['test-package-policy', 'test-package-policy:prev'],
        pkgName,
        spaceId,
      })
    ).rejects.toThrow(
      'Failed to rollback package test-package to version 1.0.0: Installation failed'
    );
    expect(packagePolicyServiceMock.rollback).toHaveBeenCalled();
    expect(installPackage).toHaveBeenCalledWith({
      esClient,
      savedObjectsClient,
      installSource: 'registry',
      pkgkey: `${pkgName}-${oldPkgVersion}`,
      spaceId,
      force: true,
    });
    expect(packagePolicyServiceMock.restoreRollback).toHaveBeenCalled();
    expect(packagePolicyServiceMock.cleanupRollbackSavedObjects).not.toHaveBeenCalled();
    expect(packagePolicyServiceMock.bumpAgentPolicyRevisionAfterRollback).not.toHaveBeenCalled();
    expect(sendTelemetryEventsMock).toHaveBeenCalledWith(expect.anything(), undefined, {
      packageName: pkgName,
      currentVersion: newPkgVersion,
      newVersion: oldPkgVersion,
      status: 'failure',
      eventType: 'package-rollback',
      errorMessage: 'Failed to rollback package test-package to version 1.0.0: Installation failed',
    });
  });

  it('should rollback package policies and install the package on the previous version', async () => {
    (installPackage as jest.Mock).mockResolvedValue({ pkgName });
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    } as any;
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      savedObjectsClient
    );
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);

    await rollbackInstallation({
      esClient,
      currentUserPolicyIds: ['test-package-policy', 'test-package-policy:prev'],
      pkgName,
      spaceId,
    });
    expect(packagePolicyServiceMock.rollback).toHaveBeenCalled();
    expect(installPackage).toHaveBeenCalledWith({
      esClient,
      savedObjectsClient,
      installSource: 'registry',
      pkgkey: `${pkgName}-${oldPkgVersion}`,
      spaceId,
      force: true,
    });
    expect(packagePolicyServiceMock.restoreRollback).not.toHaveBeenCalled();
    expect(packagePolicyServiceMock.cleanupRollbackSavedObjects).toHaveBeenCalled();
    expect(packagePolicyServiceMock.bumpAgentPolicyRevisionAfterRollback).toHaveBeenCalled();
    expect(sendTelemetryEventsMock).toHaveBeenCalledWith(expect.anything(), undefined, {
      packageName: pkgName,
      currentVersion: newPkgVersion,
      newVersion: oldPkgVersion,
      status: 'success',
      eventType: 'package-rollback',
      errorMessage: undefined,
    });
  });

  it('should throw error on rollback when package policy is managed', async () => {
    (installPackage as jest.Mock).mockResolvedValue({ pkgName });
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { install_source: 'registry', previous_version: oldPkgVersion },
          },
        ],
      }),
    } as any;
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      savedObjectsClient
    );
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);
    agentPolicyServiceMock.getByIds.mockResolvedValue([
      {
        is_managed: true,
      } as any,
    ]);

    await expect(
      rollbackInstallation({
        esClient,
        currentUserPolicyIds: ['test-package-policy', 'test-package-policy:prev'],
        pkgName,
        spaceId,
      })
    ).rejects.toThrow('Cannot rollback integration with managed package policies');
  });

  it('should throw error on rollback when current user does not have access to all package policies', async () => {
    (installPackage as jest.Mock).mockResolvedValue({ pkgName });
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    } as any;
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      savedObjectsClient
    );
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);
    agentPolicyServiceMock.getByIds.mockResolvedValue([{} as any]);

    await expect(
      rollbackInstallation({ esClient, currentUserPolicyIds: [], pkgName, spaceId })
    ).rejects.toThrow('Not authorized to rollback integration policies in all spaces');
  });
});

describe('isIntegrationRollbackTTLExpired', () => {
  it('should return true if integration rollback TTL is expired', () => {
    const installStartedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago
    const isExpired = isIntegrationRollbackTTLExpired(installStartedAt);
    expect(isExpired).toBe(true);
  });

  it('should return false if integration rollback TTL is not expired', () => {
    const installStartedAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(); // 6 days ago
    const isExpired = isIntegrationRollbackTTLExpired(installStartedAt);
    expect(isExpired).toBe(false);
  });

  it('should return true if integration rollback TTL is expired with changed config', () => {
    (appContextService.getConfig as jest.Mock).mockReturnValue({
      integrationRollbackTTL: '1h',
    });
    const installStartedAt = new Date(Date.now() - 60 * 60 * 1000 - 100).toISOString();
    const isExpired = isIntegrationRollbackTTLExpired(installStartedAt);
    expect(isExpired).toBe(true);
  });

  it('should return false if integration rollback TTL is not expired with changed config', () => {
    (appContextService.getConfig as jest.Mock).mockReturnValue({
      integrationRollbackTTL: '1h',
    });
    const installStartedAt = new Date(Date.now() - 60 * 60 * 1000 + 100).toISOString();
    const isExpired = isIntegrationRollbackTTLExpired(installStartedAt);
    expect(isExpired).toBe(false);
  });
});

describe('rollbackAvailableCheck', () => {
  beforeEach(() => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: {
              name: pkgName,
              install_source: 'registry',
              previous_version: oldPkgVersion,
              version: newPkgVersion,
            },
          },
        ],
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return isAvailable: false if at least one package policy is not upgraded to the current package version', async () => {
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
        {
          id: 'test-package-policy2',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
      ],
    } as any);

    const response = await rollbackAvailableCheck(pkgName, []);

    expect(response).toEqual({
      isAvailable: false,
      reason: `Rollback not available because some integration policies are not upgraded to version ${newPkgVersion}`,
    });
  });

  it('should return isAvailable: true if all package policies are upgraded to the current package version', async () => {
    packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'test-package-policy',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
            revision: 3,
            latest_revision: true,
          },
        },
        {
          id: 'test-package-policy:prev',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: `${pkgName}-1`,
            package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
            revision: 1,
            latest_revision: false,
          },
        },
      ],
    } as any);

    const response = await rollbackAvailableCheck(pkgName, [
      'test-package-policy',
      'test-package-policy:prev',
    ]);

    expect(response).toEqual({
      isAvailable: true,
    });
  });

  describe('bulkRollbackAvailableCheck', () => {
    it('should return isAvailable: true if installed package has rollback available', async () => {
      packagePolicyServiceMock.getPackagePolicySavedObjects.mockResolvedValue({
        saved_objects: [
          {
            id: 'test-package-policy',
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            attributes: {
              name: `${pkgName}-1`,
              package: { name: pkgName, title: 'Test Package', version: newPkgVersion },
              revision: 3,
              latest_revision: true,
            },
          },
          {
            id: 'test-package-policy:prev',
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            attributes: {
              name: `${pkgName}-1`,
              package: { name: pkgName, title: 'Test Package', version: oldPkgVersion },
              revision: 1,
              latest_revision: false,
            },
          },
        ],
      } as any);

      const response = await bulkRollbackAvailableCheck({} as any);

      expect(response).toEqual({
        'test-package': {
          isAvailable: true,
        },
      });
    });
  });
});
