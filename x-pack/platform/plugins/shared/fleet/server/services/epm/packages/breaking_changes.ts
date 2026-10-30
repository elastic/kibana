/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniqWith } from 'lodash';
import { parse } from 'yaml';
import semverLte from 'semver/functions/lte';
import semverLt from 'semver/functions/lt';

import type { ArchiveIterator, PackagePolicy } from '../../../../common/types';
import {
  getBreakingChangesInRange,
  type BreakingChangesLog,
  type Changelog,
  type ChangelogEntry,
} from '../../../../common/services/changelog_utils';
import { PackageBreakingChangesNotAcknowledgedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getAsset } from '../archive/storage';
import * as Registry from '../registry';

import { getInstallation } from './get';

export interface PackagePolicyBreakingChanges {
  packagePolicy: PackagePolicy;
  toVersion: string;
  breakingChanges: BreakingChangesLog;
}

const isValidChangelogEntry = (entry: unknown): entry is ChangelogEntry => {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const { version, changes } = entry as Partial<ChangelogEntry>;
  return (
    typeof version === 'string' &&
    Array.isArray(changes) &&
    changes.every(
      (change) =>
        typeof change === 'object' &&
        change !== null &&
        typeof change.type === 'string' &&
        typeof change.description === 'string' &&
        typeof change.link === 'string'
    )
  );
};

const getChangelogPath = (pkgName: string, pkgVersion: string) =>
  `${pkgName}-${pkgVersion}/changelog.yml`;

async function readChangelogFromArchive(
  archiveIterator: ArchiveIterator,
  changelogPath: string
): Promise<string | undefined> {
  let changelogText: string | undefined;
  await archiveIterator.traverseEntries(
    async (entry) => {
      if (entry.path === changelogPath && entry.buffer) {
        changelogText = entry.buffer.toString('utf8');
      }
    },
    (entryPath) => entryPath === changelogPath
  );
  return changelogText;
}

/**
 * Reads the changelog of a package version, from the given archive if provided, otherwise from
 * the installed package assets, falling back to the registry (or bundled package).
 */
async function readChangelog({
  pkgName,
  pkgVersion,
  archiveIterator,
}: {
  pkgName: string;
  pkgVersion: string;
  archiveIterator?: ArchiveIterator;
}): Promise<string | undefined> {
  const changelogPath = getChangelogPath(pkgName, pkgVersion);
  if (archiveIterator) {
    return readChangelogFromArchive(archiveIterator, changelogPath);
  }

  const storedAsset = await getAsset({
    savedObjectsClient: appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    path: changelogPath,
  });
  if (storedAsset?.data_utf8) {
    return storedAsset.data_utf8;
  }

  const { archiveIterator: registryArchiveIterator } = await Registry.getPackage(
    pkgName,
    pkgVersion,
    { useStreaming: true }
  );
  return readChangelogFromArchive(registryArchiveIterator, changelogPath);
}

/**
 * Returns the parsed changelog of a package version. A missing or unreadable changelog is
 * logged and treated as empty, so it never blocks an upgrade.
 */
export async function getPackageChangelog(options: {
  pkgName: string;
  pkgVersion: string;
  archiveIterator?: ArchiveIterator;
}): Promise<Changelog> {
  try {
    const changelogText = await readChangelog(options);
    if (!changelogText) {
      return [];
    }
    const changelog = parse(changelogText);
    return Array.isArray(changelog) ? changelog.filter(isValidChangelogEntry) : [];
  } catch (error) {
    appContextService
      .getLogger()
      .warn(
        `Unable to read the changelog of ${options.pkgName}-${options.pkgVersion}, skipping the breaking changes check: ${error.message}`
      );
    return [];
  }
}

/**
 * Returns the breaking changes listed in the changelog of `toVersion` for the versions greater
 * than `fromVersion` up to `toVersion`.
 */
export async function getBreakingChangesForUpgrade({
  pkgName,
  fromVersion,
  toVersion,
  archiveIterator,
}: {
  pkgName: string;
  fromVersion: string;
  toVersion: string;
  archiveIterator?: ArchiveIterator;
}): Promise<BreakingChangesLog> {
  if (semverLte(toVersion, fromVersion)) {
    return [];
  }
  const changelog = await getPackageChangelog({ pkgName, pkgVersion: toVersion, archiveIterator });
  return getBreakingChangesInRange(changelog, fromVersion, toVersion);
}

export function formatBreakingChangesMessage({
  pkgName,
  fromVersion,
  toVersion,
  breakingChanges,
}: {
  pkgName: string;
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChangesLog;
}) {
  const changes = breakingChanges
    .flatMap(({ version, changes: versionChanges }) =>
      versionChanges.map(({ description, link }) => `- ${version}: ${description} (${link})`)
    )
    .join('\n');

  return `Upgrading ${pkgName} from ${fromVersion} to ${toVersion} includes breaking changes:\n${changes}\nReview the breaking changes and confirm the upgrade from the ${pkgName} integration in Kibana, or set acknowledge_breaking_changes to true.`;
}

/**
 * Throws a PackageBreakingChangesNotAcknowledgedError if upgrading the package from `fromVersion`
 * to `toVersion` includes breaking changes.
 */
export async function assertBreakingChangesAcknowledged(options: {
  pkgName: string;
  fromVersion: string;
  toVersion: string;
  archiveIterator?: ArchiveIterator;
}) {
  const breakingChanges = await getBreakingChangesForUpgrade(options);
  if (breakingChanges.length > 0) {
    throw new PackageBreakingChangesNotAcknowledgedError(
      formatBreakingChangesMessage({ ...options, breakingChanges }),
      breakingChanges
    );
  }
}

/**
 * Returns the package policies whose upgrade to the installed package version includes breaking
 * changes. The changelog is read once per package.
 */
export async function getPackagePoliciesUpgradeBreakingChanges(
  packagePolicies: PackagePolicy[]
): Promise<PackagePolicyBreakingChanges[]> {
  const packagePoliciesByPackage = new Map<string, PackagePolicy[]>();
  for (const packagePolicy of packagePolicies) {
    if (!packagePolicy.package) {
      continue;
    }
    const pkgPolicies = packagePoliciesByPackage.get(packagePolicy.package.name) ?? [];
    pkgPolicies.push(packagePolicy);
    packagePoliciesByPackage.set(packagePolicy.package.name, pkgPolicies);
  }

  const savedObjectsClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const results: PackagePolicyBreakingChanges[] = [];

  for (const [pkgName, pkgPolicies] of packagePoliciesByPackage) {
    const installation = await getInstallation({ savedObjectsClient, pkgName });
    const toVersion = installation?.version;
    if (!toVersion) {
      continue;
    }

    const policiesToUpgrade = pkgPolicies.filter((packagePolicy) =>
      semverLt(packagePolicy.package!.version, toVersion)
    );
    if (policiesToUpgrade.length === 0) {
      continue;
    }

    const changelog = await getPackageChangelog({ pkgName, pkgVersion: toVersion });
    for (const packagePolicy of policiesToUpgrade) {
      const breakingChanges = getBreakingChangesInRange(
        changelog,
        packagePolicy.package!.version,
        toVersion
      );
      if (breakingChanges.length > 0) {
        results.push({ packagePolicy, toVersion, breakingChanges });
      }
    }
  }

  return results;
}

export function packagePolicyBreakingChangesToError({
  packagePolicy,
  toVersion,
  breakingChanges,
}: PackagePolicyBreakingChanges) {
  return new PackageBreakingChangesNotAcknowledgedError(
    `Package policy ${packagePolicy.id}: ${formatBreakingChangesMessage({
      pkgName: packagePolicy.package!.name,
      fromVersion: packagePolicy.package!.version,
      toVersion,
      breakingChanges,
    })}`,
    breakingChanges
  );
}

/**
 * Throws a PackageBreakingChangesNotAcknowledgedError if upgrading any of the package policies to
 * the installed package version includes breaking changes.
 */
export async function assertPackagePoliciesUpgradeAcknowledged(packagePolicies: PackagePolicy[]) {
  const results = await getPackagePoliciesUpgradeBreakingChanges(packagePolicies);
  if (results.length > 0) {
    throw new PackageBreakingChangesNotAcknowledgedError(
      results.map((result) => packagePolicyBreakingChangesToError(result).message).join('\n\n'),
      // Policies of the same package share entries; entries of different packages are kept even
      // when they have the same version.
      uniqWith(
        results.flatMap(({ breakingChanges }) => breakingChanges),
        isEqual
      )
    );
  }
}
