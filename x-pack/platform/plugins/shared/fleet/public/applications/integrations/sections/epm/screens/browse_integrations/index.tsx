/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useLocation, useHistory } from 'react-router-dom';

import { css } from '@emotion/react';

import { useBreadcrumbs, useStartServices } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import { useSetUrlCategory } from './hooks/url_categories';
import { NoDataPrompt } from './components/no_data_prompt';
import {
  ManageIntegrationsTable,
  type CreatedIntegrationRow,
} from './components/manage_integrations_table';

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const { automaticImport, application } = useStartServices();
  const { pathname, search } = useLocation();
  const history = useHistory();
  const euiTheme = useEuiTheme();

  const automaticImportCapabilities = (
    application.capabilities as Record<string, { view?: boolean } | undefined>
  ).automatic_import;
  const canReadAutomaticImportIntegrations =
    automaticImportCapabilities?.view ?? Boolean(automaticImport);

  const useGetAllIntegrationsHook = canReadAutomaticImportIntegrations
    ? automaticImport?.hooks.useGetAllIntegrations ?? useEmptyAllIntegrations
    : useEmptyAllIntegrations;
  const {
    integrations,
    isLoading: isLoadingCreatedIntegrations,
    isError: isCreatedIntegrationsError,
    refetch: refetchCreatedIntegrations,
  } = useGetAllIntegrationsHook();
  const hasCreatedIntegrations = integrations.length > 0;
  const isManageIntegrationsView = useMemo(() => {
    const params = new URLSearchParams(search);
    return canReadAutomaticImportIntegrations && params.get('view') === 'manage';
  }, [canReadAutomaticImportIntegrations, search]);

  const manageIntegrationsHref = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('view', 'manage');
    return `${pathname}?${params.toString()}`;
  }, [pathname, search]);
  const onManageIntegrationsClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      history.push(manageIntegrationsHref);
    },
    [history, manageIntegrationsHref]
  );

  const setUrlCategory = useSetUrlCategory();
  const {
    allCategories,
    initialSelectedCategory,
    selectedCategory,
    mainCategories,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    filteredCards,
    onCategoryChange,
    availableSubCategories,
  } = useBrowseIntegrationHook({ prereleaseIntegrationsEnabled });

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlCategory({ category: '' }, { replace: true });
    return null;
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = (
      <EuiFlexItem grow={1}>
        <NoEprCallout statusCode={error?.statusCode} />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="flexStart"
      gutterSize="none"
      data-test-subj="epmList.integrationCards"
    >
      <Sidebar
        isLoading={isLoading}
        categories={mainCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        CreateIntegrationCardButton={
          canReadAutomaticImportIntegrations
            ? automaticImport?.components.CreateIntegrationSideCardButton
            : undefined
        }
        hasCreatedIntegrations={hasCreatedIntegrations}
        onManageIntegrationsClick={onManageIntegrationsClick}
      />
      <EuiFlexItem grow={5}>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          css={css`
            padding: 16px 8px;
          `}
        >
          {!isManageIntegrationsView && (
            <SearchAndFiltersBar
              categories={mainCategories}
              availableSubCategories={availableSubCategories}
            />
          )}
          {noEprCallout ? noEprCallout : null}
          <EuiFlexItem
            grow={1}
            data-test-subj="epmList.mainColumn"
            style={{
              position: 'relative',
              backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
            }}
          >
            {isManageIntegrationsView ? (
              <ManageIntegrationsTable
                integrations={integrations}
                isLoading={isLoadingCreatedIntegrations}
                isError={isCreatedIntegrationsError}
                onRefetch={refetchCreatedIntegrations}
              />
            ) : filteredCards.length === 0 && !isLoading ? (
              <NoDataPrompt />
            ) : (
              <ResponsivePackageGrid
                items={filteredCards}
                isLoading={
                  isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function useEmptyAllIntegrations() {
  return {
    integrations: [] as CreatedIntegrationRow[],
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}
