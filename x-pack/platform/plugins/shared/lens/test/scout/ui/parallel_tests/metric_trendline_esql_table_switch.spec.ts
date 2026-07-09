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
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
  testData,
} from '../fixtures';

const waitForMetricTileCount = async (page: import('@kbn/scout').ScoutPage, count: number) => {
  await expect.poll(async () => page.locator('.echMetric').count()).toBe(count);
};

const waitForMoreThanOneMetricTile = async (page: import('@kbn/scout').ScoutPage) => {
  await expect.poll(async () => page.locator('.echMetric').count()).toBeGreaterThan(1);
};

const expectMetricPanelHasNotCrashed = async (page: import('@kbn/scout').ScoutPage) => {
  await expect(page.getByText('Provided column name or index is invalid')).toHaveCount(0);
  await expect(page.getByTestId('mtrVis')).toBeVisible();
};

spaceTest.describe(
  'Lens ES|QL table to metric trendline editing',
  { tag: tags.stateful.classic },
  () => {
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
        title: 'ESQL datatable to metric trendline test',
        time_range: testData.LOGSTASH_IN_RANGE_DATES,
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 12 },
            config: {
              type: 'data_table',
              title: 'ESQL logs table',
              data_source: {
                type: 'esql',
                query: 'FROM logstash-*',
              },
              rows: [{ column: '@timestamp' }],
              metrics: [{ column: 'bytes' }],
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
      'switches an ESQL table with timestamp rows to a metric trendline without stale breakdowns',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('open dashboard and verify ESQL table columns', async () => {
          await browserAuth.loginAsPrivilegedUser();
          await dashboard.openDashboardWithId(dashboardId);
          await dashboard.waitForPanelsToLoad(1);

          const table = page.getByTestId('lnsDataTable');
          await expect(table).toBeVisible();
          await expect(table.getByText('bytes')).toBeVisible();
          await expect(table.getByText('@timestamp')).toBeVisible();
        });

        await spaceTest.step('switch the table to a metric with timestamp breakdown', async () => {
          await dashboard.switchToEditMode();
          await openInlineEditorAndWaitVisible(pageObjects, panelId);

          await lens.switchToVisualization('lnsMetric', { search: 'Metric' });

          await expect(page.getByTestId('mtrVis')).toBeVisible({ timeout: 30_000 });
          await waitForMoreThanOneMetricTile(page);
          await expect(page.getByTestId('lnsMetric_primaryMetricDimensionPanel')).toContainText(
            'bytes'
          );
          await expect(page.getByTestId('lnsMetric_breakdownByDimensionPanel')).toContainText(
            '@timestamp'
          );
        });

        await spaceTest.step(
          'enable the metric background trendline without crashing',
          async () => {
            const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
            await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);

            await page.getByTestId('lnsMetric_background_chart_line').click();
            await expect(page.getByTestId('lnsMetric_background_chart_line')).toHaveAttribute(
              'aria-pressed',
              'true'
            );
            await expectMetricPanelHasNotCrashed(page);
          }
        );

        await spaceTest.step(
          'remove timestamp breakdown and keep a single metric trendline',
          async () => {
            await lens.getSecondaryFlyoutBackButton().click();
            await expect(lens.getSecondaryFlyoutBackButton()).toBeHidden();

            const breakdownPanel = page.getByTestId('lnsMetric_breakdownByDimensionPanel');
            await breakdownPanel.hover();
            await breakdownPanel.getByTestId('indexPattern-dimension-remove').click();

            await expectMetricPanelHasNotCrashed(page);
            await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
            await waitForMetricTileCount(page, 1);

            await applyLensInlineEditorAndWaitClosed({ lens });
            await dashboard.waitForPanelsToLoad(1);
            await expectMetricPanelHasNotCrashed(page);
            await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
            await waitForMetricTileCount(page, 1);
          }
        );
      }
    );
  }
);
