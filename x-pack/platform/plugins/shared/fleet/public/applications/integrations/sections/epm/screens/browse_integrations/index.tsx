/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, useEuiTheme, EuiSpacer } from '@elastic/eui';

import { useBreadcrumbs } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import { NoDataPrompt } from './components/no_data_prompt';

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const euiTheme = useEuiTheme();

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
      />
      <EuiFlexItem grow={5}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <SearchAndFiltersBar />
          {noEprCallout ? noEprCallout : null}
          <EuiFlexItem
            grow={1}
            data-test-subj="epmList.mainColumn"
            style={{
              position: 'relative',
              backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
            }}
          >
            {filteredCards.length === 0 && !isLoading ? (
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
