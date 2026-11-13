/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const TASK_ID = 'oTUltX4IQMOUUVeiohTt8A:305245';
// Fixed so the header's start time is identical in before/after captures.
const START_TIME = Date.parse('2026-11-13T12:00:00.000Z');

const summary = {
  taskId: TASK_ID,
  queryType: 'DSL',
  source: 'Discover',
  startTime: START_TIME,
  runningTimeMs: 95_000,
  cancellable: true,
  cancelled: false,
};

const details = {
  ...summary,
  indices: 3,
  query: JSON.stringify({
    size: 500,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: 'now-15m', lte: 'now' } } },
          { match_phrase: { 'host.name': 'host-01' } },
        ],
      },
    },
    aggs: { by_service: { terms: { field: 'service.name', size: 10 } } },
  }),
  traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
  xOpaqueId: 'unknownId;kibana:application:discover:new;agg_based:data_table',
};

// The task list is mocked so a running query is reliably present while the flyout is open.
test.describe('Query activity flyout capture', { tag: tags.stateful.classic }, () => {
  test('query detail flyout', async ({ page, browserAuth, kbnUrl }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.route('**/internal/query_activity/search*', (route) =>
      route.fulfill({ json: { queries: [summary] } })
    );
    await page.route('**/internal/query_activity/queries/**', (route) =>
      route.fulfill({ json: { query: details } })
    );

    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/management/clusterPerformance/queryActivity'));
    await page.getByRole('button', { name: TASK_ID }).click({ timeout: 60_000 });

    const flyout = page.getByRole('dialog', { name: 'Query details' });
    await expect(flyout).toBeVisible({ timeout: 30_000 });
    await expect(flyout.getByRole('heading', { name: 'Query details' })).toBeVisible();
    await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(flyout.getByText('Opaque ID')).toBeVisible();

    await capture(page, 'query-activity-01-query-detail');
  });
});
