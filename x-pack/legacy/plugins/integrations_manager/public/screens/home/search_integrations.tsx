/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Search as LocalSearch } from 'js-search';
import { IntegrationList, IntegrationListItem } from '../../../common/types';
import { getIntegrations } from '../../data';
import { SearchResults } from './search_results';

type SearchField = keyof IntegrationListItem;

const idField: SearchField = 'name';
const fieldsToSearch: SearchField[] = ['description', 'name', 'title'];
const localSearch = new LocalSearch(idField);
fieldsToSearch.forEach(field => localSearch.addIndex(field));

let allIntegrations: IntegrationList = [];
(async function buildLocalSearch() {
  allIntegrations = await getIntegrations();
  localSearch.addDocuments(allIntegrations);
})();

export function SearchIntegrations({ term }: { term: string }) {
  const matches = localSearch.search(term) as IntegrationList;
  const matchingIds = matches.map(match => match[idField]);
  const filtered = allIntegrations.filter(item => matchingIds.includes(item[idField]));

  return <SearchResults term={term} results={filtered} />;
}
