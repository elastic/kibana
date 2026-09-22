/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const DASHBOARD_NAME = 'verify_map_embeddable_state';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

test.describe(
  'Maps - embeddable state',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await uiSettings.unset('defaultIndex');
    });

    test('should render map with center and zoom from embeddable state', async ({ pageObjects }) => {
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addEmbeddable('document example', 'map');
      await pageObjects.maps.setView(0.0, 0.0, 10);
      await pageObjects.dashboard.saveDashboard(DASHBOARD_NAME);

      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.clickDashboardTitleLink(DASHBOARD_NAME);

      const { lat, lon, zoom } = await pageObjects.maps.getView();
      expect(Math.round(lat)).toBe(0);
      expect(Math.round(lon)).toBe(0);
      expect(Math.round(zoom)).toBe(10);
    });
  }
);
