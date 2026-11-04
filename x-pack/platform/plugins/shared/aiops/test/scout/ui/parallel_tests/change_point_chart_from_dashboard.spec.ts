/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ensureDataView } from '../fixtures/data_views';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'change point chart attached from the dashboard',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
      await ensureDataView(apiServices, 'ft_ecommerce', 'order_date', scoutSpace.id);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.unset('dateFormat:tz');
    });

    spaceTest(
      'adds a change point chart and shows empty and no-change-point states',
      async ({ page, pageObjects, scoutSpace }) => {
        const dashboardTitle = `Change point detection ${scoutSpace.id} ${Date.now()}`;

        await pageObjects.dashboard.openNewDashboard();

        await spaceTest.step('attaches change point charts from the dashboard app', async () => {
          await expect(page.testSubj.locator('emptyDashboardWidget')).toBeVisible();
          await pageObjects.changePointChart.openInitializer();
          await expect(pageObjects.changePointChart.confirmButton).toBeDisabled();
          await pageObjects.changePointChart.selectEmbeddableDataView('ft_ecommerce');
          await expect(pageObjects.changePointChart.confirmButton).toBeEnabled();
          await pageObjects.changePointChart.confirmInitializer();
          await expect(pageObjects.changePointChart.embeddable).toBeVisible();
          await pageObjects.dashboard.saveDashboard(dashboardTitle);
        });

        await spaceTest.step('shows a no data screen for the default time range', async () => {
          await expect(pageObjects.changePointChart.noDataWarning).toBeVisible();
        });

        await spaceTest.step('shows a warning when no change point was found', async () => {
          await pageObjects.datePicker.setAbsoluteRange({
            from: 'Jun 12, 2023 @ 00:04:19.000',
            to: 'Jun 12, 2023 @ 01:00:19.000',
          });
          await expect(pageObjects.changePointChart.noChangePointsCallout).toBeVisible();
        });
      }
    );
  }
);
