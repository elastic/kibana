/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  test,
  testData,
  createMockRollupIndex,
  deleteAllRollupJobs,
  seedTsvbRollup,
  cleanupTsvbIndices,
} from '../fixtures';

const { TSVB } = testData;
const seed = { sourceIndex: TSVB.SOURCE_INDEX, targetIndex: TSVB.TARGET_INDEX };

// A rollup job name can never be reused (even after delete), so make it unique per run.
const uniqueJobName = () => `tsvb-rollup-${Date.now()}`;

// Local + cloud stateful: rollup does not exist on serverless.
test.describe(
  'Rollup jobs - TSVB integration',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, esClient, uiSettings, apiServices }) => {
      await deleteAllRollupJobs(esClient);
      await cleanupTsvbIndices(esClient, seed);
      await createMockRollupIndex(esClient);
      await seedTsvbRollup(esClient, uniqueJobName(), seed);

      // TSVB reads the rollup index by name (a string index), which needs this setting on.
      await uiSettings.set({ 'metrics:allowStringIndices': true });
      // A 1-day range covering the seeded (recent) docs, so the Metric panel's window includes them.
      await uiSettings.setDefaultTime({ from: 'now-1d', to: 'now' });
      // A data view must exist or Visualize redirects to the create-data-view page.
      await apiServices.dataViews.create({ title: TSVB.SOURCE_INDEX, timeFieldName: '@timestamp' });

      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ esClient, kbnClient, uiSettings }) => {
      await uiSettings.unset('metrics:allowStringIndices', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.clean({ types: ['index-pattern'] });
      await deleteAllRollupJobs(esClient);
      await cleanupTsvbIndices(esClient, seed);
    });

    test('renders a TSVB Metric panel reading a rollup index by name', async ({ pageObjects }) => {
      test.setTimeout(120_000);
      const { visualize, tsvb } = pageObjects;

      await visualize.createTSVBVisualization();

      await tsvb.selectMetricPanelType();
      await tsvb.openPanelOptions();
      await tsvb.useStringIndex(TSVB.TARGET_INDEX);
      await tsvb.setTimeField('@timestamp');
      await tsvb.setTimerangeMode('Last value');
      await tsvb.setInterval('1d');
      await tsvb.setDropLastBucket(false);

      await expect.poll(() => tsvb.getMetricValue()).toBe(TSVB.EXPECTED_METRIC_VALUE);
    });
  }
);
