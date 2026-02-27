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

import { useUrlFilters } from './url_filters';

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
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards: originalFilteredCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled });

  const urlFilters = useUrlFilters();

  const localSearch = useLocalSearch(originalFilteredCards, !!isLoading);
  const searchTerm = urlFilters.q ?? urlFilters.q !== '' ? urlFilters.q : undefined;

  const sortedCards: IntegrationCardItem[] = useMemo(() => {
    const sortKey = urlFilters.sort ?? 'recent-old';

    if (sortKey === 'a-z') {
      return [...originalFilteredCards].sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    } else if (sortKey === 'z-a') {
      return [...originalFilteredCards].sort((a, b) => {
        return b.name.localeCompare(a.name);
      });
    } else {
      // TODO implement recent-old and old-recent sorting when we have a date field
      return originalFilteredCards;
    }

    return sortedCards;
  }, [originalFilteredCards, urlFilters.sort]);

  const filteredCards = useMemo(() => {
    const searchResults = searchTerm
      ? (localSearch?.search(searchTerm) as IntegrationCardItem[])?.map(
          (match) => match[searchIdField]
        ) ?? []
      : [];

    let cards = searchTerm
      ? sortedCards.filter((item) => searchResults.includes(item[searchIdField]) ?? [])
      : sortedCards;

    // Apply status filters
    const statusFilters = urlFilters.status;
    if (statusFilters && statusFilters.length > 0) {
      const filterDeprecated = statusFilters.includes('deprecated');

      if (filterDeprecated) {
        cards = cards.filter((card) => {
          return 'isDeprecated' in card && card.isDeprecated === true;
        });
      }
    }

    // Apply setup method filters (union: show cards matching ANY selected method)
    const setupMethodFilters = urlFilters.setupMethod;
    if (setupMethodFilters && setupMethodFilters.length > 0) {
      cards = cards.filter((card) => {
        return setupMethodFilters.some((method) => {
          switch (method) {
            case 'agentless':
              return card.supportsAgentless === true;
            case 'elastic_agent':
              return card.type === 'integration' || card.type === 'input';
            default:
              return false;
          }
        });
      });
    }

    // Apply signal filters (union: show cards matching ANY selected signal)
    const signalFilters = urlFilters.signal;
    if (signalFilters && signalFilters.length > 0) {
      cards = cards.filter((card) => signalFilters.some((s) => card.signalTypes?.includes(s)));
    }

    return cards;
  }, [
    localSearch,
    searchTerm,
    sortedCards,
    urlFilters.status,
    urlFilters.setupMethod,
    urlFilters.signal,
  ]);

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setCategory(id as ExtendedIntegrationCategory);
      setSelectedSubCategory(undefined);
      setUrlandPushHistory({
        searchString: '',
        categoryId: id,
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    },
    [setCategory, setSelectedSubCategory, setUrlandPushHistory, onlyAgentlessFilter]
  );

  const onSortChange = useCallback((sortKey: string) => {}, []);

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
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
    onCategoryChange,
    onSortChange,
  };
}
