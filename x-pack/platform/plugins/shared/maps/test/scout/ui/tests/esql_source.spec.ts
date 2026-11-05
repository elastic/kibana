/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ESQL_EXAMPLE_MAP_ID = 'f3bb9828-ad65-4feb-87d4-7a9f7deff8d5';

test.describe(
  'Maps - ES|QL source',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await kbnClient.importExport.load(KBN_ARCHIVE);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('should display ES|QL statement results on map', async ({ pageObjects }) => {
      await pageObjects.maps.openMapWithId(ESQL_EXAMPLE_MAP_ID);

      await expect
        .poll(() => pageObjects.maps.getLayerTocTooltipMsg('logstash-*'), { timeout: 20_000 })
        .toBe(
          'logstash-*\nFound 5 rows.\nResults narrowed by global time\nResults narrowed by visible map area'
        );
    });
  }
);
