/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import semverLt from 'semver/functions/lt';

import type { PackageListItem } from '../../../../../../../../common';
import { useGetPackagesQuery } from '../../../../../../../hooks';
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

export function useInstalledIntegrations(filters: InstalledIntegrationsFilter) {
  const { data, isInitialLoading, isLoading } = useGetPackagesQuery({});

  const installedPackages: PackageListItemWithExtra[] = useMemo(
    () =>
      // Filter not installed packages
      (data?.items.filter((item) => item.status !== 'not_installed') ?? [])
        // Add extra properties
        .map((item) => ({
          ...item,
          extra: {
            installation_status: getIntegrationStatus(item),
          },
        }))
        // Filter according to filters
        .filter((item) => {
          if (filters.installationStatus) {
            return filters.installationStatus.includes(item.extra.installation_status);
          }

          return true;
        }),
    [data, filters]
  );

  return {
    installedPackages,
    isInitialLoading,
    isLoading,
  };
}
