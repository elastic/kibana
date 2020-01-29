/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineFiltersAndUserSearch, stringifyKueries } from '../lib/helper';
import { esKuery } from '../../../../../../src/plugins/data/common/es_query';
import { store } from '../state';
import { setEsKueryString } from '../state/actions';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';

const updateEsQueryForFilterGroup = (filterQueryString: string, indexPattern: IIndexPattern) => {
  // Update EsQuery in Redux to be used in FilterGroup
  const searchDSL: string = filterQueryString
    ? JSON.stringify(
        esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(filterQueryString), indexPattern)
      )
    : '';
  store.dispatch(setEsKueryString(searchDSL));
};

const getKueryString = (urlFilters: string): string => {
  let kueryString = '';
  // We are using try/catch here because this is user entered value
  // and JSON.parse and stringifyKueries can have hard time parsing
  // all possible scenarios
  try {
    if (urlFilters !== '') {
      const filterMap = new Map<string, Array<string | number>>(JSON.parse(urlFilters));
      kueryString = stringifyKueries(filterMap);
    }
  } catch {
    kueryString = '';
  }
  return kueryString;
};

export const useUpdateKueryString = (
  indexPattern: IIndexPattern,
  filterQueryString = '',
  urlFilters: string
): [string?, Error?] => {
  const kueryString = getKueryString(urlFilters);

  const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);

  let esFilters: string | undefined;
  try {
    if ((filterQueryString || urlFilters) && indexPattern) {
      const ast = esKuery.fromKueryExpression(combinedFilterString);

      const elasticsearchQuery = esKuery.toElasticsearchQuery(ast, indexPattern);

      esFilters = JSON.stringify(elasticsearchQuery);

      updateEsQueryForFilterGroup(filterQueryString, indexPattern);
    }
    return [esFilters];
  } catch (err) {
    return [urlFilters, err];
  }
};
