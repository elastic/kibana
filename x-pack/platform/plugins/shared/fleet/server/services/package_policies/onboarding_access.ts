/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { PackagePolicy } from '../../../common/types';
import { PackagePolicyManagedByOnboardingError } from '../../errors';
import { packagePolicyService } from '../package_policy';

/**
 * Package policies managed by a cloud onboarding deployment can only be updated or deleted from the
 * onboarding flow, which identifies itself by passing the id of the deployment that manages them.
 * This guards against accidental changes from elsewhere in Fleet; it is not an authorization check.
 * The public update and delete routes and the agent policy delete route apply it. Package upgrades,
 * which keep the policy's configuration, and Fleet's internal changes are not affected.
 */
export function assertOnboardingAccess(
  packagePolicies: Array<Pick<PackagePolicy, 'id' | 'onboarding_deployment_id'>>,
  onboardingDeploymentId: string | undefined
): void {
  const offendingIds = packagePolicies
    .filter(
      (packagePolicy) =>
        packagePolicy.onboarding_deployment_id &&
        packagePolicy.onboarding_deployment_id !== onboardingDeploymentId
    )
    .map(({ id }) => id);

  if (offendingIds.length > 0) {
    throw new PackagePolicyManagedByOnboardingError(
      `Package policies managed by a cloud onboarding instance can only be changed from the onboarding flow. Offending IDs: ${offendingIds.join(
        ', '
      )}.`
    );
  }
}

/** Like assertOnboardingAccess, for package policies given by id. Missing ids are skipped. */
export async function assertOnboardingAccessByIds(
  soClient: SavedObjectsClientContract,
  packagePolicyIds: string[],
  onboardingDeploymentId: string | undefined
): Promise<void> {
  const packagePolicies =
    (await packagePolicyService.getByIDs(soClient, packagePolicyIds, { ignoreMissing: true })) ??
    [];
  assertOnboardingAccess(packagePolicies, onboardingDeploymentId);
}
