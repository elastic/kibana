/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search as LocalSearch, PrefixIndexStrategy } from 'js-search';
import { useMemo } from 'react';

import type { PackageListItem } from '../types';

export const searchIdField = 'id';
export const fieldsToSearch = ['name', 'title', 'description'];

export function useLocalSearch(
  packageList: Array<Pick<PackageListItem, 'id' | 'name' | 'title' | 'description'>>,
  isInitialLoading: boolean
) {
  return useMemo(() => {
    if (isInitialLoading) {
      return null;
    }
    const localSearch = new LocalSearch(searchIdField);
    localSearch.indexStrategy = new PrefixIndexStrategy();
    fieldsToSearch.forEach((field) => localSearch.addIndex(field));
    localSearch.addDocuments(packageList);

    return localSearch;
  }, [isInitialLoading, packageList]);
}
