/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import semverLt from 'semver/functions/lt';

import { installationStatuses } from '../../common/constants';
import type { Installation } from '../../common/types';
import type { PackagePolicy } from '../types';

import { useGetPackagesQuery } from './use_request/epm';

export const useIsPackagePolicyUpgradable = () => {
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackagesQuery({
    prerelease: true,
  });

  const allInstalledPackages = useMemo(
    () => (allPackages?.items || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.items]
  );

  const findInstalledPackage = useCallback(
    (pkgPolicy: PackagePolicy) => {
      if (!pkgPolicy.package) return undefined;
      return allInstalledPackages.find(
        (pkg) => 'installationInfo' in pkg && pkg.installationInfo?.name === pkgPolicy.package!.name
      );
    },
    [allInstalledPackages]
  );

  const isPackagePolicyUpgradable = useCallback(
    (pkgPolicy: PackagePolicy) => {
      const installedPackage = findInstalledPackage(pkgPolicy);
      if (
        pkgPolicy.package &&
        installedPackage?.installationInfo?.version &&
        semverLt(pkgPolicy.package.version, installedPackage.installationInfo.version)
      ) {
        return true;
      }
      return false;
    },
    [findInstalledPackage]
  );

  const getPackagePolicyUpgradeReview = useCallback(
    (pkgPolicy: PackagePolicy): Installation['pending_upgrade_review'] | undefined => {
      const installedPackage = findInstalledPackage(pkgPolicy);
      return installedPackage?.installationInfo?.pending_upgrade_review;
    },
    [findInstalledPackage]
  );

  const getUpgradeVersion = useCallback(
    (pkgPolicy: PackagePolicy): string | undefined => {
      const installedPackage = findInstalledPackage(pkgPolicy);
      return installedPackage?.installationInfo?.version;
    },
    [findInstalledPackage]
  );

  const getKeepPoliciesUpToDate = useCallback(
    (pkgPolicy: PackagePolicy): boolean => {
      const installedPackage = findInstalledPackage(pkgPolicy);
      return installedPackage?.installationInfo?.keep_policies_up_to_date === true;
    },
    [findInstalledPackage]
  );

  return {
    isPackagePolicyUpgradable,
    getPackagePolicyUpgradeReview,
    getKeepPoliciesUpToDate,
    getUpgradeVersion,
    isLoadingPackages,
  };
};
