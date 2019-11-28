/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, IUiSettingsClient } from 'src/core/public';
import {
  IndexPattern as IndexPatternType,
  IndexPatterns as IndexPatternsType,
} from 'ui/index_patterns';
import { esQuery } from '../../../../../../../../src/plugins/data/public';

type IndexPatternId = string;
type SavedSearchId = string;

let indexPatternCache = [];
let fullIndexPatterns;
let currentIndexPattern = null;
let currentSavedSearch = null;

export let refreshIndexPatterns: () => Promise<unknown>;

export function loadIndexPatterns(
  savedObjectsClient: SavedObjectsClientContract,
  indexPatterns: IndexPatternsType
) {
  fullIndexPatterns = indexPatterns;
  return savedObjectsClient
    .find({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then(response => {
      indexPatternCache = response.savedObjects;

      if (refreshIndexPatterns === null) {
        refreshIndexPatterns = () => {
          return new Promise((resolve, reject) => {
            loadIndexPatterns(savedObjectsClient, indexPatterns)
              .then(resp => {
                resolve(resp);
              })
              .catch(error => {
                reject(error);
              });
          });
        };
      }

      return indexPatternCache;
    });
}

type CombinedQuery = Record<'bool', any> | unknown;

export function loadCurrentIndexPattern(
  indexPatterns: IndexPatternsType,
  indexPatternId: IndexPatternId
) {
  fullIndexPatterns = indexPatterns;
  currentIndexPattern = fullIndexPatterns.get(indexPatternId);
  return currentIndexPattern;
}

export function loadCurrentSavedSearch(savedSearches: any, savedSearchId: SavedSearchId) {
  currentSavedSearch = savedSearches.get(savedSearchId);
  return currentSavedSearch;
}

// Helper for creating the items used for searching and job creation.
export function createSearchItems(
  indexPattern: IndexPatternType | undefined,
  savedSearch: any,
  config: IUiSettingsClient
) {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  let query = {
    query: '',
    language: 'lucene',
  };

  let combinedQuery: CombinedQuery = {
    bool: {
      must: [
        {
          match_all: {},
        },
      ],
    },
  };

  if (indexPattern === undefined && savedSearch !== null && savedSearch.id !== undefined) {
    const searchSource = savedSearch.searchSource;
    indexPattern = searchSource.getField('index');

    query = searchSource.getField('query');
    const fs = searchSource.getField('filter');

    const filters = fs.length ? fs : [];

    const esQueryConfigs = esQuery.getEsQueryConfig(config);
    combinedQuery = esQuery.buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
  }

  return {
    indexPattern,
    savedSearch,
    query,
    combinedQuery,
  };
}
