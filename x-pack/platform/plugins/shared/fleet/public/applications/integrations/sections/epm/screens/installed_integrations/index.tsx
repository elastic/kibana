/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { Loading } from '../../../../../../components';
import { useGetPackageInfoByKeyQuery, useUrlPagination } from '../../../../../../hooks';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import {
  useUrlFilters,
  useViewOnboardingInstances,
  useViewPolicies,
} from './hooks/use_url_filters';
import { InstalledIntegrationsSearchBar } from './components/installed_integrations_search_bar';
import type { InstalledPackageUIPackageListItem, PanelPackage } from './types';
import { useInstalledIntegrationsActions } from './hooks/use_installed_integrations_actions';
import { BulkActionContextProvider } from './hooks/use_bulk_actions_context';
import { PackagePoliciesPanel } from './components/package_policies_panel';
import { OnboardingInstancesPanel } from './components/onboarding_instances_panel';
import { useOnboardingInstances } from './hooks/use_onboarding_instances';

const InstalledIntegrationsPageContent: React.FunctionComponent<{
  prereleaseIntegrationsEnabled: boolean;
}> = ({ prereleaseIntegrationsEnabled }) => {
  // State management
  const filters = useUrlFilters();
  const { selectedPackageViewPolicies } = useViewPolicies();
  const { selectedPackageViewOnboardingInstances } = useViewOnboardingInstances();
  const {
    isEnabled: isOnboardingInstancesEnabled,
    onboardingInstanceCounts,
    isError: isOnboardingInstancesError,
    refetch: refetchOnboardingInstances,
  } = useOnboardingInstances();
  const pagination = useUrlPagination();
  const { upgradingIntegrations, uninstallingIntegrations, rollingbackIntegrations } =
    useInstalledIntegrationsActions();
  const {
    installedPackages,
    countPerStatus,
    customIntegrationsCount,
    isLoading,
    isInitialLoading,
    total,
  } = useInstalledIntegrations(
    filters,
    pagination.pagination,
    upgradingIntegrations,
    uninstallingIntegrations,
    rollingbackIntegrations,
    prereleaseIntegrationsEnabled
  );

  const [selectedItems, setSelectedItems] = useState<InstalledPackageUIPackageListItem[]>([]);

  const viewPoliciesSelectedItem = useMemo(
    () =>
      selectedPackageViewPolicies
        ? installedPackages.find((item) => item.name === selectedPackageViewPolicies)
        : null,
    [selectedPackageViewPolicies, installedPackages]
  );

  const onboardingInstancesItemOnPage = useMemo(
    () =>
      selectedPackageViewOnboardingInstances
        ? installedPackages.find((item) => item.name === selectedPackageViewOnboardingInstances)
        : undefined,
    [selectedPackageViewOnboardingInstances, installedPackages]
  );
  // A link from outside, like Finish in the AWS onboarding flow, can name a package that is not on
  // the current page of the table: read its title and icon from the package itself. The panel loads
  // the package's instances either way.
  const { data: onboardingInstancesPackageInfo, isError: isOnboardingInstancesPackageInfoError } =
    useGetPackageInfoByKeyQuery(
      selectedPackageViewOnboardingInstances ?? '',
      undefined,
      undefined,
      {
        enabled:
          isOnboardingInstancesEnabled &&
          !!selectedPackageViewOnboardingInstances &&
          !onboardingInstancesItemOnPage,
      }
    );
  const onboardingInstancesSelectedItem: PanelPackage | undefined = useMemo(() => {
    // Without instances (flag off, or no access) a link to them opens nothing.
    if (!isOnboardingInstancesEnabled || !selectedPackageViewOnboardingInstances) return;
    if (onboardingInstancesItemOnPage) return onboardingInstancesItemOnPage;
    const item = onboardingInstancesPackageInfo?.item;
    if (item?.name === selectedPackageViewOnboardingInstances) {
      return { name: item.name, title: item.title, version: item.version, icons: item.icons };
    }
    // The package info is only for the title: without it, still show the instances, named after
    // the package (its icon falls back to a logo for the package name, or a generic icon).
    if (isOnboardingInstancesPackageInfoError) {
      return {
        name: selectedPackageViewOnboardingInstances,
        title: selectedPackageViewOnboardingInstances,
        version: '',
      };
    }
  }, [
    isOnboardingInstancesEnabled,
    onboardingInstancesItemOnPage,
    onboardingInstancesPackageInfo,
    isOnboardingInstancesPackageInfoError,
    selectedPackageViewOnboardingInstances,
  ]);

  if (isInitialLoading) {
    return <Loading />;
  }

  return (
    <>
      <div
        css={css`
          margin: auto;
          height: 100%;
        `}
      >
        <InstalledIntegrationsSearchBar
          filters={filters}
          customIntegrationsCount={customIntegrationsCount}
          countPerStatus={countPerStatus}
          selectedItems={selectedItems}
        />
        <EuiSpacer size="l" />
        {isOnboardingInstancesError ? (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              size="s"
              data-test-subj="instancesLoadError"
              title={i18n.translate('xpack.fleet.epmInstalledIntegrations.instancesError', {
                defaultMessage: 'Could not load the instances',
              })}
            >
              <EuiButton
                size="s"
                color="warning"
                onClick={() => refetchOnboardingInstances()}
                data-test-subj="instancesRetry"
              >
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.instancesRetry"
                  defaultMessage="Retry"
                />
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <InstalledIntegrationsTable
          total={total}
          pagination={pagination}
          isLoading={isInitialLoading || isLoading}
          installedPackages={installedPackages}
          selection={{ selectedItems, setSelectedItems }}
          onboardingInstanceCounts={onboardingInstanceCounts}
        />
      </div>
      {viewPoliciesSelectedItem ? (
        <PackagePoliciesPanel installedPackage={viewPoliciesSelectedItem} />
      ) : null}
      {onboardingInstancesSelectedItem ? (
        <OnboardingInstancesPanel
          key={onboardingInstancesSelectedItem.name}
          installedPackage={onboardingInstancesSelectedItem}
        />
      ) : null}
    </>
  );
};

export const InstalledIntegrationsPage: React.FunctionComponent<{
  prereleaseIntegrationsEnabled: boolean;
}> = ({ prereleaseIntegrationsEnabled }) => {
  return (
    <BulkActionContextProvider>
      <InstalledIntegrationsPageContent
        prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled}
      />
    </BulkActionContextProvider>
  );
};
