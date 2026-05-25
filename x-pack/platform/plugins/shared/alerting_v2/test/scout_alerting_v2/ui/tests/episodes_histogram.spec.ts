/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Episodes histogram', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAlertingV2Viewer();
  });

  test('renders the histogram chart on the Alert Episodes List page', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.alertEpisodesList.goto();

    await test.step('URL contains the episodes app path', async () => {
      expect(page.url()).toContain('/app/management/alertingV2/episodes');
    });

    await test.step('page root wrapper is visible', async () => {
      await expect(pageObjects.alertEpisodesList.pageRoot).toBeVisible();
    });

    await test.step('histogram panel is visible', async () => {
      // The EpisodesHistogram EuiPanel mounts immediately; the chart fires an
      // ES|QL query on load so allow extra time for the first round-trip on a
      // freshly-booted Kibana.
      await expect(pageObjects.alertEpisodesList.histogramContainer).toBeVisible({
        timeout: 60_000,
      });
    });

    await test.step('histogram chart element is present inside the container', async () => {
      await expect(pageObjects.alertEpisodesList.histogramChart).toBeVisible();
    });

    await test.step('histogram breakdown field selector is accessible', async () => {
      await expect(pageObjects.alertEpisodesList.histogramBreakdownSelector).toBeVisible();
    });
  });
});
