/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { searchIdField, useLocalSearch } from '../../../../../hooks';

import { useAvailablePackages } from '../../home/hooks/use_available_packages';
import type { IntegrationCardItem } from '../../home';

import { STATUS_DEPRECATED } from '../types';

import { useUrlFilters } from './url_filters';
import { useUrlCategories, useUrlDefaultCategories, useSetUrlCategory } from './url_categories';

// Apply a filter predicate to cards, also filtering groupMembers of collection cards so
// badge counts and flyout variants reflect the active filter state. Collections that drop
// below 2 matching members degrade to individual tiles (matching ungrouped semantics).
// singletonFilter: optional guard applied before promoting a singleton member to a top-level
// tile, so implicit visibility rules (deprecated, content) that ran before this filter step
// are still enforced on promoted cards.
function applyCardFilter(
  cards: IntegrationCardItem[],
  predicate: (card: IntegrationCardItem) => boolean,
  singletonFilter?: (member: IntegrationCardItem) => boolean
): IntegrationCardItem[] {
  const result: IntegrationCardItem[] = [];
  for (const card of cards) {
    if (!card.isCollectionCard) {
      if (predicate(card)) result.push(card);
      continue;
    }
    const filteredMembers = (card.groupMembers ?? []).filter(predicate);
    if (filteredMembers.length === 0) continue;
    if (filteredMembers.length === 1) {
      if (!singletonFilter || singletonFilter(filteredMembers[0])) {
        result.push(filteredMembers[0]);
      }
      continue;
    }
    // Recompute categories and searchableContent from surviving members so sidebar
    // counts and downstream search indexes only reflect the active variants.
    const filteredCategories = [...new Set(filteredMembers.flatMap((m) => m.categories))];
    const filteredSearchableContent = filteredMembers
      .flatMap((m) => [m.name, m.title, m.description ?? ''])
      .join(' ');
    result.push({
      ...card,
      groupMembers: filteredMembers,
      categories: filteredCategories,
      searchableContent: filteredSearchableContent,
    });
  }
  return result;
}

export function useBrowseIntegrationHook({
  prereleaseIntegrationsEnabled,
}: {
  prereleaseIntegrationsEnabled: boolean;
}) {
  const { category: urlCategory, subCategory: selectedSubCategory } = useUrlCategories();
  const urlDefaultCategories = useUrlDefaultCategories();
  const setUrlCategory = useSetUrlCategory();

  // Priority: path-based single category (sidebar click) > URL query params (multi-default).
  // Config defaults are written to the URL once on first load (in BrowseIntegrationsPage) and
  // are not re-applied here so that navigating to "All categories" or clicking X clears them.
  const effectiveCategories = useMemo<string[]>(() => {
    if (urlCategory) return [urlCategory];
    return urlDefaultCategories;
  }, [urlCategory, urlDefaultCategories]);

  // Single string used for subcategory lookup; first of effective categories, or empty for "All".
  const selectedCategory = effectiveCategories[0] || '';
  const {
    initialSelectedCategory,
    allCategories,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    allCards,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled, enableCollectionGrouping: true });

  const urlFilters = useUrlFilters();

  const localSearch = useLocalSearch(allCards, !!isLoading);
  const searchTerm = urlFilters.q ?? urlFilters.q !== '' ? urlFilters.q : undefined;

  // IDs of top-level allCards entries that match the current search term.
  // Computed once and shared by nonCategoryFilteredCards and filteredCards so both
  // can distinguish original-index matches from promoted singletons when revalidating.
  const searchResults = useMemo(
    () =>
      searchTerm
        ? (localSearch?.search(searchTerm) as IntegrationCardItem[])?.map(
            (match) => match[searchIdField]
          ) ?? []
        : [],
    [localSearch, searchTerm]
  );

  const sortedCards: IntegrationCardItem[] = useMemo(() => {
    const sortKey = urlFilters.sort ?? 'recent-old';

    if (sortKey === 'a-z') {
      return [...allCards].sort((a, b) => {
        return a.title.localeCompare(b.title);
      });
    } else if (sortKey === 'z-a') {
      return [...allCards].sort((a, b) => {
        return b.title.localeCompare(a.title);
      });
    } else {
      // TODO implement recent-old and old-recent sorting when we have a date field
      return allCards;
    }
  }, [allCards, urlFilters.sort]);

  // Cards filtered by non-category filters (search, status, setup method, signal).
  // Used to compute accurate category counts in the sidebar.
  const nonCategoryFilteredCards = useMemo(() => {
    let cards = searchTerm
      ? sortedCards.filter((item) => searchResults.includes(item[searchIdField]) ?? [])
      : sortedCards;

    // Hide deprecated integrations by default; only show them when the user has explicitly
    // enabled the filter (status includes STATUS_DEPRECATED). Collection cards have
    // isDeprecated: false, so they always pass; we don't filter their members here because
    // variants within a collection are browsed deliberately.
    const showDeprecated = urlFilters.status?.includes(STATUS_DEPRECATED) ?? false;
    if (!showDeprecated) {
      cards = cards.filter((card) => !('isDeprecated' in card && card.isDeprecated === true));
    }

    // Implicit visibility predicate reapplied to singletons promoted by degradation —
    // deprecated/content members inside a collection must not reach the top-level grid
    // unless the user has explicitly enabled those filters.
    const implicitVisible = (c: IntegrationCardItem) =>
      (showDeprecated || !('isDeprecated' in c && c.isDeprecated === true)) &&
      (urlFilters.showContent || c.type !== 'content');

    // Apply setup method filters (union: show cards matching ANY selected method).
    // applyCardFilter ensures collection members are filtered too so badge/flyout reflect
    // only the members matching the active setup method.
    const setupMethodFilters = urlFilters.setupMethod;
    if (setupMethodFilters && setupMethodFilters.length > 0) {
      cards = applyCardFilter(
        cards,
        (card) =>
          setupMethodFilters.some((method) => {
            switch (method) {
              case 'agentless':
                return card.supportsAgentless === true;
              case 'elastic_agent':
                return card.type === 'integration' || card.type === 'input';
              default:
                return false;
            }
          }),
        implicitVisible
      );
    }

    // Apply signal filters (union: show cards matching ANY selected signal).
    const signalFilters = urlFilters.signal;
    if (signalFilters && signalFilters.length > 0) {
      cards = applyCardFilter(
        cards,
        (card) => signalFilters.some((s) => card.signalTypes?.includes(s)),
        implicitVisible
      );
    }

    // Hide content packs by default; only show when the user has explicitly enabled the filter.
    // Collection cards (type: undefined) pass this filter naturally; we don't filter their
    // members here because all collection variants should remain visible inside the flyout.
    if (!urlFilters.showContent) {
      cards = cards.filter((card) => card.type !== 'content');
    }

    // Re-validate cards against the search term after member-level filtering.
    // The search index runs on allCards before applyCardFilter, so two cases need
    // a secondary check:
    //   1. Collection cards: a member removed by a filter may have been the only
    //      reason the collection matched. applyCardFilter rebuilds searchableContent
    //      from survivors; check updated content + the card's own indexed fields.
    //   2. Promoted singletons (isCollectionCard: false, id NOT in searchResults):
    //      the search found their parent collection via a removed member's text;
    //      the singleton itself must still match the query.
    // Original ungrouped cards (id IS in searchResults) are kept unconditionally.
    if (searchTerm) {
      // Split on whitespace and hyphens to match js-search's PrefixIndexStrategy tokenization,
      // which treats "nginx-otel" as two tokens ["nginx", "otel"].
      const tokens = searchTerm
        .trim()
        .toLowerCase()
        .split(/[\s-]+/);
      const matchesSearch = (card: IntegrationCardItem) => {
        const fields = [card.searchableContent ?? '', card.title, card.name, card.description ?? '']
          .join(' ')
          .toLowerCase();
        return tokens.every((token) => fields.includes(token));
      };
      cards = cards.filter((card) => {
        if (card.isCollectionCard) return matchesSearch(card);
        // Original non-collection card that passed the search index directly.
        if (searchResults.includes(card[searchIdField])) return true;
        // Promoted singleton — recheck against the search term.
        return matchesSearch(card);
      });
    }

    return cards;
  }, [
    searchResults,
    searchTerm,
    sortedCards,
    urlFilters.status,
    urlFilters.setupMethod,
    urlFilters.signal,
    urlFilters.showContent,
  ]);

  // Apply category filter on top of non-category filters.
  // When multiple effective categories are active, show cards matching ALL of them
  // (AND logic / intersection). applyCardFilter ensures collection members are filtered
  // too so the badge count and flyout variants reflect the active category state.
  // Re-sort at the end because singleton degradation can change a card's title, shifting
  // its position relative to the pre-sort from sortedCards.
  const filteredCards = useMemo(() => {
    const sortKey = urlFilters.sort ?? 'recent-old';
    const showDeprecated = urlFilters.status?.includes(STATUS_DEPRECATED) ?? false;
    const implicitVisible = (c: IntegrationCardItem) =>
      (showDeprecated || !('isDeprecated' in c && c.isDeprecated === true)) &&
      (urlFilters.showContent || c.type !== 'content');

    let result: IntegrationCardItem[];
    if (effectiveCategories.length > 0 || selectedSubCategory) {
      result = applyCardFilter(
        nonCategoryFilteredCards,
        (c) => {
          if (selectedSubCategory) return c.categories.includes(selectedSubCategory);
          return effectiveCategories.every((cat) => c.categories.includes(cat));
        },
        implicitVisible
      );

      // Re-validate after category filtering: applyCardFilter can degrade a collection to
      // a singleton from a member that didn't match the search. Apply the same check as
      // nonCategoryFilteredCards, using searchResults to keep original-index cards intact.
      if (searchTerm) {
        const tokens = searchTerm
          .trim()
          .toLowerCase()
          .split(/[\s-]+/);
        const matchesSearch = (card: IntegrationCardItem) => {
          const fields = [
            card.searchableContent ?? '',
            card.title,
            card.name,
            card.description ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return tokens.every((token) => fields.includes(token));
        };
        result = result.filter((card) => {
          if (card.isCollectionCard) return matchesSearch(card);
          if (searchResults.includes(card[searchIdField])) return true;
          return matchesSearch(card);
        });
      }
    } else {
      result = nonCategoryFilteredCards;
    }

    if (sortKey === 'a-z') {
      return [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortKey === 'z-a') {
      return [...result].sort((a, b) => b.title.localeCompare(a.title));
    }
    return result;
  }, [
    nonCategoryFilteredCards,
    effectiveCategories,
    selectedSubCategory,
    searchTerm,
    searchResults,
    urlFilters.sort,
    urlFilters.status,
    urlFilters.showContent,
  ]);

  // Recompute category counts based on non-category filtered cards so
  // sidebar counts reflect active filters (e.g. agentless, search, signal).
  // For collection cards, simulate singleton promotion: if only one member matches
  // the category and that member would be blocked by implicitVisible (e.g. deprecated),
  // don't count the collection — clicking the category would yield an empty grid.
  const filteredAllCategories = useMemo(() => {
    const showDeprecated = urlFilters.status?.includes(STATUS_DEPRECATED) ?? false;
    const implicitVisible = (c: IntegrationCardItem) =>
      (showDeprecated || !('isDeprecated' in c && c.isDeprecated === true)) &&
      (urlFilters.showContent || c.type !== 'content');

    return allCategories.map((category) => {
      if (category.id === '') {
        return { ...category, count: nonCategoryFilteredCards.length };
      }
      const count = nonCategoryFilteredCards.filter((card) => {
        if (!card.isCollectionCard) return card.categories.includes(category.id);
        const membersInCategory = (card.groupMembers ?? []).filter((m) =>
          m.categories.includes(category.id)
        );
        if (membersInCategory.length === 0) return false;
        if (membersInCategory.length >= 2) return true;
        return implicitVisible(membersInCategory[0]);
      }).length;
      return { ...category, count };
    });
  }, [allCategories, nonCategoryFilteredCards, urlFilters.status, urlFilters.showContent]);

  const filteredMainCategories = useMemo(() => {
    return filteredAllCategories.filter((category) => category.parent_id === undefined);
  }, [filteredAllCategories]);

  const availableSubCategories = useMemo(() => {
    return filteredAllCategories?.filter(
      (c) => c.parent_id !== undefined && effectiveCategories.includes(c.parent_id)
    );
  }, [filteredAllCategories, effectiveCategories]);

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setUrlCategory({ category: id });
    },
    [setUrlCategory]
  );

  const onSortChange = useCallback((sortKey: string) => {}, []);

  return {
    initialSelectedCategory,
    selectedCategory,
    selectedCategories: effectiveCategories,
    allCategories: filteredAllCategories,
    mainCategories: filteredMainCategories,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    filteredCards,
    allCards,
    availableSubCategories,
    onCategoryChange,
    onSortChange,
  };
}
