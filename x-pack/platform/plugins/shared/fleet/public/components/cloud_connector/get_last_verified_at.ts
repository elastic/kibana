/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyPermissionSummary } from '../../../common/types/models/cloud_connector';

/**
 * For a single integration row: returns that one summary's `last_verified_at`,
 * or undefined when no summary exists for the given `packagePolicyId`.
 */
export function getLastVerifiedAt(
  packagePolicyId: string,
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined
): string | undefined {
  return verificationPermissions?.find((entry) => entry.package_policy_id === packagePolicyId)
    ?.last_verified_at;
}

/**
 * Identity-level rollup (Story 4): the latest `last_verified_at` across all summaries.
 * Returns undefined when there are no summaries.
 */
export function getIdentityLastVerifiedAt(
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined
): string | undefined {
  if (!verificationPermissions?.length) return undefined;
  return verificationPermissions
    .map((entry) => entry.last_verified_at)
    .filter(Boolean)
    .sort()
    .pop();
}
