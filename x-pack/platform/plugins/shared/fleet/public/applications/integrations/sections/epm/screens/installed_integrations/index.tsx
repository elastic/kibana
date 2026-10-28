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
import {
  MAX_CLOUD_ONBOARDING_DEPLOYMENTS,
  useGetPackageInfoByKeyQuery,
  useUrlPagination,
} from '../../../../../../hooks';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import { useUrlFilters, useViewInstances, useViewPolicies } from './hooks/use_url_filters';
import { InstalledIntegrationsSearchBar } from './components/installed_integrations_search_bar';
import type { InstalledPackageUIPackageListItem, PanelPackage } from './types';
import { useInstalledIntegrationsActions } from './hooks/use_installed_integrations_actions';
import { BulkActionContextProvider } from './hooks/use_bulk_actions_context';
import { PackagePoliciesPanel } from './components/package_policies_panel';
import { InstancesPanel } from './components/instances_panel';
import { useInstances } from './hooks/use_instances';

const InstalledIntegrationsPageContent: React.FunctionComponent<{
  prereleaseIntegrationsEnabled: boolean;
}> = ({ prereleaseIntegrationsEnabled }) => {
  // State management
  const filters = useUrlFilters();
  const { selectedPackageViewPolicies } = useViewPolicies();
  const { selectedPackageViewInstances } = useViewInstances();
  const {
    instancesByPackage,
    isError: isInstancesError,
    isTruncated: isInstancesTruncated,
    refetch: refetchInstances,
  } = useInstances();
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

  const instancesItemOnPage = useMemo(
    () =>
      selectedPackageViewInstances
        ? installedPackages.find((item) => item.name === selectedPackageViewInstances)
        : undefined,
    [selectedPackageViewInstances, installedPackages]
  );
  // A link from outside, like Finish in the AWS onboarding flow, can name a package that is not on
  // the current page of the table: read its title and icon from the package itself. The instances
  // come from the full list either way.
  const { data: instancesPackageInfo } = useGetPackageInfoByKeyQuery(
    selectedPackageViewInstances ?? '',
    undefined,
    undefined,
    { enabled: !!selectedPackageViewInstances && !instancesItemOnPage }
  );
  const instancesSelectedItem: PanelPackage | undefined = useMemo(() => {
    if (instancesItemOnPage) return instancesItemOnPage;
    const item = instancesPackageInfo?.item;
    if (!selectedPackageViewInstances || item?.name !== selectedPackageViewInstances) return;
    return { name: item.name, title: item.title, version: item.version, icons: item.icons };
  }, [instancesItemOnPage, instancesPackageInfo, selectedPackageViewInstances]);

  const instanceCounts = useMemo(
    () =>
      new Map(
        [...instancesByPackage].map(([packageName, instances]) => [packageName, instances.length])
      ),
    [instancesByPackage]
  );

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
        {isInstancesError ? (
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
                onClick={() => refetchInstances()}
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
        {isInstancesTruncated ? (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              size="s"
              data-test-subj="instancesTruncated"
              title={i18n.translate('xpack.fleet.epmInstalledIntegrations.instancesTruncated', {
                defaultMessage:
                  'Only the {max} most recent instances are shown, so some instance counts may be incomplete.',
                values: { max: MAX_CLOUD_ONBOARDING_DEPLOYMENTS },
              })}
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        <InstalledIntegrationsTable
          total={total}
          pagination={pagination}
          isLoading={isInitialLoading || isLoading}
          installedPackages={installedPackages}
          selection={{ selectedItems, setSelectedItems }}
          instanceCounts={instanceCounts}
        />
      </div>
      {viewPoliciesSelectedItem ? (
        <PackagePoliciesPanel installedPackage={viewPoliciesSelectedItem} />
      ) : null}
      {instancesSelectedItem ? (
        <InstancesPanel
          installedPackage={instancesSelectedItem}
          instances={instancesByPackage.get(instancesSelectedItem.name) ?? []}
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
