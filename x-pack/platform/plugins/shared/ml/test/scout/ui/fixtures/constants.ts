/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';

export {
  FAREQUOTE_ES_ARCHIVE,
  FAREQUOTE_INDEX as DATA_VIEW_TITLE,
  FAREQUOTE_INDEX,
  FAREQUOTE_KUERY_SAVED_SEARCH_ID,
  FAREQUOTE_SAVED_SEARCHES,
  FAREQUOTE_SAVED_SEARCH_SETS,
  IHP_OUTLIER_ES_ARCHIVE,
  IHP_OUTLIER_INDEX,
  SAVED_SEARCH_TITLE,
  TIME_FIELD_NAME,
  createFarequoteKuerySavedSearch,
  createFarequoteSavedSearches,
  createSavedSearchFarequoteFilterAndKueryIfNeeded,
  createSavedSearchFarequoteKueryIfNeeded,
  deleteAllFarequoteSavedSearches,
  deleteFarequoteSavedSearches,
} from './farequote_saved_searches';

export const EXPECTED_DISCOVER_QUERY = 'airline: A* and responsetime > 5';
export const DOC_COUNT_FORMATTED = '34,415';

export const ADVANCED_JOB_DATAFEED_QUERY = JSON.stringify(
  {
    bool: {
      must: [
        {
          match_all: {},
        },
      ],
    },
  },
  null,
  2
);

/** Saved-object attributes for the shared 'ML Test' dashboard created in every DFA spec's beforeAll. */
export const ML_TEST_DASHBOARD_ATTRIBUTES = {
  title: 'ML Test',
  hits: 0,
  description: '',
  panelsJSON: '[]',
  optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
  version: 1,
  timeRestore: false,
  kibanaSavedObjectMeta: {
    searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
  },
} as const;

export type KbnClient = ScoutWorkerFixtures['kbnClient'];
