/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { KbnClient } from '@kbn/scout';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { testData } from '../fixtures';

const DASHBOARD_API_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': '2023-10-31',
} as const;

/** Matches logstash_functional data used by other Lens Scout tests. */
const LOGSTASH_ABSOLUTE_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
} as const;

type EsqlTimeseriesCase = Readonly<{
  description: string;
  query: string;
  xColumn: string;
  yColumn: string;
}>;

const TIMESERIES_CASES: EsqlTimeseriesCase[] = [
  {
    description: 'TBUCKET',
    query: 'FROM logstash-* | STATS count = COUNT(*) BY ts = TBUCKET(50)',
    xColumn: 'ts',
    yColumn: 'count',
  },
  {
    description: 'BUCKET on timestamp',
    query: 'FROM logstash-* | STATS count = COUNT(*) BY ts = BUCKET(@timestamp, 1 hour)',
    xColumn: 'ts',
    yColumn: 'count',
  },
  {
    description: 'DATE_TRUNC on timestamp',
    query: 'FROM logstash-* | STATS count = COUNT(*) BY ts = DATE_TRUNC(1 hour, @timestamp)',
    xColumn: 'ts',
    yColumn: 'count',
  },
];

function buildLensLineTimeseriesPanel(esql: EsqlTimeseriesCase) {
  return {
    type: LENS_EMBEDDABLE_TYPE,
    grid: { x: 0, y: 0, w: 36, h: 20 },
    config: {
      type: 'xy' as const,
      title: `ES|QL ${esql.description}`,
      layers: [
        {
          type: 'line' as const,
          ignore_global_filters: false,
          sampling: 1,
          data_source: {
            type: 'esql' as const,
            query: esql.query,
          },
          x: { column: esql.xColumn },
          y: [{ column: esql.yColumn }],
        },
      ],
    },
  };
}

async function createDashboardWithLensPanel(
  kbnClient: KbnClient,
  spaceId: string,
  title: string,
  esql: EsqlTimeseriesCase
): Promise<string> {
  const response = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}/api/dashboards`,
    headers: DASHBOARD_API_HEADERS,
    body: {
      title,
      time_range: {
        from: LOGSTASH_ABSOLUTE_RANGE.from,
        to: LOGSTASH_ABSOLUTE_RANGE.to,
        mode: 'absolute' as const,
      },
      panels: [buildLensLineTimeseriesPanel(esql)],
    },
  });

  expect([200, 201]).toContain(response.status);
  expect(response.data.id).toBeTruthy();
  return response.data.id;
}

function assertTemporalXAxis(debug: DebugState) {
  const xAxis = debug.axes?.x?.[0];
  expect(xAxis, 'Expected chart debug state to include an x-axis').toBeDefined();

  const tickValues = xAxis!.values ?? [];
  expect(tickValues.length, 'Expected at least one x-axis tick value').toBeGreaterThan(0);

  const eachTickIsEpochMs = tickValues.every((v) => typeof v === 'number' && v > 1_000_000_000_000);
  expect(
    eachTickIsEpochMs,
    `Expected x-axis tick values to be epoch milliseconds (time scale); got ${JSON.stringify(
      tickValues.slice(0, 5)
    )}`
  ).toBe(true);
}

spaceTest.describe(
  'Lens ES|QL timeseries via dashboard API',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
      });
    });

    spaceTest.beforeEach(async ({ context }) => {
      await context.addInitScript(() => {
        (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    for (const esqlCase of TIMESERIES_CASES) {
      spaceTest(
        `renders a time-scaled x-axis for ${esqlCase.description}`,
        async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
          const title = `Scout ES|QL timeseries API ${esqlCase.description} ${Date.now()}`;
          const dashboardId = await createDashboardWithLensPanel(
            kbnClient,
            scoutSpace.id,
            title,
            esqlCase
          );

          await browserAuth.loginAsPrivilegedUser();

          const { dashboard } = pageObjects;

          await dashboard.openDashboardWithId(dashboardId);
          await dashboard.waitForPanelsToLoad(1);

          await expect(page.testSubj.locator('embeddable-lens-failure')).toBeHidden();
          await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

          const chart = page.testSubj.locator('xyVisChart');
          await expect(
            chart.locator('.echChartStatus[data-ech-render-complete="true"]')
          ).toBeAttached({
            timeout: 30_000,
          });

          const chartStatus = chart.locator('.echChartStatus');
          const debugJson = await chartStatus.getAttribute('data-ech-debug-state');
          await expect(chartStatus, 'Elastic Charts debug state attribute missing').toHaveAttribute(
            'data-ech-debug-state'
          );
          const debug = JSON.parse(debugJson ?? '{}') as DebugState;

          assertTemporalXAxis(debug);
        }
      );
    }
  }
);
