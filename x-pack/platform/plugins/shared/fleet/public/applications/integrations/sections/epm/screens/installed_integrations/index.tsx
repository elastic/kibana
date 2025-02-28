/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { Loading } from '../../../../../../components';
import { useUrlPagination } from '../../../../../../hooks';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import { useUrlFilters } from './hooks/use_url_filters';
import { InstalledIntegrationsSearchBar } from './components/installed_integrations_search_bar';

export const InstalledIntegrationsPage: React.FunctionComponent = () => {
  // State management
  const filters = useUrlFilters();
  const pagination = useUrlPagination();
  const { installedPackages, countPerStatus, isLoading, isInitialLoading, total } =
    useInstalledIntegrations(filters, pagination.pagination);

  if (isInitialLoading) {
    return <Loading />;
  }

  return (
    <>
      <InstalledIntegrationsSearchBar filters={filters} countPerStatus={countPerStatus} />
      <EuiSpacer size="m" />
      <InstalledIntegrationsTable
        total={total}
        pagination={pagination}
        isLoading={isInitialLoading || isLoading}
        installedPackages={installedPackages}
      />
    </>
  );
};
