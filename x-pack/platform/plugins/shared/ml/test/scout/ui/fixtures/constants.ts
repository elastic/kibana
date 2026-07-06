/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';

export const FAREQUOTE_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/ml/farequote';

export const DATA_VIEW_TITLE = 'ft_farequote';
export const TIME_FIELD_NAME = '@timestamp';

export const SAVED_SEARCH_TITLE = 'ft_farequote_kuery';
export const FAREQUOTE_KUERY_SAVED_SEARCH_ID = 'scout-ft-farequote-kuery';

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

export const createFarequoteKuerySavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  dataViewId: string
): Promise<void> => {
  await kbnClient.savedObjects.create({
    type: 'search',
    id: FAREQUOTE_KUERY_SAVED_SEARCH_ID,
    overwrite: true,
    attributes: {
      title: SAVED_SEARCH_TITLE,
      description: '',
      columns: ['_source'],
      sort: ['@timestamp', 'desc'],
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          highlightAll: true,
          version: true,
          query: {
            query: EXPECTED_DISCOVER_QUERY,
            language: 'kuery',
          },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  });
};
