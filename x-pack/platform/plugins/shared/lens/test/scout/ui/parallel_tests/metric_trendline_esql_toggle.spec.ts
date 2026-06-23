/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  createDashboardWithPanelId,
  LOGSTASH_TIME_RANGE,
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
  testData,
} from '../fixtures';

spaceTest.describe('Lens ES|QL metric trendline toggle', { tag: tags.stateful.classic }, () => {
  let dashboardId: string;
  let panelId: string;

  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });

    const body = {
      title: 'ESQL metric trendline toggle test',
      time_range: LOGSTASH_TIME_RANGE,
      panels: [
        {
          type: 'vis',
          grid: { x: 0, y: 0, w: 24, h: 12 },
          config: {
            type: 'metric',
            title: 'ESQL Average bytes',
            data_source: {
              type: 'esql',
              query:
                'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS avg_bytes = AVG(bytes)',
            },
            metrics: [
              {
                type: 'primary',
                column: 'avg_bytes',
              },
            ],
          },
        },
      ],
    };

    const result = await createDashboardWithPanelId(kbnClient, body, scoutSpace.id);
    dashboardId = result.dashboardId;
    panelId = result.panelId;
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can enable and disable trendline via dimension editor with persistence',
    async ({ browserAuth, page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await spaceTest.step('open dashboard and verify no trendline initially', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);
      });

      await spaceTest.step('enable trendline via dimension editor', async () => {
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
        await openDimensionEditorAndWaitForFlyout({ lens }, page, metricDimensionPanel);

        await page.getByTestId('lnsMetric_background_chart_line').click();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

        await lens.getSecondaryFlyoutBackButton().click();
        await applyLensInlineEditorAndWaitClosed({ lens });
      });

      await spaceTest.step(
        'save dashboard and verify trendline persists after reload',
        async () => {
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

          await dashboard.saveChangesToExistingDashboard();
          await expect(page.getByTestId('dashboardQuickSaveMenuItem')).toBeEnabled();
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

          await page.reload();
          await dashboard.waitForRenderComplete();
          await expect(page.getByTestId('mtrVis')).toBeVisible();
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
        }
      );

      await spaceTest.step('disable trendline via dimension editor', async () => {
        await dashboard.ensureEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
        await openDimensionEditorAndWaitForFlyout({ lens }, page, metricDimensionPanel);

        await page.getByTestId('lnsMetric_background_chart_none').click();
        await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

        await lens.getSecondaryFlyoutBackButton().click();
        await applyLensInlineEditorAndWaitClosed({ lens });
      });

      await spaceTest.step(
        'save dashboard and verify trendline stays removed after reload',
        async () => {
          await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

          await dashboard.saveChangesToExistingDashboard();
          await expect(page.getByTestId('dashboardQuickSaveMenuItem')).toBeEnabled();

          await page.reload();
          await dashboard.waitForRenderComplete();
          await expect(page.getByTestId('mtrVis')).toBeVisible();
          await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);
        }
      );
    }
  );
});
