/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

/** Trendline data is fetched separately from the metric tile and can land after the first panel render. */
const TRENDLINE_TIMEOUT_MS = 30_000;

spaceTest.describe(
  'Lens aliased TBUCKET metric trendline',
  { tag: '@local-stateful-classic' },
  () => {
    let dashboardId: string;
    let panelId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.TSDB_IN_RANGE_DATES.from,
          to: testData.TSDB_IN_RANGE_DATES.to,
        }),
      });

      const body = {
        title: 'ESQL TS metric trendline toggle test',
        time_range: testData.TSDB_IN_RANGE_DATES,
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 12 },
            config: {
              type: 'metric',
              title: 'ESQL TS average bytes',
              data_source: {
                type: 'esql',
                query: `TS ${testData.KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY time_bucket = TBUCKET(100)`,
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

      const result = await apiServices.dashboard.createWithPanelId(body, scoutSpace.id);
      dashboardId = result.dashboardId;
      panelId = result.panelId;
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'enables and persists the trendline through the dimension editor',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;
        const sparkline = lens.metric.trendline;

        await spaceTest.step('open dashboard and verify no trendline initially', async () => {
          await browserAuth.loginAsPrivilegedUser();
          await dashboard.openDashboardWithId(dashboardId);
          await expect(page.getByTestId('mtrVis')).toBeVisible();
          await expect(sparkline).toHaveCount(0);
        });

        await spaceTest.step('enable trendline via dimension editor', async () => {
          await dashboard.switchToEditMode();
          await openInlineEditorAndWaitVisible(pageObjects, panelId);

          const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
          await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);

          await page.getByTestId('lnsMetric_background_chart_line').click();
          await expect(page.getByTestId('lnsMetric_background_chart_line')).toHaveAttribute(
            'aria-pressed',
            'true'
          );

          await lens.workspace.secondaryFlyoutBackButton.click();
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
          // Trendline query finishes after the metric tile render that apply settles on.
          await expect(sparkline).toBeVisible({ timeout: TRENDLINE_TIMEOUT_MS });
        });

        await spaceTest.step(
          'save dashboard and verify trendline persists after reload',
          async () => {
            await expect(sparkline).toBeVisible();

            await dashboard.saveChangesToExistingDashboard();
            await expect(page.getByTestId('dashboardQuickSaveMenuItem')).toBeEnabled();
            await expect(sparkline).toBeVisible({ timeout: TRENDLINE_TIMEOUT_MS });

            await page.reload();
            await dashboard.waitForRenderComplete();
            await expect(page.getByTestId('mtrVis')).toBeVisible();
            await expect(sparkline).toBeVisible({ timeout: TRENDLINE_TIMEOUT_MS });
          }
        );
      }
    );
  }
);
