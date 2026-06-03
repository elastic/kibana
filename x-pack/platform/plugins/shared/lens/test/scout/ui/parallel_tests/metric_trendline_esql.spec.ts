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
  'Lens metric trendline on dashboard (ES|QL)',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify({
          from: testData.LOGSTASH_IN_RANGE_DATES.from,
          to: testData.LOGSTASH_IN_RANGE_DATES.to,
        }),
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'renders trendline with ES|QL data source',
      async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
        const body = {
          title: 'ESQL Metric trendline',
          time_range: LOGSTASH_TIME_RANGE,
          panels: [
            {
              type: 'vis',
              grid: { x: 0, y: 0, w: 12, h: 8 },
              config: {
                type: 'metric',
                title: 'ESQL Average bytes with trend',
                data_source: {
                  type: 'esql',
                  query:
                    'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS avg_bytes = AVG(bytes)',
                },
                metrics: [
                  {
                    type: 'primary',
                    column: 'avg_bytes',
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
