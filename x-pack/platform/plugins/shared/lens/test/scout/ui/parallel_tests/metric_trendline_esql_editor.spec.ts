/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { KbnClient } from '@kbn/scout';
import {
  applyLensInlineEditorAndWaitClosed,
  openInlineEditorAndWaitVisible,
  testData,
} from '../fixtures';

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

const LOGSTASH_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

function withSpace(path: string, spaceId: string): string {
  return `/s/${spaceId}${path}`;
}

async function createDashboard(
  client: KbnClient,
  body: unknown,
  spaceId: string
): Promise<{ dashboardId: string; panelId: string }> {
  const createResponse = await client.request<unknown>({
    method: 'POST',
    path: withSpace(DASHBOARD_API_PATH, spaceId),
    body,
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });

  if (createResponse.status !== 201) {
    throw new Error(
      `Expected dashboard create status 201, got ${createResponse.status}: ${JSON.stringify(
        createResponse.data
      )}`
    );
  }

  const { id: dashboardId } = createResponse.data as Record<string, unknown>;
  if (typeof dashboardId !== 'string' || dashboardId.length === 0) {
    throw new Error('Dashboard create response: expected a non-empty string id');
  }

  const getResponse = await client.request<unknown>({
    method: 'GET',
    path: withSpace(`${DASHBOARD_API_PATH}/${dashboardId}`, spaceId),
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });

  const data = (getResponse.data as Record<string, unknown>).data as Record<string, unknown>;
  const panels = data.panels as Array<Record<string, unknown>>;
  const panelId = panels[0].id as string;

  return { dashboardId, panelId };
}

spaceTest.describe(
  'Lens ES|QL metric trendline editor interactions',
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
        title: 'ESQL metric trendline editor test',
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

      const result = await createDashboard(kbnClient, body, scoutSpace.id);
      dashboardId = result.dashboardId;
      panelId = result.panelId;
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'toggling background chart to None resets the Color setting',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
        const dimensionButton = metricDimensionPanel.getByRole('button', {
          name: /Edit .* configuration/,
        });
        await dimensionButton.click();
        await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();

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

        await spaceTest.step('disable trendline and verify Color resets to None', async () => {
          await page.getByTestId('lnsMetric_background_chart_none').click();
          await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

          // After switching back to None, applyColorTo should be reset to undefined,
          // which renders "None" as selected in the Color button group.
          // If the bug is present, applyColorTo would be 'background' and "Panel"
          // would be selected instead.
          const colorButtons = page.getByTestId('lnsMetric_apply_color_to_buttons');
          await expect(
            colorButtons.getByRole('button', { name: 'None', pressed: true })
          ).toBeVisible();
          await expect(
            colorButtons.getByRole('button', { name: 'Panel', pressed: false })
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
          const dimensionButton = metricDimensionPanel.getByRole('button', {
            name: /Edit .* configuration/,
          });
          await dimensionButton.click();
          await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();

          await page.getByTestId('lnsMetric_background_chart_line').click();
          await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

          await lens.getSecondaryFlyoutBackButton().click();
        });

        await spaceTest.step(
          'change the ES|QL query and verify trendline still renders',
          async () => {
            const esqlEditor = page.getByTestId('InlineEditingESQLEditor');
            await expect(esqlEditor).toBeVisible();

            // Focus the editor and replace the query
            const monacoEditor = esqlEditor.locator('.monaco-editor');
            await monacoEditor.click();

            // Select all text and type the new query
            await monacoEditor.press('ControlOrMeta+a');
            await page.keyboard.type(
              'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS max_bytes = MAX(bytes)'
            );

            // Dismiss any autocomplete popup and submit via the run query button
            await page.keyboard.press('Escape');
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
