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

    // Create dashboard with ES|QL metric WITHOUT trendline
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

    const result = await createDashboard(kbnClient, body, scoutSpace.id);
    dashboardId = result.dashboardId;
    panelId = result.panelId;
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can enable and disable trendline via dimension editor with persistence',
    async ({ browserAuth, page, pageObjects, log }) => {
      const { dashboard, lens } = pageObjects;

      // 1) Open dashboard — verify NO trendline initially
      log.info('Step 1: Opening dashboard, verifying no trendline initially');
      await browserAuth.loginAsPrivilegedUser();
      await dashboard.openDashboardWithId(dashboardId);
      await expect(page.getByTestId('mtrVis')).toBeVisible();
      await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

      // 2) Enable trendline: edit mode → inline editor → dimension editor → click "Line"
      log.info('Step 2: Enabling trendline via dimension editor');
      await dashboard.switchToEditMode();
      await openInlineEditorAndWaitVisible(pageObjects, panelId);

      const metricDimensionPanel = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
      const dimensionButton = metricDimensionPanel.getByRole('button', {
        name: /Edit .* configuration/,
      });
      await dimensionButton.click();
      await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();

      await page.getByTestId('lnsMetric_background_chart_line').click();
      await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      log.info('Step 2: Trendline visible, closing dimension editor and applying');

      // Close dimension editor, apply changes
      await lens.getSecondaryFlyoutBackButton().click();
      await applyLensInlineEditorAndWaitClosed({ lens });

      // 3) Verify trendline is visible, save dashboard, reload and verify persistence
      log.info('Step 3: Verifying trendline visible before save');
      await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

      log.info('Step 3: Saving dashboard (quick save)');
      await dashboard.saveChangesToExistingDashboard();
      // Wait for save to finish: button goes disabled → enabled again after save completes
      await expect(page.getByTestId('dashboardQuickSaveMenuItem')).toBeEnabled();
      log.info('Step 3: Save complete, verifying trendline still visible');
      await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

      log.info('Step 3: Full page reload');
      await page.reload();
      await dashboard.waitForRenderComplete();
      await expect(page.getByTestId('mtrVis')).toBeVisible();
      await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      log.info('Step 3: PASSED — trendline persists after reload');

      // 4) Disable trendline: inline editor → dimension editor → click "None"
      log.info('Step 4: Disabling trendline via dimension editor');
      await dashboard.ensureEditMode();
      await openInlineEditorAndWaitVisible(pageObjects, panelId);

      const metricDimensionPanel2 = page.getByTestId('lnsMetric_primaryMetricDimensionPanel');
      const dimensionButton2 = metricDimensionPanel2.getByRole('button', {
        name: /Edit .* configuration/,
      });
      await dimensionButton2.click();
      await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();

      await page.getByTestId('lnsMetric_background_chart_none').click();
      await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);
      log.info('Step 4: Trendline removed, closing dimension editor and applying');

      // Close dimension editor, apply changes
      await lens.getSecondaryFlyoutBackButton().click();
      await applyLensInlineEditorAndWaitClosed({ lens });

      // 5) Verify trendline is gone, save dashboard, reload and verify persistence
      log.info('Step 5: Verifying trendline gone before save');
      await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);

      log.info('Step 5: Saving dashboard (quick save)');
      await dashboard.saveChangesToExistingDashboard();
      await expect(page.getByTestId('dashboardQuickSaveMenuItem')).toBeEnabled();

      log.info('Step 5: Full page reload');
      await page.reload();
      await dashboard.waitForRenderComplete();
      await expect(page.getByTestId('mtrVis')).toBeVisible();
      await expect(page.locator('.echSingleMetricSparkline')).toHaveCount(0);
      log.info('Step 5: PASSED — trendline stays removed after reload');
    }
  );
});
