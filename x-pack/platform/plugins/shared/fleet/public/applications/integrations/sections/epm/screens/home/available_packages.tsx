/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiHorizontalRule, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { useBreadcrumbs } from '../../../../hooks';

import { PackageListGrid } from '../../components/package_list_grid';

import { IntegrationPreference } from '../../components/integration_preference';
import { AgentlessFilter } from '../../components/agentless_filter';
import { NoEprCallout } from '../../components/no_epr_callout';

import { CategoryFacets } from './category_facets';

import { categoryExists } from '.';

import { useAvailablePackages } from './hooks/use_available_packages';

import type { ExtendedIntegrationCategory } from './category_facets';

export const AvailablePackages: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    preference,
    setPreference,
    onlyAgentlessFilter,
    setOnlyAgentlessFilter,
    isAgentlessEnabled,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    searchTerm,
    setSearchTerm,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled });

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setCategory(id as ExtendedIntegrationCategory);
      setSearchTerm('');
      setSelectedSubCategory(undefined);
      setUrlandPushHistory({
        searchString: '',
        categoryId: id,
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    },
    [setCategory, setSearchTerm, setSelectedSubCategory, setUrlandPushHistory, onlyAgentlessFilter]
  );

  const onOnlyAgentlessFilterChange = useCallback(
    (enabled: boolean) => {
      setOnlyAgentlessFilter(enabled);
      setUrlandPushHistory({
        searchString: searchTerm,
        categoryId: selectedCategory,
        subCategoryId: selectedSubCategory || '',
        onlyAgentless: enabled,
      });
    },
    [
      setOnlyAgentlessFilter,
      setUrlandPushHistory,
      searchTerm,
      selectedCategory,
      selectedSubCategory,
    ]
  );

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({
      searchString: searchTerm,
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
    return null;
  }

  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      {isAgentlessEnabled && (
        <>
          <AgentlessFilter
            agentlessFilter={onlyAgentlessFilter}
            onAgentlessFilterChange={onOnlyAgentlessFilterChange}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <IntegrationPreference initialType={preference} onChange={setPreference} />
    </EuiFlexItem>,
  ];

  if (mainCategories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={isLoading}
          categories={mainCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = <NoEprCallout statusCode={error?.statusCode} />;
  }

  return (
    <PackageListGrid
      isLoading={isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations}
      controls={controls}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      list={filteredCards}
      selectedCategory={selectedCategory}
      setCategory={setCategory}
      categories={mainCategories}
      setUrlandReplaceHistory={setUrlandReplaceHistory}
      setUrlandPushHistory={setUrlandPushHistory}
      callout={noEprCallout}
      showCardLabels={false}
      availableSubCategories={availableSubCategories}
      selectedSubCategory={selectedSubCategory}
      setSelectedSubCategory={setSelectedSubCategory}
      showMissingIntegrationMessage
      onlyAgentlessFilter={onlyAgentlessFilter}
    />
  );
};
