/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService, packagePolicyService } from '../..';

import { getPackageSavedObjects } from './get';
import { installPackage } from './install';

export class PackageRollbackError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PackagePolicyRollbackError';
  }
}

export async function rollbackInstallation(options: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  spaceId: string;
  spaceIds: string[];
}): Promise<{
  version: string;
  success: boolean;
}> {
  const { esClient, savedObjectsClient, pkgName, spaceId, spaceIds } = options;
  const logger = appContextService.getLogger();
  logger.info(`Rolling back installation for package: ${pkgName}`);

  // Retrieve the package saved object, throw if it doesn't have a previous version.
  const packageSORes = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['name'],
    search: pkgName,
  });
  if (packageSORes.saved_objects.length !== 1) {
    throw new Error('Expected exactly one package saved object');
  }
  const packageSO = packageSORes.saved_objects[0];
  if (!packageSO.attributes.previous_version) {
    throw new PackageRollbackError('No previous version found for package');
  }
  const previousVersion = packageSO.attributes.previous_version;

  // Retrieve package policy saved objects, throw if any of them doesn't have a previous version or has a different one.
  const packagePolicySORes = await packagePolicyService.getPackagePolicySavedObjects(
    savedObjectsClient,
    {
      searchFields: ['package.name'],
      search: pkgName,
      spaceIds,
    }
  );
  const packagePolicySO = packagePolicySORes.saved_objects;

  if (packagePolicySO.length > 0) {
    const allPoliciesHavePreviousVersion = (policies: string[]) => {
      for (const policy of policies) {
        if (policy.endsWith(':prev')) {
          continue;
        }
        if (!policies.includes(`${policy}:prev`)) {
          return false;
        }
      }
      return true;
    };
    if (!allPoliciesHavePreviousVersion(packagePolicySO.map((so) => so.id))) {
      throw new PackageRollbackError('No previous version found for least one package policy');
    }

    const allPolicyPreviousRevisionsOnPreviousVersion = packagePolicySO
      .filter((so) => so.id.endsWith(':prev'))
      .every((so) => so.attributes.package?.version === previousVersion);
    if (!allPolicyPreviousRevisionsOnPreviousVersion) {
      throw new PackageRollbackError('Wrong previous version for least one package policy');
    }
  }

  // Rollback package.
  const res = await installPackage({
    esClient,
    savedObjectsClient,
    installSource: 'registry', // Can only rollback from the registry.
    pkgkey: `${pkgName}-${previousVersion}`,
    spaceId,
    force: true,
  });
  if (res.error) {
    throw new PackageRollbackError(
      `Failed to rollback package ${pkgName} to version ${previousVersion}: ${res.error.message}`
    );
  }

  // Rollback package policies.
  if (packagePolicySO.length > 0) {
    await packagePolicyService.rollback(savedObjectsClient, packagePolicySO);
  }

  logger.info(`Package: ${pkgName} successfully rolled back to version: ${previousVersion}`);
  return { version: previousVersion, success: true };
}
