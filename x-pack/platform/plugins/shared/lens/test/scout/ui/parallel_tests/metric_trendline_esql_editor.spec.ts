/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  openDimensionEditorAndWaitForFlyout,
  openInlineEditorAndWaitVisible,
  testData,
} from '../fixtures';

spaceTest.describe(
  'Lens ES|QL metric trendline editor interactions',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId: string;
    let panelId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });

      const body = {
        title: 'ESQL metric trendline editor test',
        time_range: testData.LOGSTASH_IN_RANGE_DATES,
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

      const result = await apiServices.dashboard.createWithPanelId(body, scoutSpace.id);
      dashboardId = result.dashboardId;
      panelId = result.panelId;
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'toggling background chart to None keeps Color set to Panel',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
        await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);

        await spaceTest.step('verify initial Color is set to None', async () => {
          const colorButtons = page.getByTestId('lnsMetric_apply_color_to_buttons');
          await expect(colorButtons).toBeVisible();
          // "None" button should be pressed
          await expect(
            colorButtons.getByRole('button', { name: 'None', pressed: true })
          ).toBeVisible();
        });

        await spaceTest.step('enable trendline', async () => {
          await page.getByTestId('lnsMetric_background_chart_line').click();
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
        });

        await spaceTest.step('disable trendline and verify Color stays set to Panel', async () => {
          await page.getByTestId('lnsMetric_background_chart_none').click();
          await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

          // Switching background chart always sets applyColorTo to 'background',
          // so after disabling trendline the Color button group shows "Panel" as selected.
          const colorButtons = page.getByTestId('lnsMetric_apply_color_to_buttons');
          await expect(
            colorButtons.getByRole('button', { name: 'Panel', pressed: true })
          ).toBeVisible();
          await expect(
            colorButtons.getByRole('button', { name: 'None', pressed: false })
          ).toBeVisible();
        });

        await lens.getSecondaryFlyoutBackButton().click();
        await applyLensInlineEditorAndWaitClosed({ lens });
      }
    );

    spaceTest(
      'changing ES|QL query updates the trendline background chart',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        await spaceTest.step('enable trendline', async () => {
          const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
          await openDimensionEditorAndWaitForFlyout(pageObjects, page, metricDimensionPanel);

          await page.getByTestId('lnsMetric_background_chart_line').click();
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

          await lens.getSecondaryFlyoutBackButton().click();
        });

        await spaceTest.step(
          'change the ES|QL query and verify trendline still renders',
          async () => {
            const codeEditor = new KibanaCodeEditorWrapper(page);
            await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
            await codeEditor.setCodeEditorValue(
              'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS max_bytes = MAX(bytes)'
            );

            await page.getByTestId('ESQLEditor-run-query-button').click();

            // Wait for the trendline to re-render with the new data
            await expect(page.locator('.echSingleMetricSparkline')).toBeVisible({ timeout: 30000 });
            await expect(page.getByTestId('mtrVis')).toBeVisible();
          }
        );

        // Wait for the apply button to become enabled after the query finishes
        await expect(lens.getApplyFlyoutButton()).toBeEnabled({ timeout: 30000 });
        await applyLensInlineEditorAndWaitClosed({ lens });
      }
    );
  }
);
