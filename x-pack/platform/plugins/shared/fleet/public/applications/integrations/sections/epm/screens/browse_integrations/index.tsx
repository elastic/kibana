/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFieldSearch, EuiFlexItem, EuiFlexGroup, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';

import { useBreadcrumbs, useStartServices } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar, StickyFlexItem } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import { NoDataPrompt } from './components/no_data_prompt';
import {
  ManageIntegrationsTable,
  type CreatedIntegrationRow,
} from './components/manage_integrations_table';
import { CreateNewIntegrationButton } from './components/create_new_integration';

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const { automaticImportVTwo, application } = useStartServices();
  const { pathname, search } = useLocation();
  const history = useHistory();
  const euiTheme = useEuiTheme();

  const automaticImportCapabilities = (
    application.capabilities as Record<string, { view?: boolean } | undefined>
  ).automatic_import;
  const canReadAutomaticImportIntegrations =
    automaticImportCapabilities?.view ?? Boolean(automaticImportVTwo);

  const useGetAllIntegrationsHook = canReadAutomaticImportIntegrations
    ? automaticImportVTwo?.hooks.useGetAllIntegrations ?? useEmptyAllIntegrations
    : useEmptyAllIntegrations;
  const {
    integrations,
    isLoading: isLoadingCreatedIntegrations,
    isError: isCreatedIntegrationsError,
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

  const {
    allCategories,
    initialSelectedCategory,
    selectedCategory,
    mainCategories,
    onlyAgentlessFilter,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    setUrlandReplaceHistory,
    filteredCards,
    onCategoryChange,
  } = useBrowseIntegrationHook({ prereleaseIntegrationsEnabled });

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({
      searchString: '',
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
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
            ? automaticImportVTwo?.components.CreateIntegrationSideCardButton
            : undefined
        }
        hasCreatedIntegrations={hasCreatedIntegrations}
        onManageIntegrationsClick={onManageIntegrationsClick}
      />
      <EuiFlexItem grow={5}>
        <EuiFlexGroup direction="column" gutterSize="none">
          {isManageIntegrationsView ? (
            <StickyFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow>
                  <EuiFieldSearch
                    compressed
                    placeholder={i18n.translate(
                      'xpack.fleet.epmList.manageIntegrations.searchPlaceholder',
                      { defaultMessage: 'Search integrations' }
                    )}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <CreateNewIntegrationButton />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </StickyFlexItem>
          ) : (
            <SearchAndFiltersBar />
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
