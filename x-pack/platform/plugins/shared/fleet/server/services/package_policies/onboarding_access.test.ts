/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { PackagePolicy } from '../../../common/types';
import { PackagePolicyManagedByOnboardingError } from '../../errors';
import { packagePolicyService } from '../package_policy';

import { assertOnboardingAccess, assertOnboardingAccessByIds } from './onboarding_access';

jest.mock('../package_policy', () => ({
  packagePolicyService: { getByIDs: jest.fn() },
}));

const mockedGetByIDs = packagePolicyService.getByIDs as jest.MockedFunction<
  typeof packagePolicyService.getByIDs
>;

describe('assertOnboardingAccess', () => {
  const managed = { id: 'pp-managed', onboarding_deployment_id: 'deploy-1' };
  const cleared = { id: 'pp-cleared', onboarding_deployment_id: null };
  const unmanaged = { id: 'pp-unmanaged' };

  it('allows changes to policies no onboarding deployment manages', () => {
    expect(() => assertOnboardingAccess([cleared, unmanaged], undefined)).not.toThrow();
  });

  it('allows changes with the id of the deployment that manages the policies', () => {
    expect(() => assertOnboardingAccess([managed, unmanaged], 'deploy-1')).not.toThrow();
  });

  it.each([
    ['no id', undefined],
    ['the id of another deployment', 'deploy-2'],
  ])('rejects changes to managed policies with %s', (_, onboardingDeploymentId) => {
    expect(() => assertOnboardingAccess([managed, unmanaged], onboardingDeploymentId)).toThrow(
      new PackagePolicyManagedByOnboardingError(
        'Package policies managed by a cloud onboarding instance can only be changed from the onboarding flow. Offending IDs: pp-managed.'
      )
    );
  });
});

describe('assertOnboardingAccessByIds', () => {
  const soClient = savedObjectsClientMock.create();

  it('reads the policies, skipping missing ones', async () => {
    mockedGetByIDs.mockResolvedValue([
      { id: 'pp-managed', onboarding_deployment_id: 'deploy-1' } as PackagePolicy,
    ]);

    await expect(
      assertOnboardingAccessByIds(soClient, ['pp-managed', 'pp-missing'], undefined)
    ).rejects.toThrow(PackagePolicyManagedByOnboardingError);
    expect(mockedGetByIDs).toHaveBeenCalledWith(soClient, ['pp-managed', 'pp-missing'], {
      ignoreMissing: true,
    });
  });

  it('allows the change when no policy is found', async () => {
    mockedGetByIDs.mockResolvedValue([]);

    await expect(assertOnboardingAccessByIds(soClient, ['pp-missing'], undefined)).resolves.toBe(
      undefined
    );
  });
});
