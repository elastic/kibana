/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import {
  esQuery,
  Query,
  IIndexPattern,
  esKuery,
} from '../../../../../../../../../src/plugins/data/public';
import { SavedSearch } from '../../../../../../../../../src/legacy/core_plugins/kibana/public/discover/types';
import { KibanaConfigTypeFix } from '../../../contexts/kibana';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../common/constants/search';
import { SavedSearchSavedObject } from '../../../../../common/types/kibana';
import { getQueryFromSavedSearch } from '../../../util/index_utils';

export interface SearchItems {
  indexPattern: IIndexPattern;
  savedSearch: SavedSearch;
  query: Query;
  combinedQuery: any;
}

// Provider for creating the items used for searching and job creation.
// Uses the $route object to retrieve the indexPattern and savedSearch from the url

export function createSearchItems(
  kibanaConfig: KibanaConfigTypeFix,
  indexPattern: IndexPattern,
  savedSearch: SavedSearchSavedObject | null
) {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  let query: Query = {
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

  if (savedSearch !== null) {
    const data = getQueryFromSavedSearch(savedSearch);

    query = data.query;
    const filter = data.filter;

    const filters = Array.isArray(filter) ? filter : [];

    if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
      const ast = esKuery.fromKueryExpression(query.query);
      combinedQuery = esKuery.toElasticsearchQuery(ast, indexPattern);
    } else {
      const esQueryConfigs = esQuery.getEsQueryConfig(kibanaConfig);
      combinedQuery = esQuery.buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
    }
  }

  return {
    query,
    combinedQuery,
  };
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
