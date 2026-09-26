/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map ID from the kbn_archives/maps.json fixture
const BLENDED_DOCUMENT_EXAMPLE_ID = '279e1f20-6883-11ea-952a-b102add99cf8';

const LOAD_DOCUMENTS_REQUEST_NAME = 'load layer features (logstash-*)';
const LOAD_CLUSTERS_REQUEST_NAME = 'load layer features (Clustered logstash-*)';

test.describe(
  'Maps - blended vector layer',
  {
    tag: tags.stateful.classic,
  },
  () => {
    let prevDefaultIndex: string | number | boolean | undefined;

    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.maps.openMapWithId(BLENDED_DOCUMENT_EXAMPLE_ID);
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test('should request documents when zoomed to smaller regions showing less data', async ({
      pageObjects,
    }) => {
      const { rawResponse: response } = await pageObjects.maps.getResponse(
        LOAD_DOCUMENTS_REQUEST_NAME
      );
      // Allow a range of hits to account for variances in browser window size.
      expect(response.hits.hits.length).toBeGreaterThanOrEqual(5);
      expect(response.hits.hits.length).toBeLessThanOrEqual(12);
    });

    test('should request clusters when zoomed to larger regions showing lots of data', async ({
      pageObjects,
    }) => {
      await pageObjects.maps.setView(20, -90, 2);
      const { rawResponse: response } = await pageObjects.maps.getResponse(
        LOAD_CLUSTERS_REQUEST_NAME
      );
      expect(response.aggregations.gridSplit.buckets).toHaveLength(15);
    });

    test('should request documents when query narrows data', async ({ pageObjects }) => {
      await pageObjects.maps.setAndSubmitQuery('bytes > 19000');
      const { rawResponse: response } = await pageObjects.maps.getResponse(
        LOAD_DOCUMENTS_REQUEST_NAME
      );
      expect(response.hits.hits).toHaveLength(75);
    });
  }
);
