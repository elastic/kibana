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
  installPackage: jest.fn().mockResolvedValue({ pkgName }),
}));

describe('rollbackInstallation', () => {
  it('should throw an error if no previous package version is found', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { previous_version: null },
          },
        ],
      }),
    } as any;

    await expect(
      rollbackInstallation({ esClient, savedObjectsClient, pkgName, spaceId, spaceIds })
    ).rejects.toThrow('No previous version found for package');
  });

  it('should throw an error if at least one package policy does not have a previous version', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { previous_version: oldPkgVersion },
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
    ).rejects.toThrow('No previous version found for least one package policy');
  });

  it('should throw an error if at least one package policy has a different previous version', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { previous_version: oldPkgVersion },
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
    ).rejects.toThrow('Wrong previous version for least one package policy');
  });

  it('should rollback package policies and install the package on the previous version', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: pkgName,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            attributes: { previous_version: oldPkgVersion },
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
    expect(installPackage).toHaveBeenCalledWith({
      esClient,
      savedObjectsClient,
      installSource: 'registry',
      pkgkey: `${pkgName}-${oldPkgVersion}`,
      spaceId,
      force: true,
    });
    expect(packagePolicyServiceMock.rollback).toHaveBeenCalled();
  });
});
