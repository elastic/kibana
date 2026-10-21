/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { openInlineEditorAndWaitVisible, spaceTest, testData } from '../fixtures';
import { recordMetricRenderErrors } from '../fixtures/metric_render_errors';

const TRENDLINE_TIMEOUT_MS = 30_000;

spaceTest.describe('Lens ES|QL metric EVAL maximum', { tag: tags.stateful.classic }, () => {
  let dashboardId: string;
  let panelId: string;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.uiSettings.set({
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify(testData.LOGSTASH_IN_RANGE_DATES),
    });

    const result = await apiServices.dashboard.createWithPanelId(
      {
        title: 'ESQL EVAL maximum test',
        time_range: testData.LOGSTASH_IN_RANGE_DATES,
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 12 },
            config: {
              type: 'data_table',
              title: 'ESQL logs table',
              data_source: {
                type: 'esql',
                query: 'FROM logstash-*',
              },
              rows: [{ column: '@timestamp' }],
              metrics: [{ column: 'bytes' }],
            },
          },
        ],
      },
      scoutSpace.id
    );
    dashboardId = result.dashboardId;
    panelId = result.panelId;
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'renders an EVAL maximum as a bar and can switch to a trendline',
    async ({ browserAuth, page, pageObjects }, testInfo) => {
      const { dashboard, esqlEditor, lens } = pageObjects;
      const maximumPanel = 'lnsMetric_maxDimensionPanel';
      const primaryPanel = 'lnsMetric_primaryMetricDimensionPanel';

      await spaceTest.step('apply a metric suggestion to a query with an EVAL column', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await dashboard.waitForPanelsToLoad(1);
        await openInlineEditorAndWaitVisible(pageObjects, panelId);
        // Changing the query before this lands restarts the editor's initial fetch, and the stale run can win.
        await expect(page.getByTestId('ESQLQueryResults')).toBeVisible();

        // Normalize the fixture's nonzero average to a deterministic value below the maximum.
        await esqlEditor.setQueryAndRun(
          'FROM logstash-* | STATS usage = AVG(bytes) / AVG(bytes) / 2 | EVAL max = 1'
        );
        // The panel is already a datatable, so gate on this query's own columns instead.
        await expect(lens.datatable.getHeaderLocator('usage')).toBeVisible();
        await expect(lens.datatable.getHeaderLocator('max')).toBeVisible();
        await lens.switchToVisualization('lnsMetric', { search: 'Metric' });

        await expect(lens.dimensions.getDimensionTriggersLocator(primaryPanel)).toHaveText('usage');
        await expect(lens.dimensions.getDimensionTriggersLocator(maximumPanel)).toHaveCount(0);
        await expect(page.getByTestId('mtrVis')).toBeVisible();
        await expect
          .poll(() => lens.metric.getMetricVisualizationData())
          .toStrictEqual([expect.objectContaining({ value: '0.5', showingBar: false })]);
      });

      const renderErrors = await recordMetricRenderErrors(page);
      try {
        await spaceTest.step(
          'assign the EVAL column as Maximum value and verify the bar',
          async () => {
            await lens.dimensions.setTextBasedDimensionField(maximumPanel, 'max');

            await expect(lens.dimensions.getDimensionTriggersLocator(maximumPanel)).toHaveText(
              /^max(?: \[\d+\])?$/
            );
            await expect(lens.metric.metricProgressBar).toBeVisible();
            await expect(lens.metric.metricProgressBar).toHaveAttribute('aria-valuenow', '50');
            await expect(lens.metric.metricProgressBar).toHaveAttribute('aria-valuemax', '100');
            await expect
              .poll(() => lens.metric.getMetricVisualizationData())
              .toStrictEqual([expect.objectContaining({ value: '0.5', showingBar: true })]);
            expect(
              await renderErrors.getErrors(),
              'No transient invalid-column error during maximum assignment'
            ).toStrictEqual([]);
          }
        );

        await spaceTest.step(
          'switch to Line background with the EVAL maximum assigned',
          async () => {
            await lens.dimensions.openDimensionEditor(
              `${primaryPanel} > lns-dimensionTrigger-textBased`
            );
            await lens.metric.setBackgroundChart('line');
            await lens.closeDimensionEditor();

            await expect(lens.metric.trendline).toBeVisible({ timeout: TRENDLINE_TIMEOUT_MS });
            await expect(lens.metric.metricProgressBar).toHaveCount(0);
            await expect
              .poll(() => lens.metric.getMetricVisualizationData())
              .toStrictEqual([expect.objectContaining({ value: '0.5', showingTrendline: true })]);
            expect(
              await renderErrors.getErrors(),
              'No transient invalid-column error during trendline activation'
            ).toStrictEqual([]);
          }
        );
      } finally {
        try {
          await testInfo.attach('metric-render-diagnostics', {
            body: JSON.stringify(
              {
                errors: await renderErrors.getErrors(),
                primaryLabels: await lens.dimensions.getDimensionTriggersTexts(primaryPanel),
                maximumLabels: await lens.dimensions.getDimensionTriggersTexts(maximumPanel),
              },
              null,
              2
            ),
            contentType: 'application/json',
          });
        } finally {
          await renderErrors.dispose();
        }
      }
    }
  );
});
