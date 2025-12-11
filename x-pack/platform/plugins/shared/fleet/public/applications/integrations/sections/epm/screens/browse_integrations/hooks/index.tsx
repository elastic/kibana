/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useAvailablePackages } from '../../home/hooks/use_available_packages';
import type { ExtendedIntegrationCategory } from '../../home/category_facets';
import { useLocalSearch } from '@kbn/fleet-plugin/public/applications/integrations/hooks';

export function useBrowseIntegrationHook({
  prereleaseIntegrationsEnabled,
}: {
  prereleaseIntegrationsEnabled: boolean;
}) {
  const {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    onlyAgentlessFilter,
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

  const localSearch = useLocalSearch(filteredCards, !!isLoading);

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

  return {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    onlyAgentlessFilter,
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
    onCategoryChange,
  };
}
