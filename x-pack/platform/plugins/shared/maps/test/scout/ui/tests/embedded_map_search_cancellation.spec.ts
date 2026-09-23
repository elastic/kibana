/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const MAPS_DASHBOARD_ARCHIVE =
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/kbn_archives/maps_search_cancellation.json';

const GEO_INDEX = 'maps-cancellation-test';

spaceTest.describe(
  'Maps embedded in dashboard - request cancellation',
  { tag: '@local-stateful-classic' },
  () => {
    let dashboardId: string;

    spaceTest.beforeAll(async ({ scoutSpace, esClient }) => {
      const indexExists = await esClient.indices.exists({ index: GEO_INDEX });
      if (!indexExists) {
        await esClient.indices.create({
          index: GEO_INDEX,
          mappings: { properties: { location: { type: 'geo_point' } } },
        });
        await esClient.index({
          index: GEO_INDEX,
          document: { location: { lat: 0, lon: 0 } },
          refresh: true,
        });
      }

      const loaded = await scoutSpace.savedObjects.load(MAPS_DASHBOARD_ARCHIVE);
      const dashboard = loaded.find((obj) => obj.type === 'dashboard');
      if (!dashboard) {
        throw new Error('Dashboard saved object not found in fixture');
      }
      dashboardId = dashboard.id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await esClient.indices.delete({ index: GEO_INDEX, ignore_unavailable: true });
    });

    spaceTest(
      'cancels search when navigating away from the dashboard',
      async ({ page, pageObjects }) => {
        // Set up listeners before opening the dashboard to avoid race conditions
        const esqlRequestPromise = page.waitForRequest(
          (req) => req.url().includes('/internal/search/esql') && req.method() === 'POST'
        );

        // Open dashboard WITHOUT waiting for render
        await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });

        // Wait for the map to initiate the ES|QL search (stalled by error_query)
        await esqlRequestPromise;

        const esqlAbortedPromise = page.waitForEvent(
          'requestfailed',
          (req) => req.url().includes('/internal/search/esql') && req.method() === 'POST'
        );

        // Navigate away - this should abort the pending request
        await pageObjects.collapsibleNav.clickItem('Discover');

        // Verify the in-flight request was aborted
        const failedRequest = await esqlAbortedPromise;
        expect(failedRequest.failure()).not.toBeNull();
      }
    );
  }
);
