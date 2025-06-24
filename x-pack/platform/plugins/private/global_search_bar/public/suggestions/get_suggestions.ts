/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ITagsCache } from '@kbn/saved-objects-tagging-oss-plugin/public';

interface GetSuggestionOptions {
  searchTerm: string;
  searchableTypes: string[];
  tagCache?: ITagsCache;
}

export interface SearchSuggestion {
  key: string;
  label: string;
  description: string;
  icon: string;
  suggestedSearch: string;
}

export const getSuggestions = ({
  searchTerm,
  searchableTypes,
  tagCache,
}: GetSuggestionOptions): SearchSuggestion[] => {
  const results: SearchSuggestion[] = [];
  const suggestionTerm = searchTerm.trim();

  const matchingType = findIgnoreCase(searchableTypes, suggestionTerm);
  if (matchingType) {
    const suggestedSearch = escapeIfWhiteSpaces(matchingType);
    results.push({
      key: '__type__suggestion__',
      label: `type: ${matchingType}`,
      icon: 'filter',
      description: i18n.translate('xpack.globalSearchBar.suggestions.filterByTypeLabel', {
        defaultMessage: 'Filter by type',
      }),
      suggestedSearch: `type:${suggestedSearch}`,
    });
  }

  if (tagCache && searchTerm) {
    const matchingTag = tagCache
      .getState()
      .find((tag) => equalsIgnoreCase(tag.name, suggestionTerm));
    if (matchingTag) {
      const suggestedSearch = escapeIfWhiteSpaces(matchingTag.name);
      results.push({
        key: '__tag__suggestion__',
        label: `tag: ${matchingTag.name}`,
        icon: 'tag',
        description: i18n.translate('xpack.globalSearchBar.suggestions.filterByTagLabel', {
          defaultMessage: 'Filter by tag name',
        }),
        suggestedSearch: `tag:${suggestedSearch}`,
      });
    }
  }

  return results;
};

const findIgnoreCase = (array: string[], target: string) => {
  for (const item of array) {
    if (equalsIgnoreCase(item, target)) {
      return item;
    }
  }
  return undefined;
};

const equalsIgnoreCase = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const escapeIfWhiteSpaces = (term: string) => {
  if (/\s/g.test(term)) {
    return `"${term}"`;
  }
  return term;
};
