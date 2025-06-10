/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../../common/constants';
import { getMaxPackageName } from '../../../common/services';

import { packagePolicyService, getPackagePolicySavedObjectType } from '../package_policy';

export async function incrementPackageName(
  soClient: SavedObjectsClientContract,
  packageName: string
): Promise<string> {
  const packagePolicySavedObjectType = await getPackagePolicySavedObjectType();
  // Fetch all packagePolicies having the package name
  const packagePolicyData = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${packagePolicySavedObjectType}.package.name: "${packageName}"`,
  });

  return getMaxPackageName(packageName, packagePolicyData?.items);
}

export async function incrementPackagePolicyCopyName(
  soClient: SavedObjectsClientContract,
  packagePolicyName: string
): Promise<string> {
  let packageName = packagePolicyName;
  const packageNameMatches = packagePolicyName.match(/^(.*)\s\(copy\s?[0-9]*\)$/);
  if (packageNameMatches) {
    packageName = packageNameMatches[1];
  }

  const packagePolicySavedObjectType = await getPackagePolicySavedObjectType();

  // find all pacakge policies starting with the same name and increment the name
  const packagePolicyData = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    // split package name on first space as KQL do not support wildcard and space
    kuery: `${packagePolicySavedObjectType}.name: ${packageName.split(' ')[0]}*`,
  });

  const maxVersion =
    packagePolicyData.items.length > 0
      ? Math.max(
          ...packagePolicyData.items
            .filter((item) => item.name.startsWith(packageName))
            .map((item) => {
              const matches = item.name.match(/^(.*)\s\(copy\s?([0-9]*)\)$/);
              if (matches) {
                return parseInt(matches[2], 10) || 1;
              }

              return 0;
            })
        )
      : 0;

  const copyVersion = maxVersion + 1;

  if (copyVersion === 1) {
    return `${packageName} (copy)`;
  }

  return `${packageName} (copy ${copyVersion})`;
}
