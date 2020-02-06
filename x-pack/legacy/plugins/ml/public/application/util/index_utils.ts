/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { Query } from 'src/plugins/data/public';
import {
  IndexPattern,
  IIndexPattern,
  IndexPatternsContract,
} from '../../../../../../../src/plugins/data/public';
import { IndexPatternSavedObject, SavedSearchSavedObject } from '../../../common/types/kibana';

let indexPatternCache: IndexPatternSavedObject[] = [];
let savedSearchesCache: SavedSearchSavedObject[] = [];
let indexPatternsContract: IndexPatternsContract | null = null;

export function loadIndexPatterns(indexPatterns: IndexPatternsContract) {
  indexPatternsContract = indexPatterns;
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then(response => {
      indexPatternCache = response.savedObjects;
      return indexPatternCache;
    });
}

export function loadSavedSearches() {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find({
      type: 'search',
      perPage: 10000,
    })
    .then(response => {
      savedSearchesCache = response.savedObjects;
      return savedSearchesCache;
    });
}

export async function loadSavedSearchById(id: string) {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  const ss = await savedObjectsClient.get('search', id);
  return ss.error === undefined ? ss : null;
}

export function getIndexPatterns() {
  return indexPatternCache;
}

export function getIndexPatternsContract() {
  return indexPatternsContract;
}

export function getIndexPatternNames() {
  return indexPatternCache.map(i => i.attributes && i.attributes.title);
}

export function getIndexPatternIdFromName(name: string) {
  for (let j = 0; j < indexPatternCache.length; j++) {
    if (indexPatternCache[j].get('title') === name) {
      return indexPatternCache[j].id;
    }
  }
  return null;
}

export async function getIndexPatternAndSavedSearch(savedSearchId: string) {
  const resp: { savedSearch: SavedSearchSavedObject | null; indexPattern: IIndexPattern | null } = {
    savedSearch: null,
    indexPattern: null,
  };

  if (savedSearchId === undefined) {
    return resp;
  }

  const ss = await loadSavedSearchById(savedSearchId);
  if (ss === null) {
    return resp;
  }
  const indexPatternId = ss.references.find(r => r.type === 'index-pattern')?.id;
  resp.indexPattern = await getIndexPatternById(indexPatternId!);
  resp.savedSearch = ss;
  return resp;
}

export function getQueryFromSavedSearch(savedSearch: SavedSearchSavedObject) {
  const search = savedSearch.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
  return JSON.parse(search.searchSourceJSON) as {
    query: Query;
    filter: any[];
  };
}

export function getIndexPatternById(id: string): Promise<IndexPattern> {
  if (indexPatternsContract !== null) {
    return indexPatternsContract.get(id);
  } else {
    throw new Error('Index patterns are not initialized!');
  }
}

export function getSavedSearchById(id: string): SavedSearchSavedObject | undefined {
  return savedSearchesCache.find(s => s.id === id);
}

/**
 * Returns true if the index passed in is time based
 * an optional flag will trigger the display a notification at the top of the page
 * warning that the index is not time based
 */
export function timeBasedIndexCheck(indexPattern: IndexPattern, showNotification = false) {
  if (!indexPattern.isTimeBased()) {
    if (showNotification) {
      toastNotifications.addWarning({
        title: i18n.translate('xpack.ml.indexPatternNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The index pattern {indexPatternTitle} is not based on a time series',
          values: { indexPatternTitle: indexPattern.title },
        }),
        text: i18n.translate('xpack.ml.indexPatternNotBasedOnTimeSeriesNotificationDescription', {
          defaultMessage: 'Anomaly detection only runs over time-based indices',
        }),
      });
    }
    return false;
  } else {
    return true;
  }
}
