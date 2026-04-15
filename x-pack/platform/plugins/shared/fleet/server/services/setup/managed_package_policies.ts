/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import semverLt from 'semver/functions/lt';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { UpgradePackagePolicyDryRunResponseItem } from '../../../common/types';
import { AUTO_UPDATE_PACKAGES } from '../../../common/constants';

import { PACKAGES_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../constants';

import type { Installation, PackagePolicy } from '../../types';

import { appContextService } from '../app_context';
import {
  getInstallation,
  getInstallationObject,
  getInstallations,
  getPackageInfo,
} from '../epm/packages';
import { packagePolicyService } from '../package_policy';
import { runWithCache } from '../epm/packages/cache';
import { hasNewDeprecations, getDeprecationDetails } from '../epm/packages/deprecation_helpers';

export interface UpgradeManagedPackagePoliciesResult {
  packagePolicyId: string;
  diff?: UpgradePackagePolicyDryRunResponseItem['diff'];
  errors: any;
}

const TASK_TYPE = 'fleet:setup:upgrade_managed_package_policies';

export function registerUpgradeManagedPackagePoliciesTask(
  taskManagerSetup: TaskManagerSetupContract
) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Setup Upgrade managed package policies',
      timeout: '1h',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        const pkgName = taskInstance.params.packageName;
        return {
          async run() {
            const esClient = appContextService.getInternalUserESClient();
            const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

            await runWithCache(() => upgradeManagedPackagePolicies(soClient, esClient, pkgName));
          },
          async cancel() {},
        };
      },
    },
  });
}

async function runUpgradeManagedPackagePoliciesTask(
  taskManagerStart: TaskManagerStartContract,
  pkgName: string
) {
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${pkgName}`,
    scope: ['fleet'],
    params: { packageName: pkgName },
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}

/**
 *
 * @param soClient
 * @param esClient
 * @returns
 */
export const setupUpgradeManagedPackagePolicies = async (soClient: SavedObjectsClientContract) => {
  appContextService
    .getLogger()
    .debug(
      '[UpgradeManagedPackagePoliciesTask] Scheduling required package policies upgrades for managed policies'
    );

  const installedPackages = await getInstallations(soClient, {
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed AND ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.keep_policies_up_to_date:true`,
  });
  for (const { id: soId, attributes: installedPackage } of installedPackages.saved_objects) {
    const packagePoliciesFinder = await getPackagePoliciesNotMatchingVersion(
      soClient,
      installedPackage.name,
      installedPackage.version
    );
    let shouldRegisterTask = false;
    let oldPolicyVersion: string | undefined;
    for await (const packagePolicies of packagePoliciesFinder) {
      for (const packagePolicy of packagePolicies) {
        if (isPolicyVersionLtInstalledVersion(packagePolicy, installedPackage)) {
          shouldRegisterTask = true;
          oldPolicyVersion = packagePolicy.package?.version;
          break;
        }
      }
      if (shouldRegisterTask) {
        break;
      }
    }
    if (shouldRegisterTask) {
      // AUTO_UPDATE_PACKAGES are stack-aligned and they shouldn't require user review
      const stackAlignedPackages = AUTO_UPDATE_PACKAGES.some(
        (pkg) => pkg.name === installedPackage.name
      );
      // If the package is not an auto-update package, check the deprecation gate
      if (!stackAlignedPackages) {
        const isUpgradeAccepted = await checkUserReview(
          soClient,
          soId,
          installedPackage,
          oldPolicyVersion
        );
        if (!isUpgradeAccepted) {
          continue;
        }
      }

      appContextService
        .getLogger()
        .debug(
          `[UpgradeManagedPackagePoliciesTask] Scheduled package policies upgrades for package: ${installedPackage.name}@${installedPackage.version}`
        );
      await runUpgradeManagedPackagePoliciesTask(
        appContextService.getTaskManagerStart()!,
        installedPackage.name
      );
    }
  }
};

/**
 * Upgrade any package policies for packages installed through setup that are denoted as `AUTO_UPGRADE` packages
 * or have the `keep_policies_up_to_date` flag set to `true`
 */
export const upgradeManagedPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pkgName: string
): Promise<UpgradeManagedPackagePoliciesResult[]> => {
  const logger = appContextService.getLogger();
  logger.debug(
    '[UpgradeManagedPackagePoliciesTask] Running required package policies upgrades for managed policies'
  );

  const results: UpgradeManagedPackagePoliciesResult[] = [];

  const installedPackage = await getInstallation({
    pkgName,
    savedObjectsClient: soClient,
    logger,
  });

  if (!installedPackage) {
    logger.debug(
      '[UpgradeManagedPackagePoliciesTask] Aborting upgrading managed package policies: package is not installed'
    );
    return [];
  }

  const packagePoliciesFinder = await getPackagePoliciesNotMatchingVersion(
    soClient,
    installedPackage.name,
    installedPackage.version
  );

  let upgradedCount = 0;
  for await (const packagePolicies of packagePoliciesFinder) {
    for (const packagePolicy of packagePolicies) {
      if (isPolicyVersionLtInstalledVersion(packagePolicy, installedPackage)) {
        await upgradePackagePolicy(soClient, esClient, packagePolicy, installedPackage, results);
        upgradedCount++;
      }
    }
  }

  if (upgradedCount > 0) {
    logger.info(
      `[UpgradeManagedPackagePoliciesTask] Completed upgrading ${upgradedCount} package policies for ${pkgName}`
    );

    await clearPendingUpgradeReview(soClient, pkgName);
  }

  return results;
};

async function getPackagePoliciesNotMatchingVersion(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) {
  return packagePolicyService.fetchAllItems(soClient, {
    perPage: 50,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName} AND NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.version:${pkgVersion}`,
  });
}

function isPolicyVersionLtInstalledVersion(
  packagePolicy: PackagePolicy,
  installedPackage: Installation
): boolean {
  return (
    packagePolicy.package !== undefined &&
    semverLt(packagePolicy.package.version, installedPackage.version)
  );
}

async function clearPendingUpgradeReview(soClient: SavedObjectsClientContract, pkgName: string) {
  try {
    const installationSo = await getInstallationObject({
      savedObjectsClient: soClient,
      pkgName,
    });
    if (!installationSo) {
      return;
    }

    if (installationSo.attributes.pending_upgrade_review) {
      await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, installationSo.id, {
        pending_upgrade_review: null,
      } as unknown as Partial<Installation>);
    }
  } catch (error) {
    appContextService
      .getLogger()
      .warn(
        `[UpgradeManagedPackagePoliciesTask] Failed to clear pending upgrade review for ${pkgName}: ${error.message}`
      );
  }
}

async function checkUserReview(
  soClient: SavedObjectsClientContract,
  soId: string,
  installedPackage: Installation,
  oldPolicyVersion: string | undefined
): Promise<boolean> {
  const logger = appContextService.getLogger();
  const review = installedPackage.pending_upgrade_review;

  if (review?.target_version === installedPackage.version) {
    if (review.action === 'accepted') {
      logger.debug(
        `[UpgradeManagedPackagePoliciesTask] User accepted policy upgrade for ${installedPackage.name}@${installedPackage.version}, proceeding`
      );
      return true;
    }

    if (review.action === 'declined') {
      logger.debug(
        `[UpgradeManagedPackagePoliciesTask] Skipping policy upgrade for ${installedPackage.name}: user declined upgrade to ${installedPackage.version}`
      );
      return false;
    }

    if (review.action === 'pending' || !review.action) {
      logger.debug(
        `[UpgradeManagedPackagePoliciesTask] Skipping policy upgrade for ${installedPackage.name}: pending user review for ${installedPackage.version}`
      );
      return false;
    }

    return false;
  }

  if (!oldPolicyVersion) {
    return true;
  }

  try {
    const [currentPkgInfo, targetPkgInfo] = await Promise.all([
      getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: installedPackage.name,
        pkgVersion: oldPolicyVersion,
        skipArchive: true,
      }),
      getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: installedPackage.name,
        pkgVersion: installedPackage.version,
        skipArchive: true,
      }),
    ]);

    if (hasNewDeprecations(currentPkgInfo, targetPkgInfo)) {
      const deprecationDetails = getDeprecationDetails(targetPkgInfo);
      logger.info(
        `[UpgradeManagedPackagePoliciesTask] Blocking policy auto-upgrade for ${installedPackage.name}@${installedPackage.version}: new deprecations detected, awaiting user review`
      );
      await writePendingUpgradeReview(soClient, soId, installedPackage, deprecationDetails);
      return false;
    }
  } catch (error) {
    logger.warn(
      `[UpgradeManagedPackagePoliciesTask]Failed to check deprecations for ${installedPackage.name}, proceeding with upgrade: ${error.message}`
    );
  }

  return true;
}

async function writePendingUpgradeReview(
  soClient: SavedObjectsClientContract,
  soId: string,
  installedPackage: Installation,
  deprecationDetails?: import('../../../common/types').DeprecationInfo
) {
  await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, soId, {
    pending_upgrade_review: {
      target_version: installedPackage.version,
      reason: 'deprecated',
      created_at: new Date().toISOString(),
      deprecation_details: deprecationDetails,
    },
  });
}

async function upgradePackagePolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicy: PackagePolicy,
  installedPackage: Installation,
  results: UpgradeManagedPackagePoliciesResult[]
) {
  // Since upgrades don't report diffs/errors, we need to perform a dry run first in order
  // to notify the user of any granular policy upgrade errors that occur during Fleet's
  // preconfiguration check
  const dryRunResults = await packagePolicyService.getUpgradeDryRunDiff(
    soClient,
    packagePolicy.id,
    packagePolicy,
    installedPackage.version
  );

  if (dryRunResults.hasErrors) {
    const errors = dryRunResults.diff
      ? dryRunResults.diff?.[1].errors
      : [dryRunResults.body?.message];

    appContextService
      .getLogger()
      .error(
        new Error(`Error upgrading package policy ${packagePolicy.id}: ${JSON.stringify(errors)}`)
      );

    results.push({ packagePolicyId: packagePolicy.id, diff: dryRunResults.diff, errors });
    return;
  }

  try {
    await packagePolicyService.upgrade(
      soClient,
      esClient,
      packagePolicy.id,
      { force: true },
      packagePolicy,
      installedPackage.version
    );
    results.push({ packagePolicyId: packagePolicy.id, diff: dryRunResults.diff, errors: [] });
  } catch (error) {
    results.push({ packagePolicyId: packagePolicy.id, diff: dryRunResults.diff, errors: [error] });
  }
}
