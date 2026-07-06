/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { KbnClient } from '@kbn/scout';
import { testData } from '../fixtures';

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

const LOGSTASH_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

function withSpace(path: string, spaceId: string): string {
  return `/s/${spaceId}${path}`;
}

async function createDashboard(client: KbnClient, body: unknown, spaceId: string): Promise<string> {
  const response = await client.request<unknown>({
    method: 'POST',
    path: withSpace(DASHBOARD_API_PATH, spaceId),
    body,
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });

  if (response.status !== 201) {
    throw new Error(
      `Expected dashboard create status 201, got ${response.status}: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const { id } = response.data as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Dashboard create response: expected a non-empty string id');
  }
  return id;
}

spaceTest.describe(
  'Lens metric trendline on dashboard (DSL)',
  { tag: tags.stateful.classic },
  () => {
    let storedDataViewId: string | undefined;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });

      const { data: dataView } = await apiServices.dataViews.create({
        title: testData.DATA_VIEW_ID.LOGSTASH,
        name: `scout-metric-trendline-dv-${Date.now()}`,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      storedDataViewId = dataView.id;
    });

    spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
      if (storedDataViewId) {
        await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
      }
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'renders trendline when panel uses inline data view spec',
      async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
        const body = {
          title: 'Metric trendline spec',
          time_range: LOGSTASH_TIME_RANGE,
          panels: [
            {
              type: 'vis',
              grid: { x: 0, y: 0, w: 12, h: 8 },
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

        const dashboardId = await createDashboard(kbnClient, body, scoutSpace.id);
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      }
    );

    spaceTest(
      'renders trendline when panel uses stored data view reference',
      async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
        spaceTest.fail(!storedDataViewId, 'Stored data view was not created in beforeAll');

        const body = {
          title: 'Metric trendline ref',
          time_range: LOGSTASH_TIME_RANGE,
          panels: [
            {
              type: 'vis',
              grid: { x: 0, y: 0, w: 12, h: 8 },
              config: {
                type: 'metric',
                title: 'Average bytes with trend',
                data_source: {
                  type: 'data_view_reference',
                  ref_id: storedDataViewId!,
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

        const dashboardId = await createDashboard(kbnClient, body, scoutSpace.id);
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect(page.locator('.echSingleMetricSparkline')).toBeVisible();
      }
    );
  }
);
