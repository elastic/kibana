/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Search as LocalSearch } from 'js-search';
import { PackageList, PackageListItem } from '../../../server/types';
import { SearchResults } from './search_results';

export { LocalSearch };
export type SearchField = keyof PackageListItem;
export const searchIdField: SearchField = 'name';
export const fieldsToSearch: SearchField[] = ['description', 'name', 'title'];

interface SearchPackagesProps {
  searchTerm: string;
  localSearchRef: React.MutableRefObject<LocalSearch | null>;
  allPackages: PackageList;
}

export function SearchPackages({ searchTerm, localSearchRef, allPackages }: SearchPackagesProps) {
  // this means the search index hasn't been built yet.
  // i.e. the intial fetch of all packages hasn't finished
  if (!localSearchRef.current) return <div>Still fetching matches. Try again in a moment.</div>;

  const matches = localSearchRef.current.search(searchTerm) as PackageList;
  const matchingIds = matches.map(match => match[searchIdField]);
  const filtered = allPackages.filter(item => matchingIds.includes(item[searchIdField]));

  return <SearchResults term={searchTerm} results={filtered} />;
}
