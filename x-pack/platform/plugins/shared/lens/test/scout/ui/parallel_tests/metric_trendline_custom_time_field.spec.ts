/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { KbnClient } from '@kbn/scout';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

const ECOMMERCE_DATA_VIEW_INDEX = 'kibana_sample_data_ecommerce';
const ECOMMERCE_TIME_FIELD = 'order_date';
const ECOMMERCE_TIME_RANGE = { from: 'now-7d', to: 'now' } as const;

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
  'Lens metric trendline with custom time field',
  { tag: tags.stateful.classic },
  () => {
    let storedDataViewId: string | undefined;

    function getStoredDataViewId(): string {
      if (!storedDataViewId) {
        throw new Error('Stored data view was not created in beforeAll');
      }

      return storedDataViewId;
    }

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.apiFormat': true,
        },
      });

      await apiServices.sampleData.install('ecommerce', scoutSpace.id);

      const { data: dataView } = await apiServices.dataViews.create({
        title: ECOMMERCE_DATA_VIEW_INDEX,
        name: `scout-ecommerce-custom-time-${Date.now()}`,
        timeFieldName: ECOMMERCE_TIME_FIELD,
        spaceId: scoutSpace.id,
      });
      storedDataViewId = dataView.id;

      await scoutSpace.uiSettings.set({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': '{ "from": "now-7d", "to": "now" }',
      });
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      if (storedDataViewId) {
        await apiServices.dataViews.delete(storedDataViewId, scoutSpace.id);
      }
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'lens.apiFormat': false,
        },
      });
      await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.sampleData.remove('ecommerce', scoutSpace.id);
    });

    spaceTest(
      'renders trendline when referenced data view time field is not timestamp',
      async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
        const dataViewId = getStoredDataViewId();

        const body = {
          title: 'Metric trendline custom time field (ref)',
          time_range: ECOMMERCE_TIME_RANGE,
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              grid: { x: 0, y: 0, w: 12, h: 8 },
              config: {
                type: 'metric',
                title: 'Order count with trend',
                data_source: {
                  type: 'data_view_reference',
                  ref_id: dataViewId,
                },
                metrics: [
                  {
                    type: 'primary',
                    operation: 'count',
                    empty_as_null: false,
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
        await expect(
          page.locator('[data-test-subj="lens-message-list-trigger"][title="1 error"]')
        ).toHaveCount(0);
      }
    );
  }
);
