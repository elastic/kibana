/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatterns } from 'ui/index_patterns';
import { SavedObjectAttributes, SimpleSavedObject } from 'kibana/public';
import chrome from 'ui/chrome';
import { SavedSearchLoader } from '../../../../../../src/legacy/core_plugins/kibana/public/discover/types';
import { setup as data } from '../../../../../../src/legacy/core_plugins/data/public/legacy';

type IndexPatternSavedObject = SimpleSavedObject<SavedObjectAttributes>;

let indexPatternCache: IndexPatternSavedObject[] = [];
let fullIndexPatterns: IndexPatterns | null = null;

export let refreshIndexPatterns: (() => Promise<IndexPatternSavedObject[]>) | null = null;

export function loadIndexPatterns() {
  fullIndexPatterns = data.indexPatterns.indexPatterns;
  const savedObjectsClient = chrome.getSavedObjectsClient();
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
            loadIndexPatterns()
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

export function getIndexPatterns() {
  return indexPatternCache;
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
  return name;
}

export function loadCurrentIndexPattern(indexPatterns: IndexPatterns, $route: Record<string, any>) {
  fullIndexPatterns = indexPatterns;
  return fullIndexPatterns.get($route.current.params.index);
}

export function getIndexPatternById(id: string): IndexPattern {
  if (fullIndexPatterns !== null) {
    return fullIndexPatterns.get(id);
  } else {
    throw new Error('Index patterns are not initialized!');
  }
}

export function loadCurrentSavedSearch(
  savedSearches: SavedSearchLoader,
  $route: Record<string, any>
) {
  return savedSearches.get($route.current.params.savedSearchId);
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
