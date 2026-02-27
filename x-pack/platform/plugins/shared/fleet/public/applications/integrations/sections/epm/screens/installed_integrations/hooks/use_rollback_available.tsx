/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useGetBulkRollbackAvailableCheck, useLicense } from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';

export const hasPreviousVersion = (item: InstalledPackageUIPackageListItem) => {
  return !!item.installationInfo?.previous_version;
};
export const isRollbackTTLExpired = (item: InstalledPackageUIPackageListItem) => {
  return !!item.installationInfo?.is_rollback_ttl_expired;
};

export const isInstalledFromRegistry = (item: InstalledPackageUIPackageListItem) => {
  return item.installationInfo?.install_source === 'registry';
};

export const checkRollbackAvailability = (
  item: InstalledPackageUIPackageListItem,
  licenseService: ReturnType<typeof useLicense>,
  isAvailableBackendCheck: boolean
) => {
  return (
    hasPreviousVersion(item) &&
    !!licenseService.isEnterprise() &&
    !isRollbackTTLExpired(item) &&
    isInstalledFromRegistry(item) &&
    isAvailableBackendCheck
  );
};

export const useRollbackAvailablePackages = (
  items: InstalledPackageUIPackageListItem[]
): Record<string, boolean> => {
  const licenseService = useLicense();
  const rollbackAvailablePackages = useGetBulkRollbackAvailableCheck();

  return useMemo(() => {
    const isRollbackAvailablePackages: Record<string, boolean> = {};
    items.forEach((item) => {
      isRollbackAvailablePackages[item.name] = checkRollbackAvailability(
        item,
        licenseService,
        rollbackAvailablePackages[item.name]?.isAvailable ?? false
      );
    });
    return isRollbackAvailablePackages;
  }, [items, licenseService, rollbackAvailablePackages]);
};
