/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import semverSatisfies from 'semver/functions/satisfies';
import semverRcompare from 'semver/functions/rcompare';
import semverGt from 'semver/functions/gt';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { type InstallablePackage, SO_SEARCH_LIMIT } from '../../../../../../common';
import { getInstallation, getInstalledPackageSavedObjects } from '../../get';
import { installPackage } from '../../install';
import type { InstallContext } from '../_state_machine_package_install';
import { fetchList, pkgToPkgKey } from '../../../registry';
import { withPackageSpan } from '../../utils';

export async function stepResolveDependencies(context: InstallContext) {
  const { logger } = context;

  const isPrerelease = true; // TODO Should probably come from install context

  // if install request and not install dependencies Query dependendant packages
  await withPackageSpan('Resolving dependencies', async () => {
    // Check dependants package TODO allow flag to skip dependency check for now use force
    if (!context.force) {
      const dependants = await getDependantsPackages(
        context.savedObjectsClient,
        context.packageInstallContext.packageInfo.name
      );

      for (const dependant of dependants) {
        const dependencyRequiredVersion = dependant.attributes.dependencies?.find(
          (d) => d.name === context.packageInstallContext.packageInfo.name
        )?.version;

        if (
          dependencyRequiredVersion &&
          !semverSatisfies(
            context.packageInstallContext.packageInfo.version,
            dependencyRequiredVersion
          )
        ) {
          throw new Error(
            `Package ${context.packageInstallContext.packageInfo.name}@${context.packageInstallContext.packageInfo.version} is not compatible with dependant ${dependant.attributes.name}@${dependant.attributes.version}`
          );
        }
      }
    }

    // Check dependencies
    const resolvedDependencies = await buildDependencies(
      context.savedObjectsClient,
      context.packageInstallContext.packageInfo,
      { prerelease: isPrerelease }
    );

    for (const dependency of resolvedDependencies) {
      if (dependency.status === 'installed') {
        logger.info(
          `stepResolveDependencies: dependency ${dependency.name}@${dependency.resolvedVersion} is already installed`
        );
        continue;
      } else if (dependency.status === 'to_install') {
        logger.info(
          `stepResolveDependencies: installing dependency ${dependency.name}@${dependency.resolvedVersion}`
        );
        await installPackage({
          installSource: 'registry',
          savedObjectsClient: context.savedObjectsClient,
          esClient: context.esClient,
          pkgkey: pkgToPkgKey({ name: dependency.name, version: dependency.resolvedVersion }),
          spaceId: context.spaceId,
          force: context.force,
          prerelease: isPrerelease,
          // TODO pass some flag to say it's install from dependency resolution
        });
      } else if (dependency.status === 'to_update') {
        logger.info(
          `stepResolveDependencies: updating dependency ${dependency.name}@${dependency.resolvedVersion}`
        );
        await installPackage({
          installSource: 'registry',
          savedObjectsClient: context.savedObjectsClient,
          esClient: context.esClient,
          pkgkey: pkgToPkgKey({ name: dependency.name, version: dependency.resolvedVersion }),
          spaceId: context.spaceId,
          force: context.force,
          prerelease: isPrerelease,
          // TODO pass some flag to say it's install from dependency resolution
        });
      }
    }
  });
}

interface ResolvedDependency {
  name: string;
  requiredVersion: string;
  resolvedVersion: string;
  status: 'installed' | 'to_update' | 'to_install';
}

async function buildDependencies(
  soClient: SavedObjectsClientContract,
  packageInfo: InstallablePackage,
  opts?: { prerelease?: boolean }
): Promise<ResolvedDependency[]> {
  const requiredContentPackages =
    packageInfo.requires?.content?.map((pkg) => ({
      name: pkg.package,
      requiredVersion: pkg.version,
    })) ?? [];

  if (!requiredContentPackages.length) {
    return [];
  }
  // Retrieve installed packages
  const dependenciesWithInstalledPackage = await pMap(
    requiredContentPackages,
    async (pkg) => {
      const installation = await getInstallation({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
      });
      return { installation, requiredPackage: pkg };
    },
    { concurrency: 10 }
  );

  const resolvedDependencies: ResolvedDependency[] = [];

  for (const {
    installation,
    requiredPackage: { name, requiredVersion },
  } of dependenciesWithInstalledPackage) {
    if (!installation) {
      const resolvedVersion = await getCompatibleVersion(name, [requiredVersion], {
        prerelease: opts?.prerelease,
      });
      resolvedDependencies.push({
        name,
        requiredVersion,
        resolvedVersion,
        status: 'to_install',
      });
    } else if (!semverSatisfies(installation.version, requiredVersion)) {
      // Package installed but version doesn't satisfy constraint - need to update
      // Get all dependants to collect their version constraints
      const dependants = await getDependantsPackages(soClient, name);

      const versionConstraints = dependants.reduce(
        (acc, curr) => {
          const versionConstraint = curr.attributes.dependencies?.find(
            (d) => d.name === name
          )?.version;
          if (versionConstraint) {
            acc.push(versionConstraint);
          }
          return acc;
        },
        [requiredVersion]
      );

      const resolvedVersion = await getCompatibleVersion(name, versionConstraints, {
        prerelease: opts?.prerelease,
      });
      if (semverGt(installation.version, resolvedVersion)) {
        // TODO create proper Fleet error with metadata to handle this case in the UI
        throw new Error(
          `Required package ${name}@${requiredVersion} is not compatible with installed version ${installation.version}, you need to downgrade that package first.`
        );
      }
      resolvedDependencies.push({
        name,
        requiredVersion,
        resolvedVersion,
        status: 'to_update',
      });
    } else {
      resolvedDependencies.push({
        name,
        requiredVersion,
        resolvedVersion: installation.version,
        status: 'installed',
      });
    }
  }

  return resolvedDependencies;
}

/**
 * Return compatible version for given package and version constraints, throw on error
 */
async function getCompatibleVersion(
  pkgName: string,
  versionConstrains: string[],
  opts?: { prerelease?: boolean }
) {
  const res = await fetchList({
    all: true,
    package: pkgName,
    prerelease: opts?.prerelease,
  });

  const allAvailableVersions = res.sort((a, b) => semverRcompare(a.version, b.version));

  for (const registryPackage of allAvailableVersions) {
    if (
      versionConstrains.every((constrain) => semverSatisfies(registryPackage.version, constrain))
    ) {
      return registryPackage.version;
    }
  }

  // TODO create proper Fleet error with metadata to handle this case in the UI
  throw new Error(
    `No compatible version found for ${pkgName} with constraints ${versionConstrains.join(', ')}`
  );
}

async function getDependantsPackages(soClient: SavedObjectsClientContract, pkgName: string) {
  const dependants = (
    await getInstalledPackageSavedObjects(soClient, {
      dependencyPackageName: pkgName,
      perPage: SO_SEARCH_LIMIT,
      sortOrder: 'asc',
    })
  ).saved_objects.filter((obj) => obj.attributes.name !== pkgName);

  return dependants;
}
