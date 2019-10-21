/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';
import { buildEsQuery, getEsQueryConfig } from '@kbn/es-query';
import { KibanaConfigTypeFix } from '../../../contexts/kibana';
import { InjectorService } from '../../../../common/types/angular';

export interface SearchItems {
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  query: any;
  combinedQuery: any;
}

// Provider for creating the items used for searching and job creation.
// Uses the $route object to retrieve the indexPattern and savedSearch from the url
export function SearchItemsProvider($injector: InjectorService) {
  const kibanaConfig = $injector.get<KibanaConfigTypeFix>('config');
  const $route = $injector.get<any>('$route');

  function createSearchItems() {
    let indexPattern = $route.current.locals.indexPattern;

    // query is only used by the data visualizer as it needs
    // a lucene query_string.
    // Using a blank query will cause match_all:{} to be used
    // when passed through luceneStringToDsl
    let query = {
      query: '',
      language: 'lucene',
    };

    let combinedQuery: any = {
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
      },
    };

    const savedSearch = $route.current.locals.savedSearch;
    if (indexPattern.id === undefined && savedSearch.id !== undefined) {
      const searchSource = savedSearch.searchSource;
      indexPattern = searchSource.getField('index');

      query = searchSource.getField('query');
      const fs = searchSource.getField('filter');

      const filters = fs.length ? fs : [];

      const esQueryConfigs = getEsQueryConfig(kibanaConfig);
      combinedQuery = buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
    }

    return {
      indexPattern,
      savedSearch,
      query,
      combinedQuery,
    };
  }

  return createSearchItems;
}

// Only model plot cardinality relevant
// format:[{id:"cardinality_model_plot_high",modelPlotCardinality:11405}, {id:"cardinality_partition_field",fieldName:"clientip"}]
interface CheckCardinalitySuccessResponse {
  success: boolean;
  highCardinality?: any;
}
export function checkCardinalitySuccess(data: any) {
  const response: CheckCardinalitySuccessResponse = {
    success: true,
  };
  // There were no fields to run cardinality on.
  if (Array.isArray(data) && data.length === 0) {
    return response;
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i].id === 'success_cardinality') {
      break;
    }

    if (data[i].id === 'cardinality_model_plot_high') {
      response.success = false;
      response.highCardinality = data[i].modelPlotCardinality;
      break;
    }
  }

  return response;
}
