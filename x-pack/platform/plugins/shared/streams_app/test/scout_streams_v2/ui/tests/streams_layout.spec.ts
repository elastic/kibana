/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ScoutPage } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TAB_NAMES = ['map', 'sources', 'destinations', 'classic'];

// Keeps the Classic tab independent of the stack's data streams.
const mockStreamsList = async (page: ScoutPage) => {
  await page.route(
    (url) => url.pathname.endsWith('/api/streams'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ streams: [{ name: 'logs-test-default', type: 'classic' }] }),
      });
    }
  );
};

test.describe('Streams layout', { tag: tags.serverless.observability.complete }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true,
    });
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockStreamsList(page);
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false,
    });
  });

  test('renders every tab and lands on map', async ({ pageObjects: { streams } }) => {
    await streams.gotoStreamsLayout();

    for (const tabName of TAB_NAMES) {
      await expect(streams.getStreamsLayoutTab(tabName)).toBeVisible();
    }

    await expect(streams.getStreamsLayoutTab('map')).toHaveAttribute('aria-selected', 'true');
  });

  test('falls back to the map tab for an unknown tab', async ({ pageObjects: { streams } }) => {
    await streams.gotoStreamsLayoutTab('does-not-exist');

    await expect(streams.getStreamsLayoutTab('map')).toHaveAttribute('aria-selected', 'true');
  });

  test('the new experience callout opens the map and stays dismissed', async ({
    page,
    pageObjects: { streams },
  }) => {
    await streams.gotoStreamsLayoutTab('classic');
    await expect(streams.newExperienceCallout).toBeVisible();

    await streams.newExperienceCalloutOpenMapButton.click();
    await expect(streams.getStreamsLayoutTab('map')).toHaveAttribute('aria-selected', 'true');

    await streams.gotoStreamsLayoutTab('classic');
    await streams.dismissNewExperienceCallout();
    await expect(streams.newExperienceCallout).toHaveCount(0);

    await page.reload();
    await expect(page.testSubj.locator('streamsTable')).toBeVisible();
    await expect(streams.newExperienceCallout).toHaveCount(0);
  });

  test('renders the sources table', async ({ pageObjects: { streams } }) => {
    await streams.gotoStreamsLayout();

    await streams.clickStreamsLayoutTab('sources');
    await expect(streams.streamsSourcesTable).toBeVisible();
    await expect(streams.streamsAddSourceButton).toBeVisible();
  });

  test('renders the destinations table', async ({ pageObjects: { streams } }) => {
    await streams.gotoStreamsLayoutTab('destinations');

    await expect(streams.streamsDestinationsTable).toBeVisible();
    await expect(streams.streamsDestinationsSearch).toBeVisible();
  });
});
