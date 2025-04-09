/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import styled from '@emotion/styled';

import { Loading } from '../../../../../../components';
import { useUrlPagination } from '../../../../../../hooks';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import { useUrlFilters, useViewPolicies } from './hooks/use_url_filters';
import { InstalledIntegrationsSearchBar } from './components/installed_integrations_search_bar';
import type { InstalledPackageUIPackageListItem } from './types';
import { BulkActionContextProvider, useBulkActions } from './hooks/use_bulk_actions';
import { PackagePoliciesPanel } from './components/package_policies_panel';

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: auto;
  height: 100%;
`;

const InstalledIntegrationsPageContent: React.FunctionComponent = () => {
  // State management
  const filters = useUrlFilters();
  const { selectedPackageViewPolicies } = useViewPolicies();
  const pagination = useUrlPagination();
  const { upgradingIntegrations, uninstallingIntegrations } = useBulkActions();
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
    uninstallingIntegrations
  );

  const [selectedItems, setSelectedItems] = useState<InstalledPackageUIPackageListItem[]>([]);

  const viewPoliciesSelectedItem = useMemo(
    () =>
      selectedPackageViewPolicies
        ? installedPackages.find((item) => item.name === selectedPackageViewPolicies)
        : null,
    [selectedPackageViewPolicies, installedPackages]
  );

  if (isInitialLoading) {
    return <Loading />;
  }

  return (
    <>
      <ContentWrapper>
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
        />
      </ContentWrapper>
      {viewPoliciesSelectedItem ? (
        <PackagePoliciesPanel installedPackage={viewPoliciesSelectedItem} />
      ) : null}
    </>
  );
};

export const InstalledIntegrationsPage: React.FunctionComponent = () => {
  return (
    <BulkActionContextProvider>
      <InstalledIntegrationsPageContent />
    </BulkActionContextProvider>
  );
};
