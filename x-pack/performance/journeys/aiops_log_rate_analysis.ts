/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

import { frequentItemSetsLargeArraysSource } from '../../test/functional/apps/aiops/log_rate_analysis/test_data/__mocks__/frequent_item_sets_large_arrays';

const indexName = 'large_arrays';
let dataViewId: string;

interface DocWithArray {
  '@timestamp': number;
  items: string[];
}

export const journey = new Journey({
  beforeSteps: async ({ kbnUrl, log, auth, es, kibanaServer }) => {
    // Create index with mapping
    await es.indices.create({
      index: indexName,
      mappings: {
        properties: {
          items: { type: 'keyword' },
          '@timestamp': { type: 'date' },
        },
      },
    });

    await es.bulk({
      refresh: 'wait_for',
      body: frequentItemSetsLargeArraysSource.reduce((docs, items) => {
        if (docs === undefined) return [];
        docs.push({ index: { _index: indexName } });
        docs.push({
          '@timestamp': 1562254538700,
          items,
        });
        return docs;
      }, [] as estypes.BulkRequest<DocWithArray, DocWithArray>['body']),
    });

    const dataViewResp = await kibanaServer.request({
      method: 'POST',
      path: '/api/saved_objects/index-pattern',
      body: {
        attributes: { title: indexName, timeFieldName: '@timestamp' },
      },
    });

    dataViewId = dataViewResp?.data?.id;
  },
  afterSteps: async ({ kbnUrl, log, auth, es, kibanaServer }) => {
    // Delete index
    try {
      await es.indices.delete({
        index: indexName,
      });
    } catch (e) {
      log.error(`Error deleting index '${indexName}' in afterSteps() callback`);
    }

    // Delete data view
    try {
      await kibanaServer.request({
        method: 'DELETE',
        path: `/api/saved_objects/index-pattern/${dataViewId}?force=true`,
      });
    } catch (e) {
      log.error(`Error deleting data view '${dataViewId}' in afterSteps() callback`);
    }
  },
}).step('Go to AIOps Log Rate Analysis', async ({ page, kbnUrl, kibanaPage }) => {
  await page.goto(
    kbnUrl.get(
      `app/ml/aiops/log_rate_analysis?index=${dataViewId}&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A60000%29%2Ctime%3A%28from%3A%272019-07-01T15%3A35%3A38.700Z%27%2Cto%3A%272019-07-05T15%3A35%3A38.700Z%27%29%29&_a=%28logRateAnalysis%3A%28filters%3A%21%28%29%2CsearchQuery%3A%28match_all%3A%28%29%29%2CsearchQueryLanguage%3Akuery%2CsearchString%3A%27%27%2Cwp%3A%28bMax%3A1562198400000%2CbMin%3A1562097600000%2CdMax%3A1562270400000%2CdMin%3A1562234400000%29%29%29`
    )
  );
  await kibanaPage.waitForHeader();
  await page.waitForSelector(subj('aiopsAnalysisComplete'));
  await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
});
