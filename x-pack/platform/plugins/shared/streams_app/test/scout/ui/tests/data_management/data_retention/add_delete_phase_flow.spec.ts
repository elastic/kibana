/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../../../fixtures';
import {
  RETENTION_TEST_IDS,
  closeToastsIfPresent,
  setStreamDslLifecycle,
} from '../../../fixtures/data_lifecycle_helpers';

const STREAM = 'logs.otel.nginx';

test.describe(
  'Stream data retention - Add delete phase flow (serverless)',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.clearStreamChildren('logs.otel');
      await setStreamDslLifecycle(apiServices.streams, 'logs.otel', {});
      await apiServices.streams.forkStream('logs.otel', STREAM, {
        field: 'service.name',
        eq: 'nginx',
      });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await setStreamDslLifecycle(apiServices.streams, STREAM, {});
      await pageObjects.streams.gotoDataRetentionTab(STREAM);
    });

    test.afterEach(async ({ page }) => {
      await closeToastsIfPresent(page);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.streams.clearStreamChildren('logs.otel');
    });

    test('shows the dedicated "Add delete phase" button and no "Add data phase" popover', async ({
      page,
    }) => {
      // Serverless keeps the delete-only button and does NOT surface the multi-phase "Add data phase" popover (no tiers).
      await expect(page.getByTestId(RETENTION_TEST_IDS.addDeletePhaseButton)).toBeVisible();
      await expect(page.getByTestId(RETENTION_TEST_IDS.addDataPhaseButton)).toBeHidden();
    });

    test('adds and removes a delete phase via the Add delete phase flyout', async ({ page }) => {
      const deleteFlyout = page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout);

      await test.step('add a delete phase', async () => {
        await page.getByTestId(RETENTION_TEST_IDS.addDeletePhaseButton).click();
        await deleteFlyout.waitFor({ state: 'visible' });

        const value = deleteFlyout.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseValue);
        await value.fill('');
        await value.fill('7');
        await deleteFlyout
          .getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseUnit)
          .selectOption('d');

        await page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseApplyButton).click();
        await deleteFlyout.waitFor({ state: 'hidden' });

        await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('7 days');
      });

      await test.step('remove the delete phase (reset to indefinite)', async () => {
        await page.getByTestId(RETENTION_TEST_IDS.deletePhaseTimelineButton).click();
        await page.getByTestId(RETENTION_TEST_IDS.deletePhaseTimelineEditButton).click();
        await deleteFlyout.waitFor({ state: 'visible' });

        await page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseRemoveButton).click();
        await deleteFlyout.waitFor({ state: 'hidden' });

        await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('∞');
      });
    });
  }
);
