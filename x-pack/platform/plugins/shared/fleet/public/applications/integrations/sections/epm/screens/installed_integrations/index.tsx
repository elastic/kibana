/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';

import { Loading } from '../../../../../../components';
import { useUrlPagination } from '../../../../../../hooks';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import {
  useUrlFilters,
  useViewCollectionInstances,
  useViewPolicies,
} from './hooks/use_url_filters';
import { InstalledIntegrationsSearchBar } from './components/installed_integrations_search_bar';
import type { InstalledPackageUIPackageListItem } from './types';
import { useInstalledIntegrationsActions } from './hooks/use_installed_integrations_actions';
import { BulkActionContextProvider } from './hooks/use_bulk_actions_context';
import { PackagePoliciesPanel } from './components/package_policies_panel';
import { CollectionInstancesPanel } from './components/collection_instances_panel';
import { useCollectionInstances } from './hooks/use_collection_instances';

const InstalledIntegrationsPageContent: React.FunctionComponent<{
  prereleaseIntegrationsEnabled: boolean;
}> = ({ prereleaseIntegrationsEnabled }) => {
  // State management
  const filters = useUrlFilters();
  const { selectedPackageViewPolicies } = useViewPolicies();
  const { selectedPackageViewCollectionInstances } = useViewCollectionInstances();
  const { instancesByPackage } = useCollectionInstances();
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

  const collectionInstancesSelectedItem = useMemo(
    () =>
      selectedPackageViewCollectionInstances
        ? installedPackages.find((item) => item.name === selectedPackageViewCollectionInstances)
        : null,
    [selectedPackageViewCollectionInstances, installedPackages]
  );

  const collectionInstanceCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(instancesByPackage).map(([packageName, instances]) => [
          packageName,
          instances.length,
        ])
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
        <InstalledIntegrationsTable
          total={total}
          pagination={pagination}
          isLoading={isInitialLoading || isLoading}
          installedPackages={installedPackages}
          selection={{ selectedItems, setSelectedItems }}
          collectionInstanceCounts={collectionInstanceCounts}
        />
      </div>
      {viewPoliciesSelectedItem ? (
        <PackagePoliciesPanel installedPackage={viewPoliciesSelectedItem} />
      ) : null}
      {collectionInstancesSelectedItem ? (
        <CollectionInstancesPanel
          installedPackage={collectionInstancesSelectedItem}
          instances={instancesByPackage[collectionInstancesSelectedItem.name] ?? []}
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
