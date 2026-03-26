/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import type { PackagePolicyClient } from '../package_policy_service';

import { PackagePolicyNameExistsError } from '../../errors';

import {
  validatePolicyNamespaceForSpace,
  validatePackagePoliciesUniqueNameAcrossSpaces,
} from './policy_namespaces';

jest.mock('../app_context');

describe('validatePolicyNamespaceForSpace', () => {
  function createSavedsClientMock(settingsAttributes?: any) {
    const client = savedObjectsClientMock.create();

    if (settingsAttributes) {
      client.get.mockResolvedValue({
        attributes: settingsAttributes,
      } as any);
    } else {
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('Not found')
      );
    }

    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(client);

    return client;
  }

  beforeEach(() => {
    jest
      .mocked(appContextService.getExperimentalFeatures)
      .mockReturnValue({ useSpaceAwareness: true } as any);
  });

  it('should retrieve settings based on given spaceId', async () => {
    const soClient = createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'test',
    });

    expect(soClient.get).toBeCalledWith('fleet-space-settings', 'test1-default-settings');
  });

  it('should retrieve default space settings based if no spaceId is provided', async () => {
    const soClient = createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      namespace: 'test',
    });

    expect(soClient.get).toBeCalledWith('fleet-space-settings', 'default-default-settings');
  });

  it('should accept valid namespace if there is some allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock({
      allowed_namespace_prefixes: ['tata', 'test', 'toto'],
    });
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'test',
    });
  });

  it('should accept valid namespace matching prefix if there is some allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock({
      allowed_namespace_prefixes: ['tata', 'test', 'toto'],
    });
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should accept any namespace if there is no settings configured', async () => {
    createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should accept any namespace if there is no allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should throw if the namespace is not matching allowed_namespace_prefixes', async () => {
    createSavedsClientMock({ allowed_namespace_prefixes: ['tata', 'test', 'toto'] });
    await expect(
      validatePolicyNamespaceForSpace({
        spaceId: 'test1',
        namespace: 'notvalid',
      })
    ).rejects.toThrowError(/Invalid namespace, supported namespace prefixes: tata, test, toto/);
  });

  it('should not validate if feature flag is off', async () => {
    jest
      .mocked(appContextService.getExperimentalFeatures)
      .mockReturnValue({ useSpaceAwareness: false } as any);
    createSavedsClientMock({ allowed_namespace_prefixes: ['tata', 'test', 'toto'] });

    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'notvalid',
    });
  });
});

const packagePolicy1 = {
  agents: 100,
  created_at: '2022-12-19T20:43:45.879Z',
  created_by: 'elastic',
  description: '',
  enabled: true,
  id: '1',
  inputs: [],
  name: 'Package Policy 1',
  namespace: 'default',
  package: {
    name: 'test-package',
    title: 'Test Package',
    version: '1.0.0',
  },
  policy_ids: ['agent-policy-id-a'],
  revision: 1,
  updated_at: '2022-12-19T20:43:45.879Z',
  updated_by: 'elastic',
  version: '1.0.0',
  spaceIds: ['space1'],
};

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;

jest.mock(
  '../package_policy',
  (): {
    packagePolicyService: jest.Mocked<PackagePolicyClient>;
  } => {
    return {
      packagePolicyService: {
        buildPackagePolicyFromPackage: jest.fn(),
        bulkCreate: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        getByIDs: jest.fn(),
        list: jest.fn(),
        listIds: jest.fn(),
        update: jest.fn(),

        runExternalCallbacks: jest.fn(),
        upgrade: jest.fn(),
        bulkUpgrade: jest.fn(),
        getUpgradeDryRunDiff: jest.fn(),
        enrichPolicyWithDefaultsFromPackage: jest.fn(),
      } as any,
    };
  }
);

describe('validatePackagePoliciesUniqueNameAcrossSpaces', () => {
  const soClient = savedObjectsClientMock.create();
  jest
    .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension)
    .mockReturnValue(soClient);

  it('should not validate if package policies are empty', async () => {
    await expect(validatePackagePoliciesUniqueNameAcrossSpaces([], ['space1']));
  });

  it('should throw if there are other policies with the same package name', async () => {
    const packagePolicyOnOtherSpace = {
      ...packagePolicy1,
      spaceIds: ['default'],
      id: '3',
    };
    packagePolicyServiceMock.list.mockResolvedValue({
      total: 1,
      perPage: 10,
      page: 1,
      items: [packagePolicyOnOtherSpace],
    });
    await expect(
      validatePackagePoliciesUniqueNameAcrossSpaces([packagePolicy1], ['default'])
    ).rejects.toThrowError(
      new PackagePolicyNameExistsError(
        'An integration policy with the name Package Policy 1 already exists in space "default". Please rename it or choose a different name.'
      )
    );
  });

  it('should throw if there are other policies with the same package name in different spaces', async () => {
    const packagePolicyOnSpace1 = {
      ...packagePolicy1,
      spaceIds: ['space1'],
      id: '3',
    };
    const packagePolicyOnSpace2 = {
      ...packagePolicy1,
      spaceIds: ['space2'],
      id: '4',
    };
    packagePolicyServiceMock.list.mockResolvedValue({
      total: 1,
      perPage: 10,
      page: 1,
      items: [packagePolicyOnSpace1, packagePolicyOnSpace2],
    });
    await expect(
      validatePackagePoliciesUniqueNameAcrossSpaces([packagePolicy1], ['default', 'space1'])
    ).rejects.toThrowError(
      new PackagePolicyNameExistsError(
        'An integration policy with the name Package Policy 1 already exists in space "space1". Please rename it or choose a different name.'
      )
    );
  });

  it('should not throw if there are other policies with the same package name but in a space different than the target one', async () => {
    const packagePolicyOnOtherSpace = {
      ...packagePolicy1,
      spaceIds: ['test'],
      id: '3',
    };
    packagePolicyServiceMock.list.mockResolvedValue({
      total: 1,
      perPage: 10,
      page: 1,
      items: [packagePolicyOnOtherSpace],
    });
    await expect(validatePackagePoliciesUniqueNameAcrossSpaces([packagePolicy1], ['default']));
  });

  it('should exclude the policy itself', async () => {
    packagePolicyServiceMock.list.mockResolvedValue({
      total: 1,
      perPage: 10,
      page: 1,
      items: [packagePolicy1],
    });
    await expect(validatePackagePoliciesUniqueNameAcrossSpaces([packagePolicy1], ['default']));
  });

  it('should not throw if there are no other policies with the same package name', async () => {
    packagePolicyServiceMock.list.mockResolvedValue({
      total: 1,
      perPage: 10,
      page: 1,
      items: [],
    });
    await expect(validatePackagePoliciesUniqueNameAcrossSpaces([packagePolicy1], ['default']));
  });
});
