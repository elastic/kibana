/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { chunk, indexBy, uniq } from 'lodash/fp';
import pMap from 'p-map';
import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  AuthenticatedUser,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';

import type {
  ExperimentalDataStreamFeature,
  PackagePolicyAssetsMap,
  PackagePolicyInput,
  PackagePolicyPackage,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../../common/types';

import type {
  NewPackagePolicy,
  PackageInfo,
  PackagePolicy,
  UpgradePackagePolicyResponse,
} from '../../../common';

import { runWithCache } from '../epm/packages/cache';

import {
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10,
} from '../../constants';

import { getPackageInfo, getInstallation } from '../epm/packages';
import {
  FleetError,
  FleetNotFoundError,
  PackagePolicyIneligibleForUpgradeError,
  PackagePolicyRestrictionRelatedError,
  fleetErrorToResponseOptions,
} from '../../errors';
import type { PackagePolicyClient } from '../package_policy_service';
import type { InputsOverride } from '../package_policy';
import { _compilePackagePolicyInputs, updatePackageInputs } from '../package_policy';

import { packageToPackagePolicyInputs } from '../../../common/services';
import { getAgentTemplateAssetsMap } from '../epm/packages/get';
import { appContextService } from '../app_context';
import { storedPackagePolicyToAgentInputs } from '../agent_policies';
import {
  type PackageUpdateEvent,
  type UpdateEventType,
  sendTelemetryEvents,
} from '../upgrade_sender';

export async function _getUpgradePackagePolicyInfo({
  packagePolicyService,
  soClient,
  id,
  packagePolicy,
  pkgVersion,
}: {
  packagePolicyService: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  id: string;
  packagePolicy?: PackagePolicy;
  pkgVersion?: string;
}): Promise<{
  packagePolicy: PackagePolicy;
  packageInfo: PackageInfo;
  experimentalDataStreamFeatures: ExperimentalDataStreamFeature[];
}> {
  if (!packagePolicy) {
    packagePolicy = (await packagePolicyService.get(soClient, id)) ?? undefined;
  }

  let experimentalDataStreamFeatures: ExperimentalDataStreamFeature[] = [];

  if (!pkgVersion && packagePolicy) {
    const installedPackage = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package!.name,
    });

    if (!installedPackage) {
      throw new FleetError(
        i18n.translate('xpack.fleet.packagePolicy.packageNotInstalledError', {
          defaultMessage: 'Package {name} is not installed',
          values: {
            name: packagePolicy.package!.name,
          },
        })
      );
    }

    pkgVersion = installedPackage.version;
    experimentalDataStreamFeatures = installedPackage.experimental_data_stream_features ?? [];
  }

  let packageInfo: PackageInfo | undefined;

  if (packagePolicy) {
    packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: packagePolicy!.package!.name,
      pkgVersion: pkgVersion ?? '',
      prerelease: !!pkgVersion, // using prerelease only if version is specified
    });
  }

  validateUpgradePackagePolicy(id, packageInfo, packagePolicy);

  return {
    packagePolicy: packagePolicy!,
    packageInfo: packageInfo!,
    experimentalDataStreamFeatures,
  };
}

async function doUpgrade(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicy: PackagePolicy,
  packageInfo: PackageInfo,
  options?: { force?: boolean }
) {
  if (packagePolicy.is_managed && !options?.force) {
    throw new PackagePolicyRestrictionRelatedError(
      `Cannot upgrade package policy ${packagePolicy.id}`
    );
  }

  const updatePackagePolicy = updatePackageInputs(
    {
      ...omit(packagePolicy, 'id', 'spaceIds', 'secret_references'),
      inputs: packagePolicy.inputs,
      package: {
        ...packagePolicy.package!,
        version: packageInfo.version,
      },
    },
    packageInfo,
    packageToPackagePolicyInputs(packageInfo) as InputsOverride[]
  );
  const assetsMap = await getAgentTemplateAssetsMap({
    logger: appContextService.getLogger(),
    packageInfo,
    savedObjectsClient: soClient,
  });

  updatePackagePolicy.inputs = _compilePackagePolicyInputs(
    packageInfo,
    updatePackagePolicy.vars || {},
    updatePackagePolicy.inputs as PackagePolicyInput[],
    assetsMap
  );
  updatePackagePolicy.elasticsearch = packageInfo.elasticsearch;

  return updatePackagePolicy;
}

async function getPackagePoliciesWithRelatedPackageVersionForUpgrade({
  soClient,
  packagePolicyService,
  ids,
  pkgVersion,
}: {
  ids: string[];
  packagePolicyService: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  pkgVersion?: string;
}) {
  const packagePolicies = await packagePolicyService.getByIDs(soClient, ids, {
    ignoreMissing: true,
  });
  const packagePoliciesById = indexBy('id', packagePolicies);

  const packageVersionMap = new Map<string, string>();

  if (!pkgVersion) {
    const packageNames =
      packagePolicies
        ?.map((policy) => policy.package?.name)
        .filter((packageName): packageName is string => typeof packageName !== 'undefined') ?? [];

    await pMap(
      uniq(packageNames),
      async (pkgName) => {
        const installation = await getInstallation({
          savedObjectsClient: soClient,
          pkgName,
        });

        if (installation) {
          packageVersionMap.set(pkgName, installation.version);
        }
      },
      {
        concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10,
      }
    );
  }

  return {
    packageVersionMap,
    packagePoliciesById,
    packagePolicies,
  };
}

function validateUpgradePackagePolicy(
  id: string,
  packageInfo?: PackageInfo,
  packagePolicy?: PackagePolicy
) {
  if (!packagePolicy) {
    throw new FleetError(
      i18n.translate('xpack.fleet.packagePolicy.policyNotFoundError', {
        defaultMessage: 'Package policy with id {id} not found',
        values: { id },
      })
    );
  }

  if (!packagePolicy.package?.name) {
    throw new FleetError(
      i18n.translate('xpack.fleet.packagePolicy.packageNotFoundError', {
        defaultMessage: 'Package policy with id {id} has no named package',
        values: { id },
      })
    );
  }

  const isInstalledVersionLessThanPolicyVersion = semverLt(
    packageInfo?.version ?? '',
    packagePolicy.package.version
  );

  if (isInstalledVersionLessThanPolicyVersion) {
    throw new PackagePolicyIneligibleForUpgradeError(
      i18n.translate('xpack.fleet.packagePolicy.ineligibleForUpgradeError', {
        defaultMessage:
          "Package policy {id}'s package version {version} of package {name} is newer than the installed package version. Please install the latest version of {name}.",
        values: {
          id: packagePolicy.id,
          name: packagePolicy.package.name,
          version: packagePolicy.package.version,
        },
      })
    );
  }
}

function sendUpgradeTelemetry(
  packagePolicyPackage: PackagePolicyPackage,
  latestVersion: string,
  hasErrors: boolean,
  errors?: Array<{ key: string | undefined; message: string }>
) {
  if (packagePolicyPackage.version !== latestVersion) {
    const upgradeTelemetry: PackageUpdateEvent = {
      packageName: packagePolicyPackage.name,
      currentVersion: packagePolicyPackage.version,
      newVersion: latestVersion,
      status: hasErrors ? 'failure' : 'success',
      error: hasErrors ? errors : undefined,
      dryRun: true,
      eventType: 'package-policy-upgrade' as UpdateEventType,
    };
    sendTelemetryEvents(
      appContextService.getLogger(),
      appContextService.getTelemetryEventsSender(),
      upgradeTelemetry
    );
    appContextService
      .getLogger()
      .info(
        `Package policy upgrade dry run ${hasErrors ? 'resulted in errors' : 'ran successfully'}`
      );
    appContextService.getLogger().debug(() => JSON.stringify(upgradeTelemetry));
  }
}

async function calculateDiff(
  packagePolicy: PackagePolicy,
  packageInfo: PackageInfo,
  assetsMap: PackagePolicyAssetsMap
): Promise<UpgradePackagePolicyDryRunResponseItem> {
  const updatedPackagePolicy = updatePackageInputs(
    {
      ...omit(packagePolicy, 'id', 'spaceIds'),
      inputs: packagePolicy.inputs,
      package: {
        ...packagePolicy.package!,
        version: packageInfo.version,
        experimental_data_stream_features: packagePolicy.package?.experimental_data_stream_features,
      },
    },
    packageInfo,
    packageToPackagePolicyInputs(packageInfo) as InputsOverride[],
    true
  );
  updatedPackagePolicy.inputs = _compilePackagePolicyInputs(
    packageInfo,
    updatedPackagePolicy.vars || {},
    updatedPackagePolicy.inputs as PackagePolicyInput[],
    assetsMap
  );
  updatedPackagePolicy.elasticsearch = packageInfo.elasticsearch;

  const hasErrors = 'errors' in updatedPackagePolicy;

  sendUpgradeTelemetry(
    packagePolicy.package!,
    packageInfo.version,
    hasErrors,
    updatedPackagePolicy.errors
  );

  return {
    name: updatedPackagePolicy.name,
    diff: [packagePolicy, updatedPackagePolicy],
    // TODO: Currently only returns the agent inputs for current package policy, not the upgraded one
    // as we only show this version in the UI
    agent_diff: [storedPackagePolicyToAgentInputs(packagePolicy, packageInfo)],
    hasErrors,
  };
}

export async function _packagePoliciesBulkUpgrade({
  packagePolicyService,
  soClient,
  esClient,
  ids,
  options,
  pkgVersion,
}: {
  packagePolicyService: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  ids: string[];
  options?: { user?: AuthenticatedUser; force?: boolean };
  pkgVersion?: string;
}): Promise<UpgradePackagePolicyResponse> {
  // Bulk upgrade packages policies
  // 1. bulk get policies
  // 2. get pkg version if not specificed based on installed version
  // 3. for each policies get upgraded
  // 4. bulkUpdate policies
  return runWithCache(async () => {
    const result: UpgradePackagePolicyResponse = [];
    for (const chunkedIds of chunk(MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, ids)) {
      const { packagePoliciesById, packagePolicies, packageVersionMap } =
        await getPackagePoliciesWithRelatedPackageVersionForUpgrade({
          soClient,
          packagePolicyService,
          ids: chunkedIds,
          pkgVersion,
        });

      const updatedPackagePolicies: Array<NewPackagePolicy & { version?: string; id: string }> = [];
      for (const id of chunkedIds) {
        try {
          const packagePolicy = packagePoliciesById[id];
          if (!packagePolicy) {
            throw new FleetNotFoundError(`Package policy ${id} not found`);
          }

          const upgradePkgVersion = pkgVersion
            ? pkgVersion
            : packageVersionMap.get(packagePolicy.package?.name ?? '');

          const { packagePolicy: currentPackagePolicy, packageInfo } =
            await _getUpgradePackagePolicyInfo({
              packagePolicyService,
              soClient,
              id,
              packagePolicy,
              pkgVersion: upgradePkgVersion,
            });

          const updatePackagePolicy = await doUpgrade(
            soClient,
            esClient,
            currentPackagePolicy,
            packageInfo,
            { force: options?.force }
          );

          updatedPackagePolicies.push({ ...updatePackagePolicy, id });
        } catch (error) {
          result.push({
            id,
            success: false,
            ...fleetErrorToResponseOptions(error),
          });
        }
      }

      const bulkUpdateResults = await packagePolicyService.bulkUpdate(
        soClient,
        esClient,
        updatedPackagePolicies,
        {
          asyncDeploy: true,
          fromBulkUpgrade: true,
          force: options?.force,
          user: options?.user,
          oldPackagePolicies: packagePolicies,
        }
      );

      for (const res of bulkUpdateResults.updatedPolicies ?? []) {
        result.push({
          id: res.id,
          name: res.name,
          success: true,
        });
      }

      for (const res of bulkUpdateResults.failedPolicies ?? []) {
        result.push({
          id: res.packagePolicy.id as string,
          success: false,
          ...fleetErrorToResponseOptions(res.error as FleetError),
        });
      }
    }
    return result;
  });
}

export async function _packagePoliciesUpgrade({
  soClient,
  esClient,
  packagePolicyService,
  id,
  options,
  packagePolicy,
  pkgVersion,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicyService: PackagePolicyClient;
  id: string;
  options?: { user?: AuthenticatedUser; force?: boolean };
  packagePolicy?: PackagePolicy;
  pkgVersion?: string;
}): Promise<UpgradePackagePolicyResponse> {
  return runWithCache(async () => {
    const result: UpgradePackagePolicyResponse = [];

    try {
      const { packagePolicy: currentPackagePolicy, packageInfo } =
        await _getUpgradePackagePolicyInfo({
          packagePolicyService,
          soClient,
          id,
          packagePolicy,
          pkgVersion,
        });

      const updatePackagePolicy = await doUpgrade(
        soClient,
        esClient,
        currentPackagePolicy,
        packageInfo,
        { force: options?.force }
      );

      const updateOptions = {
        skipUniqueNameVerification: true,
        ...options,
      };

      await packagePolicyService.update(soClient, esClient, id, updatePackagePolicy, updateOptions);

      result.push({
        id,
        name: updatePackagePolicy.name,
        success: true,
      });
    } catch (error) {
      result.push({
        id,
        success: false,
        ...fleetErrorToResponseOptions(error),
      });
    }

    return result;
  });
}

export async function _packagePoliciesGetUpgradeDryRunDiff({
  soClient,
  packagePolicyService,
  id,
  packagePolicy,
  pkgVersion,
}: {
  soClient: SavedObjectsClientContract;
  packagePolicyService: PackagePolicyClient;
  id: string;
  packagePolicy?: PackagePolicy;
  pkgVersion?: string;
}): Promise<UpgradePackagePolicyDryRunResponseItem> {
  try {
    let packageInfo: PackageInfo;
    let experimentalDataStreamFeatures;

    ({ packagePolicy, packageInfo, experimentalDataStreamFeatures } =
      await _getUpgradePackagePolicyInfo({
        packagePolicyService,
        soClient,
        id,
        packagePolicy,
        pkgVersion,
      }));

    const assetsMap = await getAgentTemplateAssetsMap({
      logger: appContextService.getLogger(),
      packageInfo,
      savedObjectsClient: soClient,
    });

    // Ensure the experimental features from the Installation saved object come through on the package policy
    // during an upgrade dry run
    if (packagePolicy.package) {
      packagePolicy.package.experimental_data_stream_features = experimentalDataStreamFeatures;
    }

    return calculateDiff(packagePolicy, packageInfo, assetsMap);
  } catch (error) {
    return {
      hasErrors: true,
      ...fleetErrorToResponseOptions(error),
    };
  }
}
