/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import {
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
} from '@kbn/management-settings-ids';
import { test } from '../fixtures';

test.describe(
  'Nightshift navigation from Significant Events Discovery',
  { tag: tags.serverless.observability.all },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY]: true,
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY]: false,
      });
    });

    test('navigation to the Nightshift page when clicking the Nightshift button', async ({
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsAdmin();

      await page.gotoApp('streams/_discovery/streams');

      const nightshiftButton = page.getByRole('link', { name: /nightshift/i });
      await expect(nightshiftButton).toBeVisible({ timeout: 60_000 });
      await nightshiftButton.click();

      await expect(page).toHaveURL(/\/app\/observability\/sigevents_overview/, {
        timeout: 60_000,
      });
      await expect(page.testSubj.locator('sigeventsOverviewPage')).toBeVisible({
        timeout: 60_000,
      });
    });
  }
);
