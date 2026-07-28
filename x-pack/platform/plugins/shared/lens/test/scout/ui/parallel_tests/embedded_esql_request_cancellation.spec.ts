/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

const ESQL_QUERY = 'FROM logstash-* | STATS count = COUNT(*) BY ts = BUCKET(@timestamp, 1 hour)';

function buildEsqlLensPanel() {
  const config: LensApiConfig = {
    type: 'xy',
    title: 'ES|QL Panel',
    layers: [
      {
        type: 'line',
        ignore_global_filters: false,
        sampling: 1,
        data_source: {
          type: 'esql',
          query: ESQL_QUERY,
        },
        x: { column: 'ts' },
        y: [{ column: 'count' }],
      },
    ],
  };

  return {
    type: LENS_EMBEDDABLE_TYPE,
    grid: { x: 0, y: 0, w: 24, h: 15 },
    config,
  };
}

spaceTest.describe(
  'Dashboard with ES|QL Lens panel cancels the search request when navigating away',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'cancels the ES|QL request when navigating away from the dashboard',
      async ({ page, apiServices, scoutSpace, pageObjects, network }) => {
        const title = `ES|QL Lens Dashboard ${Date.now()}`;

        const dashboardId = await apiServices.dashboard.create(
          {
            title,
            time_range: {
              from: testData.LOGSTASH_IN_RANGE_DATES.from,
              to: testData.LOGSTASH_IN_RANGE_DATES.to,
              mode: 'absolute' as const,
            },
            panels: [buildEsqlLensPanel()],
            filters: [
              {
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
              },
            ],
          },
          scoutSpace.id
        );

        await pageObjects.dashboard.openDashboardWithId(dashboardId, false);

        // panel creates a search
        await page.waitForRequest(
          (req) => req.url().endsWith('/esql_async') && req.method() === 'POST'
        );

        expect(
          await network.countMatchingRequests(
            { endpoint: '/esql_async', method: 'DELETE' },
            async () => {
              await pageObjects.collapsibleNav.clickItem('Discover');
            }
          )
        ).toBe(1);
      }
    );
  }
);
