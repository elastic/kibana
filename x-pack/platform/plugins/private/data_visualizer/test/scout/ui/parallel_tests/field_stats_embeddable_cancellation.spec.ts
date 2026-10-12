/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const TIME_RANGE = {
  from: '2016-01-01T00:00:00.000Z',
  to: '2020-11-01T00:00:00.000Z',
} as const;

// Stalls every search long enough for the test to cancel it while it is in flight.
const STALLING_FILTER = {
  type: 'dsl',
  dsl: {
    query: {
      error_query: {
        indices: [
          {
            name: '*',
            error_type: 'warning',
            message: "'Watch out!'",
            stall_time_seconds: 5,
          },
        ],
      },
    },
  },
} as const;

const FIELD_STATS_VIEWS = [
  {
    name: 'data view',
    // Search endpoint the panel issues requests against
    endpoint: '/internal/search/ese',
    getConfig: (dataViewId: string) => ({
      view_type: 'dataview',
      data_view_id: dataViewId,
      show_distributions: false,
    }),
  },
  {
    name: 'ES|QL',
    endpoint: '/internal/search/esql_async',
    getConfig: () => ({
      view_type: 'esql',
      query: { esql: 'FROM ft_farequote' },
      show_distributions: false,
    }),
  },
] as const;

spaceTest.describe(
  'field statistics embedded in dashboard - request cancellation',
  { tag: tags.stateful.classic },
  () => {
    const dashboardIds: Record<string, string> = {};

    spaceTest.beforeAll(async ({ mlTestResources, apiServices, scoutSpace }) => {
      const dataViewId = await mlTestResources.createDataViewIfNeeded(
        'ft_farequote',
        '@timestamp',
        scoutSpace.id
      );

      for (const view of FIELD_STATS_VIEWS) {
        dashboardIds[view.name] = await apiServices.dashboard.create(
          {
            title: `Field stats cancellation (${view.name}) ${Date.now()}`,
            time_range: { ...TIME_RANGE, mode: 'absolute' },
            panels: [
              {
                type: 'field_stats_table',
                grid: { x: 0, y: 0, w: 24, h: 15 },
                config: view.getConfig(dataViewId),
              },
            ],
            filters: [STALLING_FILTER],
          },
          scoutSpace.id
        );
      }
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteDataViewByTitle('ft_farequote', scoutSpace.id);
    });

    for (const view of FIELD_STATS_VIEWS) {
      spaceTest(
        `cancels in-flight ${view.name} searches when navigating away from the dashboard`,
        async ({ page, pageObjects }) => {
          // Set up listener before opening the dashboard to avoid race conditions
          const searchRequestPromise = page.waitForResponse(
            (res) => res.url().includes(view.endpoint) && res.ok(),
            { timeout: 30_000 }
          );
          await pageObjects.dashboard.openDashboardWithId(dashboardIds[view.name], {
            waitForRender: false,
          });
          await searchRequestPromise;

          // Cancellation with AbortReason.CANCELED fetches partial results, then DELETEs.
          // That DELETE is issued after the navigation click resolves.
          const deleteRequest = page.waitForRequest(
            (request) => request.method() === 'DELETE' && request.url().includes(view.endpoint),
            { timeout: 15_000 }
          );
          await pageObjects.collapsibleNav.clickItem('Discover');
          await deleteRequest;
        }
      );

      spaceTest(
        `cancels in-flight ${view.name} searches when clicking the cancel button`,
        async ({ page, pageObjects }) => {
          const searchRequestPromise = page.waitForResponse(
            (res) => res.url().includes(view.endpoint) && res.ok(),
            { timeout: 30_000 }
          );
          await pageObjects.dashboard.openDashboardWithId(dashboardIds[view.name], {
            waitForRender: false,
          });
          await searchRequestPromise;

          const cancelButton = page.testSubj.locator('queryCancelButton');
          await cancelButton.waitFor({ state: 'visible' });

          const deleteRequest = page.waitForRequest(
            (request) => request.method() === 'DELETE' && request.url().includes(view.endpoint),
            { timeout: 15_000 }
          );
          await cancelButton.click();
          await deleteRequest;

          // The panel no longer reports as loading, so the cancel button goes away
          await cancelButton.waitFor({ state: 'hidden' });
          // and the cancellation isn't surfaced as a panel error
          await expect(page.testSubj.locator('embeddableError')).toBeHidden();
        }
      );
    }
  }
);
