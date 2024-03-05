/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import type { DataView } from '@kbn/data-views-plugin/common';

// We are importing from tests to tests here, not related to runtime code.
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { frequentItemSetsLargeArraysSource } from '../../test/functional/apps/aiops/log_rate_analysis/test_data/__mocks__/frequent_item_sets_large_arrays';

const indexName = 'large_arrays';
let dataViewId: string | undefined;

interface DocWithArray {
  '@timestamp': number;
  items: string[];
}

export const journey = new Journey({
  beforeSteps: async ({ kbnUrl, log, auth, es, kibanaServer }) => {
    // Create index with mapping
    try {
      await es.indices.create({
        index: indexName,
        mappings: {
          properties: {
            items: { type: 'keyword' },
            '@timestamp': { type: 'date' },
          },
        },
      });
    } catch (e) {
      log.error(`Error creating index '${indexName}' in beforeSteps() callback`);
    }

    // Ingest sample data
    try {
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
    } catch (e) {
      log.error(`Error ingesting sample data into '${indexName}' in beforeSteps() callback`);
    }

    // Create data view
    try {
      const dataViewResp = await kibanaServer.request<DataView>({
        method: 'POST',
        path: '/api/saved_objects/index-pattern',
        body: {
          attributes: { title: indexName, timeFieldName: '@timestamp' },
        },
      });

      dataViewId = dataViewResp.data.id;
    } catch (e) {
      log.error(`Error creating data view for index '${indexName}' in beforeSteps() callback`);
    }
  },
  afterSteps: async ({ log, es, kibanaServer }) => {
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
})
  .step('Go to AIOps Log Rate Analysis', async ({ page, kbnUrl }) => {
    // Navigate to Log Rate Analysis with a prepopulated url state that runs
    // the analysis directly on page load without any necessary user interactions.
    await page.goto(
      kbnUrl.get(
        `app/ml/aiops/log_rate_analysis?index=${dataViewId}&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A60000%29%2Ctime%3A%28from%3A%272019-07-01T15%3A35%3A38.700Z%27%2Cto%3A%272019-07-05T15%3A35%3A38.700Z%27%29%29&_a=%28logRateAnalysis%3A%28filters%3A%21%28%29%2CsearchQuery%3A%28match_all%3A%28%29%29%2CsearchQueryLanguage%3Akuery%2CsearchString%3A%27%27%2Cwp%3A%28bMax%3A1562198400000%2CbMin%3A1562097600000%2CdMax%3A1562270400000%2CdMin%3A1562234400000%29%29%29`
      )
    );

    // Wait for the AIOps Log Rate Analysis page wrapper to load
    await page.waitForSelector(subj('aiopsLogRateAnalysisPage'));
  })
  .step('Run AIOps Log Rate Analysis', async ({ page, kbnUrl }) => {
    // Wait for the analysis to complete with extended timeout, this one tracks a known issue with slow frequent_item_sets performance.
    await page.waitForSelector(subj('aiopsAnalysisComplete'), { timeout: 120000 });
  });
