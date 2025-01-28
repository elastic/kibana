/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiLoadingSpinner } from '@elastic/eui';

import { installationStatuses } from '../../../../../../../common/constants';

import { INTEGRATIONS_ROUTING_PATHS, INTEGRATIONS_SEARCH_QUERYPARAM } from '../../../../constants';
import { DefaultLayout } from '../../../../layouts';
import { isPackageUpdatable } from '../../../../services';

import { useAuthz, useGetPackagesQuery, useGetSettingsQuery } from '../../../../hooks';

import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';

import { InstalledPackages } from './installed_packages';
import { AvailablePackages } from './available_packages';

export { mapToCard, type IntegrationCardItem } from './card_utils';

export interface CategoryParams {
  category?: ExtendedIntegrationCategory;
  subcategory?: string;
}

export const getParams = (params: CategoryParams, search: string) => {
  const { category, subcategory } = params;
  const selectedCategory: ExtendedIntegrationCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam, selectedSubcategory: subcategory };
};

export const categoryExists = (category: string, categories: CategoryFacet[]) => {
  return categories.some((c) => c.id === category);
};

export const EPMHomePage: React.FC = () => {
  const authz = useAuthz();
  const isAuthorizedToFetchSettings = authz.fleet.readSettings;
  const { data: settings, isFetchedAfterMount: isSettingsFetched } = useGetSettingsQuery({
    enabled: isAuthorizedToFetchSettings,
  });

  const prereleaseIntegrationsEnabled = settings?.item.prerelease_integrations_enabled ?? false;
  const shouldFetchPackages = !isAuthorizedToFetchSettings || isSettingsFetched;
  // loading packages to find installed ones
  const { data: allPackages, isLoading } = useGetPackagesQuery(
    {
      prerelease: prereleaseIntegrationsEnabled,
    },
    {
      enabled: shouldFetchPackages,
    }
  );

  const installedPackages = useMemo(
    () =>
      (allPackages?.items || []).filter(
        (pkg) =>
          pkg.status === installationStatuses.Installed ||
          pkg.status === installationStatuses.InstallFailed
      ),
    [allPackages]
  );

  const unverifiedPackageCount = useMemo(
    () =>
      installedPackages.filter(
        (pkg) =>
          pkg.installationInfo?.verification_status &&
          pkg.installationInfo.verification_status === 'unverified'
      ).length,
    [installedPackages]
  );

  const upgradeablePackageCount = useMemo(
    () => installedPackages.filter(isPackageUpdatable).length,
    [installedPackages]
  );

  const notificationsBySection = {
    manage: unverifiedPackageCount + upgradeablePackageCount,
  };

  if (!shouldFetchPackages) {
    return <EuiLoadingSpinner />;
  }

  return (
    <Routes>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage" notificationsBySection={notificationsBySection}>
          <InstalledPackages installedPackages={installedPackages} isLoading={isLoading} />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse" notificationsBySection={notificationsBySection}>
          <AvailablePackages prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled} />
        </DefaultLayout>
      </Route>
    </Routes>
  );
};
