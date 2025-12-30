/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { searchIdField, useLocalSearch } from '../../../../../hooks';

import { useAvailablePackages } from '../../home/hooks/use_available_packages';
import type { ExtendedIntegrationCategory } from '../../home/category_facets';
import type { IntegrationCardItem } from '../../home';

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
    setSearchTerm: setSearchTermState,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards: originalFilteredCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled });

  const localSearch = useLocalSearch(originalFilteredCards, !!isLoading);

  const filteredCards = useMemo(() => {
    const searchResults = searchTerm
      ? (localSearch?.search(searchTerm) as IntegrationCardItem[])?.map(
          (match) => match[searchIdField]
        ) ?? []
      : [];

    return searchTerm
      ? originalFilteredCards.filter((item) => searchResults.includes(item[searchIdField]) ?? [])
      : originalFilteredCards;
  }, [localSearch, searchTerm, originalFilteredCards]);

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setCategory(id as ExtendedIntegrationCategory);
      setSearchTermState('');
      setSelectedSubCategory(undefined);
      setUrlandPushHistory({
        searchString: '',
        categoryId: id,
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    },
    [
      setCategory,
      setSearchTermState,
      setSelectedSubCategory,
      setUrlandPushHistory,
      onlyAgentlessFilter,
    ]
  );

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);
      setUrlandReplaceHistory({
        searchString: term,
        categoryId: selectedCategory,
        subCategoryId: selectedSubCategory || '',
      });
    },
    [setSearchTermState, selectedCategory, selectedSubCategory, setUrlandReplaceHistory]
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
