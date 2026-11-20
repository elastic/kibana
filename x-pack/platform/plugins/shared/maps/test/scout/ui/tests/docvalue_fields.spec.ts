/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map IDs from the kbn_archives/maps.json fixture
const DOCUMENT_EXAMPLE_ID = 'd2e73f40-e14a-11e8-a35a-370a8516603a'; // 'document example'
const DATA_DRIVEN_STYLES_ID = 'c9734720-eb7f-11e9-8f42-fb14e91ef4b8'; // 'document example with data driven styles'
const DATA_DRIVEN_STYLES_DATE_FIELD_ID = 'c9277dd0-eb8f-11e9-ae47-693d6a50fb9e'; // 'document example with data driven styles on date field'

const REQUEST_NAME = 'load layer features (logstash)';
interface Hit {
  _id: string;
  fields: Record<string, unknown>;
}

const HIT_KEYS = ['_id', '_index', '_score', 'fields'];

// A missing hit summarizes to empty keys so that polling retries instead of throwing.
const summarizeHit = (hit?: Hit) => ({
  hitKeys: Object.keys({ ...hit }).sort(),
  fieldKeys: Object.keys({ ...hit?.fields }).sort(),
  timestamp: hit?.fields['@timestamp'],
});

test.describe(
  'Maps - documents source - docvalue_fields',
  {
    tag: '@local-stateful-classic',
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

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test('should only fetch geo_point field and time field and nothing else when source does not have data driven styling', async ({
      pageObjects,
    }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DOCUMENT_EXAMPLE_ID);
      await expect
        .poll(async () => {
          const { rawResponse } = await maps.getResponse(REQUEST_NAME);
          const { hitKeys, fieldKeys } = summarizeHit(rawResponse.hits.hits[0]);
          return { hitKeys, fieldKeys };
        })
        .toStrictEqual({
          hitKeys: HIT_KEYS,
          fieldKeys: ['@timestamp', 'geo.coordinates'],
        });
    });

    test('should only fetch geo_point field and data driven styling fields', async ({
      pageObjects,
    }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DATA_DRIVEN_STYLES_ID);
      await expect
        .poll(async () => {
          const { rawResponse } = await maps.getResponse(REQUEST_NAME);
          const { hitKeys, fieldKeys } = summarizeHit(rawResponse.hits.hits[0]);
          return { hitKeys, fieldKeys };
        })
        .toStrictEqual({
          hitKeys: HIT_KEYS,
          fieldKeys: ['@timestamp', 'bytes', 'geo.coordinates', 'hour_of_day'],
        });
    });

    test('should format date fields as epoch_millis when data driven styling is applied to a date field', async ({
      pageObjects,
    }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DATA_DRIVEN_STYLES_DATE_FIELD_ID);
      await expect
        .poll(async () => {
          const { rawResponse } = await maps.getResponse(REQUEST_NAME);
          return summarizeHit(
            rawResponse.hits.hits.find((hit: Hit) => hit._id === 'AU_x3_g4GFA8no6QjkSR')
          );
        })
        .toStrictEqual({
          hitKeys: HIT_KEYS,
          fieldKeys: ['@timestamp', 'bytes', 'geo.coordinates'],
          timestamp: ['1442709321445'],
        });
    });
  }
);
