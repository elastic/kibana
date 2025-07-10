/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGES_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';
import { packagePolicyService } from '../..';
import type { PackagePolicyClient } from '../../package_policy_service';

import { installPackage } from './install';
import { rollbackInstallation } from './rollback';

jest.mock('../..', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ info: jest.fn() } as any),
  },
  packagePolicyService: {
    getPackagePolicySavedObjects: jest.fn(),
    rollback: jest.fn(),
    restoreRollback: jest.fn(),
    cleanupRollbackSavedObjects: jest.fn(),
    bumpAgentPolicyRevisionAfterRollback: jest.fn(),
  },
}));

jest.mock('../../audit_logging');

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;

const esClient = {} as any;
const pkgName = 'test-package';
const oldPkgVersion = '1.0.0';
const newPkgVersion = '1.5.0';
const spaceId = 'default';
const spaceIds = ['default'];

jest.mock('./install', () => ({
  installPackage: jest.fn(),
}));

describe('rollbackInstallation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if the package is not installed', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [],
      }),
    } as any;

    await expect(
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow('Package test-package not found');
  });

  it('should throw an error if no previous package version is found', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { install_source: 'registry', previous_version: null },
          },
        ],
      }),
    } as any;

    await expect(
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow('No previous version found for package test-package');
  });

  it('should throw an error if the package was not installed from the registry', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { install_source: 'upload', previous_version: oldPkgVersion },
          },
        ],
      }),
    } as any;

    await expect(
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow('test-package was not installed from the registry (install source: upload)');
  });

  it('should throw an error if at least one package policy does not have a previous version', async () => {
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
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow('No previous version found for package policies: test-package-policy');
  });

  it('should throw an error if at least one package policy has a different previous version', async () => {
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
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow(
      'Wrong previous version for package policies: test-package-policy:prev (version: 1.2.0, expected: 1.0.0)'
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
            attributes: { install_source: 'registry', previous_version: oldPkgVersion },
          },
        ],
      }),
    } as any;
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
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
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
  });

  it('should rollback package policies and install the package on the previous version', async () => {
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

    await rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds });
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
  });
});
