/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';
import { recordMetricRenderErrors } from '../fixtures/metric_render_errors';

const TRENDLINE_TIMEOUT_MS = 30_000;

spaceTest.describe('Lens ES|QL metric EVAL maximum', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify(testData.LOGSTASH_IN_RANGE_DATES),
    });
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
        await dashboard.openTryEsqlDashboard();
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');

        // Normalize the fixture's nonzero average to a deterministic value below the maximum.
        await esqlEditor.setQueryAndRun(
          'FROM logstash-* | STATS usage = AVG(bytes) / AVG(bytes) / 2 | EVAL max = 1'
        );
        await expect(page.getByTestId('lnsDataTable')).toBeVisible();
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
            await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '50');
            await expect(page.getByRole('meter')).toHaveAttribute('aria-valuemax', '100');
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
