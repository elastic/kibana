/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import semverLt from 'semver/functions/lt';

import { useLocalSearch } from '../../../../../hooks';
import type { PackageListItem } from '../../../../../../../../common';
import { useGetPackagesQuery, type Pagination } from '../../../../../../../hooks';
import type {
  InstalledIntegrationsFilter,
  InstalledPackagesUIInstallationStatus,
  InstalledPackageUIPackageListItem,
} from '../types';

function getIntegrationStatus(item: PackageListItem): InstalledPackagesUIInstallationStatus {
  if (item.status === 'install_failed') {
    return 'install_failed';
  } else if (item.status === 'installed') {
    const isUpgradeFailed = item?.installationInfo?.latest_install_failed_attempts?.some(
      (attempt) =>
        item.installationInfo && semverLt(item.installationInfo.version, attempt.target_version)
    );

    const isUpgradeAvailable =
      (item?.installationInfo && semverLt(item.installationInfo.version, item.version)) ?? false;

    return isUpgradeFailed
      ? 'upgrade_failed'
      : isUpgradeAvailable
      ? 'upgrade_available'
      : 'installed';
  }

  return item.status ?? 'not_installed';
}

export function useInstalledIntegrations(
  filters: InstalledIntegrationsFilter,
  pagination: Pagination
) {
  const { data, isInitialLoading, isLoading } = useGetPackagesQuery({
    withPackagePoliciesCount: true,
  });

  const internalInstalledPackages: InstalledPackageUIPackageListItem[] = useMemo(
    () =>
      // Filter not installed packages
      (data?.items.filter((item) => item.status !== 'not_installed') ?? [])
        // Add extra properties
        .map((item) => ({
          ...item,
          ui: {
            installation_status: getIntegrationStatus(item),
          },
        })),
    [data]
  );

  const localSearch = useLocalSearch(internalInstalledPackages, isInitialLoading);

  const internalInstalledPackagesFiltered: InstalledPackageUIPackageListItem[] = useMemo(() => {
    const searchResults: InstalledPackageUIPackageListItem[] =
      filters.q && localSearch
        ? (localSearch.search(filters.q) as InstalledPackageUIPackageListItem[])
        : [];

    return (
      internalInstalledPackages
        // Filter according to filters
        .filter((item) => {
          const validInstalationStatus = filters.installationStatus
            ? filters.installationStatus.includes(item.ui.installation_status)
            : true;

          const validSearchTerms = filters.q ? searchResults.find((s) => s.id === item.id) : true;

          const validCustomIntegrations = filters.customIntegrations
            ? item?.installationInfo?.install_source === 'custom'
            : true;

          return validInstalationStatus && validSearchTerms && validCustomIntegrations;
        })
    );
  }, [internalInstalledPackages, localSearch, filters]);

  const countPerStatus = useMemo(() => {
    return internalInstalledPackagesFiltered.reduce((acc, item) => {
      if (!acc[item.ui.installation_status]) {
        acc[item.ui.installation_status] = 0;
      }
      (acc[item.ui.installation_status] as number)++;

      return acc;
    }, {} as { [k: string]: number | undefined });
  }, [internalInstalledPackagesFiltered]);

  const customIntegrationsCount = useMemo(() => {
    return internalInstalledPackagesFiltered.reduce((acc, item) => {
      return item?.installationInfo?.install_source === 'custom' ? acc + 1 : acc;
    }, 0);
  }, [internalInstalledPackagesFiltered]);

  const installedPackages: InstalledPackageUIPackageListItem[] = useMemo(() => {
    // Pagination
    const startAt = (pagination.currentPage - 1) * pagination.pageSize;
    return internalInstalledPackagesFiltered.slice(startAt, startAt + pagination.pageSize);
  }, [internalInstalledPackagesFiltered, pagination.currentPage, pagination.pageSize]);

  return {
    total: internalInstalledPackagesFiltered.length,
    countPerStatus,
    customIntegrationsCount,
    installedPackages,
    isInitialLoading,
    isLoading,
  };
}
