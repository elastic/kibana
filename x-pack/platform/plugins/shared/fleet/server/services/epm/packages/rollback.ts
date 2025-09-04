/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { PackageRollbackError } from '../../../errors';
import { appContextService, packagePolicyService } from '../..';

import { getPackageSavedObjects } from './get';
import { installPackage } from './install';

export async function rollbackInstallation(options: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  spaceId: string;
}): Promise<{
  version: string;
  success: boolean;
}> {
  const { esClient, savedObjectsClient, pkgName, spaceId } = options;
  const logger = appContextService.getLogger();
  logger.info(`Starting installation rollback for package: ${pkgName}`);

  // Retrieve the package saved object, throw if it doesn't exist or doesn't have a previous version.
  const packageSORes = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['name'],
    search: pkgName,
  });
  if (packageSORes.saved_objects.length === 0) {
    throw new PackageRollbackError(`Package ${pkgName} not found`);
  } else if (packageSORes.saved_objects.length > 1) {
    // This should not happen.
    throw new PackageRollbackError('Expected exactly one package saved object');
  }
  const packageSO = packageSORes.saved_objects[0];
  if (!packageSO.attributes.previous_version) {
    throw new PackageRollbackError(`No previous version found for package ${pkgName}`);
  }
  const previousVersion = packageSO.attributes.previous_version;
  if (packageSO.attributes.install_source !== 'registry') {
    throw new PackageRollbackError(
      `${pkgName} was not installed from the registry (install source: ${packageSO.attributes.install_source})`
    );
  }

  logger.info(`Rolling back ${pkgName} from ${packageSO.attributes.version} to ${previousVersion}`);

  // Retrieve package policy saved objects, throw if any of them doesn't have a previous version or has a different one.
  const packagePolicySORes = await packagePolicyService.getPackagePolicySavedObjects(
    savedObjectsClient,
    {
      searchFields: ['package.name'],
      search: pkgName,
      spaceIds: ['*'],
    }
  );
  const packagePolicySOs = packagePolicySORes.saved_objects;

  if (packagePolicySOs.length > 0) {
    const policyIds = packagePolicySOs.map((so) => so.id);
    const policyIdsWithNoPreviousVersion = policyIds.filter((soId) => {
      if (!soId.endsWith(':prev')) {
        return !policyIds.includes(`${soId}:prev`);
      }
      return false;
    });
    if (policyIdsWithNoPreviousVersion.length > 0) {
      throw new PackageRollbackError(
        `No previous version found for package policies: ${policyIdsWithNoPreviousVersion.join(
          ', '
        )}`
      );
    }

    const policiesOnWrongPreviousVersion = packagePolicySOs.filter((so) => {
      if (so.id.endsWith(':prev')) {
        return so.attributes.package?.version !== previousVersion;
      }
      return false;
    });
    if (policiesOnWrongPreviousVersion.length > 0) {
      const report = policiesOnWrongPreviousVersion.map((so) => {
        return `${so.id.replace(':prev', '')} (version: ${
          so.attributes.package?.version
        }, expected: ${previousVersion})`;
      });
      throw new PackageRollbackError(
        `Wrong previous version for package policies: ${report.join(', ')}`
      );
    }
  }

  // Roll back package policies.
  const rollbackResult = await packagePolicyService.rollback(savedObjectsClient, packagePolicySOs);

  // Roll back package.
  const res = await installPackage({
    esClient,
    savedObjectsClient,
    installSource: 'registry', // Can only rollback from the registry.
    pkgkey: `${pkgName}-${previousVersion}`,
    spaceId,
    force: true,
  });
  if (res.error) {
    await packagePolicyService.restoreRollback(savedObjectsClient, rollbackResult);
    throw new PackageRollbackError(
      `Failed to rollback package ${pkgName} to version ${previousVersion}: ${res.error.message}`
    );
  }

  // Clean up package policies previous revisions and package policies that were copied during rollback.
  await packagePolicyService.cleanupRollbackSavedObjects(savedObjectsClient, rollbackResult);
  // Bump agent policy revision for all package policies that were rolled back.
  await packagePolicyService.bumpAgentPolicyRevisionAfterRollback(
    savedObjectsClient,
    rollbackResult
  );

  logger.info(`Package: ${pkgName} successfully rolled back to version: ${previousVersion}`);
  return { version: previousVersion, success: true };
}
