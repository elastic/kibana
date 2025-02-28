/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import semverLt from 'semver/functions/lt';
import { Search as LocalSearch, PrefixIndexStrategy } from 'js-search';

import type { PackageListItem } from '../../../../../../../../common';
import { useGetPackagesQuery, type Pagination } from '../../../../../../../hooks';
import type {
  InstalledIntegrationsFilter,
  PackageInstallationStatus,
  PackageListItemWithExtra,
} from '../types';

function getIntegrationStatus(item: PackageListItem): PackageInstallationStatus {
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

const fieldsToSearch = ['name', 'title', 'description'];
function useLocalSearch(packageList: PackageListItemWithExtra[], isInitialLoading: boolean) {
  return useMemo(() => {
    if (isInitialLoading) {
      return null;
    }
    const localSearch = new LocalSearch('id');
    localSearch.indexStrategy = new PrefixIndexStrategy();
    fieldsToSearch.forEach((field) => localSearch.addIndex(field));
    localSearch.addDocuments(packageList);

    return localSearch;
  }, [isInitialLoading, packageList]);
}

export function useInstalledIntegrations(
  filters: InstalledIntegrationsFilter,
  pagination: Pagination
) {
  const { data, isInitialLoading, isLoading } = useGetPackagesQuery({
    withPackagePoliciesCount: true,
  });

  const internalInstalledPackages: PackageListItemWithExtra[] = useMemo(
    () =>
      // Filter not installed packages
      (data?.items.filter((item) => item.status !== 'not_installed') ?? [])
        // Add extra properties
        .map((item) => ({
          ...item,
          extra: {
            installation_status: getIntegrationStatus(item),
          },
        })),
    [data]
  );

  const localSearch = useLocalSearch(internalInstalledPackages, isInitialLoading);

  const internalInstalledPackagesFiltered: PackageListItemWithExtra[] = useMemo(() => {
    const searchResults: PackageListItemWithExtra[] =
      filters.q && localSearch ? (localSearch.search(filters.q) as PackageListItemWithExtra[]) : [];

    return (
      internalInstalledPackages
        // Filter according to filters
        .filter((item) => {
          const validInstalationStatus = filters.installationStatus
            ? filters.installationStatus.includes(item.extra.installation_status)
            : true;

          const validSearchTerms = filters.q ? searchResults.find((s) => s.id === item.id) : true;

          return validInstalationStatus && validSearchTerms;
        })
    );
  }, [internalInstalledPackages, localSearch, filters]);

  const countPerStatus = useMemo(() => {
    return internalInstalledPackagesFiltered.reduce((acc, item) => {
      if (!acc[item.extra.installation_status]) {
        acc[item.extra.installation_status] = 0;
      }
      (acc[item.extra.installation_status] as number)++;

      return acc;
    }, {} as { [k: string]: number | undefined });
  }, [internalInstalledPackagesFiltered]);

  const installedPackages: PackageListItemWithExtra[] = useMemo(() => {
    // Pagination
    const startAt = (pagination.currentPage - 1) * pagination.pageSize;
    return internalInstalledPackagesFiltered.slice(startAt, startAt + pagination.pageSize);
  }, [internalInstalledPackagesFiltered, pagination.currentPage, pagination.pageSize]);

  return {
    total: internalInstalledPackagesFiltered.length,
    countPerStatus,
    installedPackages,
    isInitialLoading,
    isLoading,
  };
}
