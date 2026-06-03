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
  convertToEsqlViaModal,
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

  // Fetch the dashboard to get the auto-generated panel ID
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
  'Lens metric trendline conversion to ES|QL',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId: string;
    let panelId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices, kbnClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.enable_esql_conversion': true,
        },
      });

      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });

      const body = {
        title: 'Metric trendline conversion test',
        time_range: LOGSTASH_TIME_RANGE,
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 12 },
            config: {
              type: 'metric',
              title: 'Average bytes with trend',
              data_source: {
                type: 'data_view_spec',
                index_pattern: testData.DATA_VIEW_ID.LOGSTASH,
                time_field: '@timestamp',
              },
              metrics: [
                {
                  type: 'primary',
                  operation: 'average',
                  field: 'bytes',
                  background_chart: { type: 'trend' },
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

    spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.core.settings({ 'feature_flags.overrides': {} });
    });

    spaceTest(
      'trendline persists after converting form-based metric to ES|QL',
      async ({ browserAuth, page, pageObjects }) => {
        const { dashboard } = pageObjects;

        // Open the dashboard and verify initial trendline
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

        // Switch to edit mode and open inline editor
        await dashboard.switchToEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);

        // Convert to ES|QL via modal
        await convertToEsqlViaModal({ pageObjects, page });

        // Verify ES|QL editor is visible and trendline still renders
        await expect(page.getByTestId('ESQLEditor')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();

        // Apply changes
        await applyLensInlineEditorAndWaitClosed({ lens: pageObjects.lens });

        // Verify trendline persists after applying
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      }
    );
  }
);
