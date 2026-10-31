/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq } from 'lodash';
import semverCompare from 'semver/functions/compare';
import semverGt from 'semver/functions/gt';
import semverLt from 'semver/functions/lt';
import semverMajor from 'semver/functions/major';
import semverPrerelease from 'semver/functions/prerelease';
import semverRcompare from 'semver/functions/rcompare';
import semverSatisfies from 'semver/functions/satisfies';
import semverValid from 'semver/functions/valid';
import { parse } from 'yaml';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { getAgentlessGlobalDataTags } from '../../../common/services/agentless_policy_helper';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../constants';
import type { Installation, PackageInfo, PackagePolicy } from '../../types';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getInstallation, getPackageInfo, installPackage } from '../epm/packages';
import { getAsset } from '../epm/archive/storage';
import { runWithCache } from '../epm/packages/cache';
import { hasNewDeprecations } from '../epm/packages/deprecation_helpers';
import * as Registry from '../epm/registry';

import { getAgentlessAgentPolicyConfig } from './agentless_policies';

const LOG_PREFIX = '[AgentlessAutoUpgrade]';

export interface AgentlessAutoUpgradePackageConfig {
  name: string;
  versionRange: string;
}

export interface AgentlessAutoUpgradeConfig {
  dryRun: boolean;
  packages: AgentlessAutoUpgradePackageConfig[];
}

export type AgentlessAutoUpgradeStatus =
  | 'upgraded'
  | 'would_upgrade'
  | 'up_to_date'
  | 'skipped'
  | 'failed';

export interface AgentlessAutoUpgradeResult {
  name: string;
  status: AgentlessAutoUpgradeStatus;
  reason?: string;
  installedVersion?: string;
  targetVersion?: string;
  packagePolicyIds?: string[];
}

interface ChangelogEntry {
  version?: unknown;
  changes?: Array<{ type?: unknown }>;
}

/**
 * Newest GA registry version above the installed one that satisfies `versionRange` and keeps the
 * installed major version.
 */
export function pickRegistryTarget(
  installedVersion: string,
  availableVersions: string[],
  versionRange: string
): string | undefined {
  const installedMajor = semverMajor(installedVersion);
  return availableVersions
    .filter(
      (version) =>
        semverValid(version) &&
        !semverPrerelease(version) &&
        semverMajor(version) === installedMajor &&
        semverGt(version, installedVersion) &&
        semverSatisfies(version, versionRange)
    )
    .sort(semverRcompare)[0];
}

/** True when the changelog lists a `breaking-change` in (fromVersion, toVersion]. */
export function hasBreakingChanges(
  changelog: unknown,
  fromVersion: string,
  toVersion: string
): boolean {
  if (!Array.isArray(changelog)) {
    return false;
  }
  return changelog.some((entry: ChangelogEntry) => {
    if (typeof entry?.version !== 'string' || !semverValid(entry.version)) {
      return false;
    }
    return (
      semverGt(entry.version, fromVersion) &&
      !semverGt(entry.version, toVersion) &&
      (entry.changes ?? []).some((change) => change?.type === 'breaking-change')
    );
  });
}

export async function runAgentlessAutoUpgrade({
  config,
  logger,
  signal,
}: {
  config: AgentlessAutoUpgradeConfig;
  logger: Logger;
  signal?: AbortSignal;
}): Promise<AgentlessAutoUpgradeResult[]> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();
  const results: AgentlessAutoUpgradeResult[] = [];

  for (const pkg of config.packages) {
    signal?.throwIfAborted();

    let result: AgentlessAutoUpgradeResult;
    try {
      result = await runWithCache(() =>
        autoUpgradePackage({ soClient, esClient, logger, dryRun: config.dryRun, pkg })
      );
    } catch (error) {
      result = { name: pkg.name, status: 'failed', reason: error.message };
    }

    const versions =
      result.installedVersion && result.targetVersion
        ? ` ${result.installedVersion} -> ${result.targetVersion}`
        : '';
    const message = `${LOG_PREFIX} ${pkg.name}${versions}: ${result.status}${
      result.reason ? ` (${result.reason})` : ''
    }`;
    if (result.status === 'failed') {
      logger.error(message);
    } else {
      logger.info(message);
    }
    results.push(result);
  }

  return results;
}

async function autoUpgradePackage({
  soClient,
  esClient,
  logger,
  dryRun,
  pkg,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  dryRun: boolean;
  pkg: AgentlessAutoUpgradePackageConfig;
}): Promise<AgentlessAutoUpgradeResult> {
  const { name, versionRange } = pkg;
  const skipped = (reason: string, extra: Partial<AgentlessAutoUpgradeResult> = {}) => ({
    name,
    status: 'skipped' as const,
    reason,
    ...extra,
  });

  const installation = await getInstallation({ savedObjectsClient: soClient, pkgName: name });
  if (!installation || installation.install_status !== 'installed') {
    return skipped('package is not installed');
  }
  const installedVersion = installation.version;

  const packagePolicies = await findPackagePolicies(soClient, name);
  const agentlessPolicies = packagePolicies.filter((pp) => pp.supports_agentless === true);
  if (agentlessPolicies.length === 0) {
    return skipped('no agentless package policies', { installedVersion });
  }
  if (agentlessPolicies.length !== packagePolicies.length) {
    return skipped('package is also used by non-agentless package policies', {
      installedVersion,
    });
  }

  const targetVersion = await resolveTargetVersion(installation, versionRange);
  if (!semverSatisfies(targetVersion, versionRange)) {
    return skipped(`version ${targetVersion} is outside range ${versionRange}`, {
      installedVersion,
    });
  }

  const outdatedPolicies = agentlessPolicies.filter(
    (pp) => pp.package && semverLt(pp.package.version, targetVersion)
  );
  const needsInstall = semverGt(targetVersion, installedVersion);
  const result = {
    name,
    installedVersion,
    targetVersion,
    packagePolicyIds: outdatedPolicies.map((pp) => pp.id),
  };

  if (!needsInstall && outdatedPolicies.length === 0) {
    return { ...result, status: 'up_to_date' };
  }

  const majorChangeIds = outdatedPolicies
    .filter((pp) => semverMajor(pp.package!.version) !== semverMajor(targetVersion))
    .map((pp) => pp.id);
  if (majorChangeIds.length > 0) {
    return { ...result, ...skipped(`major version change for ${majorChangeIds.join(', ')}`) };
  }

  const fromVersion = [
    ...(needsInstall ? [installedVersion] : []),
    ...outdatedPolicies.map((pp) => pp.package!.version),
  ].sort(semverCompare)[0];

  const [fromPkgInfo, targetPkgInfo] = await Promise.all([
    getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: name,
      pkgVersion: fromVersion,
      skipArchive: true,
      prerelease: true,
    }),
    getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: name,
      pkgVersion: targetVersion,
      skipArchive: true,
      prerelease: true,
    }),
  ]);

  if (hasNewDeprecations(fromPkgInfo, targetPkgInfo)) {
    return { ...result, ...skipped('new deprecations need review') };
  }

  const changelog = await loadChangelog(soClient, name, targetVersion, installedVersion, logger);
  if (changelog === undefined) {
    return { ...result, ...skipped('changelog unavailable') };
  }
  if (hasBreakingChanges(changelog, fromVersion, targetVersion)) {
    return {
      ...result,
      ...skipped(`changelog lists a breaking change between ${fromVersion} and ${targetVersion}`),
    };
  }

  const conflictIds: string[] = [];
  for (const packagePolicy of outdatedPolicies) {
    const dryRunDiff = await packagePolicyService.getUpgradeDryRunDiff(
      soClient,
      packagePolicy.id,
      packagePolicy,
      targetVersion
    );
    if (dryRunDiff.hasErrors) {
      conflictIds.push(packagePolicy.id);
    }
  }
  if (conflictIds.length > 0) {
    return { ...result, ...skipped(`upgrade conflicts in ${conflictIds.join(', ')}`) };
  }

  if (dryRun) {
    return { ...result, status: 'would_upgrade' };
  }

  if (needsInstall) {
    const spaceId = installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
    const installResult = await installPackage({
      installSource: 'registry',
      savedObjectsClient: appContextService.getInternalUserSOClientForSpaceId(spaceId),
      esClient,
      pkgkey: Registry.pkgToPkgKey({ name, version: targetVersion }),
      spaceId,
      allowOutdatedVersion: true,
      automaticInstall: true,
    });
    if (installResult.error) {
      return {
        ...result,
        status: 'failed',
        reason: `install failed: ${installResult.error.message}`,
      };
    }
  }

  // The install may already have upgraded policies when `keep_policies_up_to_date` is set.
  const outdatedIds = new Set(outdatedPolicies.map((pp) => pp.id));
  const stillOutdated = (await findPackagePolicies(soClient, name)).filter(
    (pp) => outdatedIds.has(pp.id) && pp.package && semverLt(pp.package.version, targetVersion)
  );

  const failedIds: string[] = [];
  if (stillOutdated.length > 0) {
    const upgradeResults = await packagePolicyService.bulkUpgrade(
      soClient,
      esClient,
      stillOutdated.map((pp) => pp.id),
      { force: true },
      targetVersion
    );
    failedIds.push(...upgradeResults.filter((r) => !r.success).map((r) => r.id));
  }

  await refreshAgentlessAgentPolicies({
    soClient,
    esClient,
    logger,
    agentPolicyIds: uniq(outdatedPolicies.flatMap((pp) => pp.policy_ids ?? [])),
    packageInfo: targetPkgInfo,
  });

  if (failedIds.length > 0) {
    return {
      ...result,
      status: 'failed',
      reason: `failed to upgrade ${failedIds.join(', ')}`,
    };
  }
  return { ...result, status: 'upgraded' };
}

async function resolveTargetVersion(
  installation: Installation,
  versionRange: string
): Promise<string> {
  // Uploaded and bundled packages are not looked up in the registry; their agentless policies are
  // only brought up to the installed version.
  if (installation.install_source !== 'registry') {
    return installation.version;
  }
  const available = await Registry.fetchList({
    package: installation.name,
    all: true,
    prerelease: false,
  });
  return (
    pickRegistryTarget(
      installation.version,
      available.map((p) => p.version),
      versionRange
    ) ?? installation.version
  );
}

async function findPackagePolicies(
  soClient: SavedObjectsClientContract,
  pkgName: string
): Promise<PackagePolicy[]> {
  const packagePolicies: PackagePolicy[] = [];
  const finder = await packagePolicyService.fetchAllItems(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
    spaceIds: ['*'],
  });
  for await (const batch of finder) {
    packagePolicies.push(...batch);
  }
  return packagePolicies;
}

async function loadChangelog(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  version: string,
  installedVersion: string,
  logger: Logger
): Promise<unknown | undefined> {
  try {
    if (version === installedVersion) {
      const asset = await getAsset({
        savedObjectsClient: soClient,
        path: `${pkgName}-${version}/changelog.yml`,
      });
      const text =
        asset?.data_utf8 ??
        (asset?.data_base64 ? Buffer.from(asset.data_base64, 'base64').toString('utf8') : null);
      return text ? parse(text) : undefined;
    }
    const response = await Registry.getFile(pkgName, version, 'changelog.yml');
    return response ? parse(await response.text()) : undefined;
  } catch (error) {
    logger.warn(
      `${LOG_PREFIX} Unable to load changelog for ${pkgName}-${version}: ${error.message}`
    );
    return undefined;
  }
}

async function refreshAgentlessAgentPolicies({
  soClient,
  esClient,
  logger,
  agentPolicyIds,
  packageInfo,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  agentPolicyIds: string[];
  packageInfo: PackageInfo;
}) {
  if (agentPolicyIds.length === 0) {
    return;
  }
  const agentPolicies = await agentPolicyService.getByIds(
    soClient,
    agentPolicyIds.map((id) => ({ id, spaceId: '*' })),
    { ignoreMissing: true }
  );
  const resources = getAgentlessAgentPolicyConfig(packageInfo)?.resources;
  const globalDataTags = getAgentlessGlobalDataTags(packageInfo);

  for (const agentPolicy of agentPolicies) {
    if (!agentPolicy.supports_agentless) {
      continue;
    }
    const resourcesChanged = !isEqual(agentPolicy.agentless?.resources, resources);
    const tagsChanged = !isEqual(agentPolicy.global_data_tags ?? [], globalDataTags ?? []);
    if (!resourcesChanged && !tagsChanged) {
      continue;
    }
    try {
      await agentPolicyService.update(
        appContextService.getInternalUserSOClientForSpaceId(
          agentPolicy.space_ids?.[0] ?? DEFAULT_SPACE_ID
        ),
        esClient,
        agentPolicy.id,
        {
          agentless: { ...agentPolicy.agentless, resources },
          global_data_tags: globalDataTags ?? [],
        },
        { force: true }
      );
    } catch (error) {
      logger.warn(
        `${LOG_PREFIX} Failed to refresh agentless settings on agent policy ${agentPolicy.id}: ${error.message}`
      );
    }
  }
}
