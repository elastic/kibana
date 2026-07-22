/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ES_ARCHIVES, KBN_ARCHIVES, test } from '../fixtures';
import { loadSavedMap } from '../fixtures/helpers';

test.describe(
  'Maps - documents source search hits (filter by extent)',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.mapsData);
      await kbnClient.importExport.load(KBN_ARCHIVES.maps);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.maps);
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      // Match FTR's fixed window size (group1/index.js) for viewport-bound-filtering parity.
      await page.setViewportSize({ width: 1600, height: 1000 });
    });

    test('handles geo_point filtering with extents that cross antimeridian', async ({
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loadSavedMap(page, kbnUrl.app('maps'), 'antimeridian points example');
      await pageObjects.maps.waitForRenderComplete();

      const hits = await pageObjects.inspector.getHits();
      expect(hits).toBe('2');
    });

    test('handles geo_shape filtering with extents that cross antimeridian', async ({
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loadSavedMap(page, kbnUrl.app('maps'), 'antimeridian shapes example');
      await pageObjects.maps.waitForRenderComplete();

      const hits = await pageObjects.inspector.getHits();
      expect(hits).toBe('2');
    });
  }
);
