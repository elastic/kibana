/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq, uniqWith } from 'lodash';
import pMap from 'p-map';
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
import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../../../constants';
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

// Only the entry shape is validated: a change with a missing field must not hide the breaking
// changes of its version, the breaking changes are picked by type later on.
const isValidChangelogEntry = (entry: unknown): entry is ChangelogEntry => {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const { version, changes } = entry as Partial<ChangelogEntry>;
  return typeof version === 'string' && Array.isArray(changes);
};

// Maximum number of package policy IDs listed per group in the error message.
const MAX_POLICY_IDS_IN_MESSAGE = 10;

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
    if (!Array.isArray(changelog)) {
      appContextService
        .getLogger()
        .warn(
          `The changelog of ${options.pkgName}-${options.pkgVersion} is not a list, skipping the breaking changes check`
        );
      return [];
    }
    const validEntries = changelog.filter(isValidChangelogEntry);
    if (validEntries.length < changelog.length) {
      appContextService
        .getLogger()
        .warn(
          `Ignoring ${changelog.length - validEntries.length} invalid entries in the changelog of ${
            options.pkgName
          }-${options.pkgVersion} for the breaking changes check`
        );
    }
    return validEntries;
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

interface BreakingChangesMessageParams {
  pkgName: string;
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChangesLog;
}

const formatBreakingChangesList = ({
  pkgName,
  fromVersion,
  toVersion,
  breakingChanges,
}: BreakingChangesMessageParams) => {
  const changes = breakingChanges
    .flatMap(({ version, changes: versionChanges }) =>
      versionChanges.map(
        ({ description, link }) =>
          `- ${version}: ${description ?? ''}${typeof link === 'string' ? ` (${link})` : ''}`
      )
    )
    .join('\n');

  return `Upgrading ${pkgName} from ${fromVersion} to ${toVersion} includes breaking changes:\n${changes}`;
};

const formatAcknowledgeHint = (pkgNames: string[]) =>
  `Review the breaking changes and confirm the upgrade from the ${pkgNames.join(', ')} ${
    pkgNames.length > 1 ? 'integrations' : 'integration'
  } in Kibana, or set acknowledge_breaking_changes to true.`;

export function formatBreakingChangesMessage(params: BreakingChangesMessageParams) {
  return `${formatBreakingChangesList(params)}\n${formatAcknowledgeHint([params.pkgName])}`;
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

  const resultsByPackage = await pMap(
    packagePoliciesByPackage.entries(),
    async ([pkgName, pkgPolicies]) => {
      const installation = await getInstallation({ savedObjectsClient, pkgName });
      const toVersion = installation?.version;
      if (!toVersion) {
        return [];
      }

      const policiesToUpgrade = pkgPolicies.filter((packagePolicy) =>
        semverLt(packagePolicy.package!.version, toVersion)
      );
      if (policiesToUpgrade.length === 0) {
        return [];
      }

      const changelog = await getPackageChangelog({ pkgName, pkgVersion: toVersion });
      return policiesToUpgrade.flatMap((packagePolicy) => {
        const breakingChanges = getBreakingChangesInRange(
          changelog,
          packagePolicy.package!.version,
          toVersion
        );
        return breakingChanges.length > 0 ? [{ packagePolicy, toVersion, breakingChanges }] : [];
      });
    },
    { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
  );

  return resultsByPackage.flat();
}

/**
 * Formats the error message of the package policies upgrade. Policies of the same package and
 * version share the same breaking changes, so they are grouped to keep the message short.
 */
const formatPackagePoliciesBreakingChangesMessage = (results: PackagePolicyBreakingChanges[]) => {
  const groups = new Map<string, { policyIds: string[]; params: BreakingChangesMessageParams }>();
  for (const { packagePolicy, toVersion, breakingChanges } of results) {
    const pkgName = packagePolicy.package!.name;
    const fromVersion = packagePolicy.package!.version;
    const key = `${pkgName}@${fromVersion}`;
    const group = groups.get(key) ?? {
      policyIds: [],
      params: { pkgName, fromVersion, toVersion, breakingChanges },
    };
    group.policyIds.push(packagePolicy.id);
    groups.set(key, group);
  }

  const sections = [...groups.values()].map(({ policyIds, params }) => {
    const listedIds = policyIds.slice(0, MAX_POLICY_IDS_IN_MESSAGE).join(', ');
    const moreIds =
      policyIds.length > MAX_POLICY_IDS_IN_MESSAGE
        ? ` and ${policyIds.length - MAX_POLICY_IDS_IN_MESSAGE} more`
        : '';
    const label = policyIds.length > 1 ? 'Package policies' : 'Package policy';
    return `${label} ${listedIds}${moreIds}: ${formatBreakingChangesList(params)}`;
  });

  const pkgNames = uniq(results.map(({ packagePolicy }) => packagePolicy.package!.name));
  return `${sections.join('\n\n')}\n\n${formatAcknowledgeHint(pkgNames)}`;
};

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
      formatPackagePoliciesBreakingChangesMessage(results),
      // Policies of the same package share entries; entries of different packages are kept even
      // when they have the same version.
      uniqWith(
        results.flatMap(({ breakingChanges }) => breakingChanges),
        isEqual
      )
    );
  }
}
