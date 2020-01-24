/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineFiltersAndUserSearch, stringifyKueries } from '../lib/helper';
import { esKuery } from '../../../../../../src/plugins/data/common/es_query';
import { store } from '../state';
import { setEsKueryString } from '../state/actions';

export const useUpdateKueryString = (indexPattern: any, search: string, urlFilters: string) => {
  let error: any;
  let kueryString: string = '';
  try {
    if (urlFilters !== '') {
      const filterMap = new Map<string, Array<string | number>>(JSON.parse(urlFilters));
      kueryString = stringifyKueries(filterMap);
    }
  } catch {
    kueryString = '';
  }

  const filterQueryString = search || '';
  let filters: any | undefined;
  try {
    if (filterQueryString || urlFilters) {
      if (indexPattern) {
        const staticIndexPattern = indexPattern;
        const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);
        const ast = esKuery.fromKueryExpression(combinedFilterString);
        const elasticsearchQuery = esKuery.toElasticsearchQuery(ast, staticIndexPattern);
        filters = JSON.stringify(elasticsearchQuery);
        const searchDSL: string = filterQueryString
          ? JSON.stringify(
              esKuery.toElasticsearchQuery(
                esKuery.fromKueryExpression(filterQueryString),
                staticIndexPattern
              )
            )
          : '';
        store.dispatch(setEsKueryString(searchDSL));
      }
    }
    return [filters, error];
  } catch (e) {
    error = e;
    return [urlFilters, error];
  }
};
