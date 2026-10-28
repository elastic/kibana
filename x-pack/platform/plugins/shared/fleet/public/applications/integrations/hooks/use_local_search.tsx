/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { PackageListItem } from '../types';

export const searchIdField = 'id';
export const fieldsToSearch = ['name', 'title', 'description', 'searchableContent'] as const;

// Same word separators as the js-search tokenizer this replaced: hyphens and apostrophes stay inside a word.
const WORD_SEPARATOR = /[^a-zа-яё0-9\-']+/i;

const toWords = (text: string): string[] =>
  text.toLocaleLowerCase().trim().split(WORD_SEPARATOR).filter(Boolean);

type SearchablePackage = Pick<PackageListItem, 'id' | 'name' | 'title' | 'description'> & {
  searchableContent?: string;
};

export type UseLocalSearchType = typeof useLocalSearch;

/** Matches packages where every query word is the start of a word in one of the searched fields. */
export function useLocalSearch(packageList: SearchablePackage[], isInitialLoading: boolean) {
  return useMemo(() => {
    if (isInitialLoading) {
      return null;
    }
    const indexedPackages = packageList.map((item) => ({
      item,
      words: fieldsToSearch.flatMap((field) => {
        const value = item[field];
        return value == null ? [] : toWords(String(value));
      }),
    }));

    return {
      search: (query: string): SearchablePackage[] => {
        const queryWords = toWords(query);
        if (queryWords.length === 0) {
          return [];
        }
        return indexedPackages
          .filter(({ words }) =>
            queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))
          )
          .map(({ item }) => item);
      },
    };
  }, [isInitialLoading, packageList]);
}
