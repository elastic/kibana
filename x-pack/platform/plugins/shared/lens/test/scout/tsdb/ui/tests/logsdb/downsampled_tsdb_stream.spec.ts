/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableElasticChartDebug, test } from '../../fixtures';
import { createLogsDBScenario, logsDBDeploymentTags } from '../../fixtures/logsdb_stream_downgrade';

const scenario = createLogsDBScenario({
  title: 'Lens downgraded LogsDB stream with a downsampled TSDB stream',
  type: 'downsampled_tsdb_stream',
});

test.describe(
  'Lens downgraded LogsDB stream with a downsampled TSDB stream',
  { tag: logsDBDeploymentTags },
  () => {
    test.beforeAll(async ({ apiServices, kbnClient, tsdbHelper, uiSettings }) => {
      await scenario.setup({ apiServices, kbnClient, tsdbHelper, uiSettings });
    });

    test.beforeEach(async ({ browserAuth, context }) => {
      await enableElasticChartDebug(context);
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async () => scenario.cleanup());

    test('renders a timestamp histogram', async ({ page, pageObjects }) => {
      await test.step('visualize the full-range timestamp histogram', async () => {
        await scenario.assertTimestampHistogram({ page, pageObjects });
      });

      await test.step('visualize data on both sides of the downgrade boundary', async () => {
        await scenario.assertDowngradeBoundary({ page, pageObjects });
      });
    });

    test('renders an alternate-date histogram', async ({ page, pageObjects }) => {
      await scenario.assertAlternateDateHistogram({ page, pageObjects });
    });

    test('renders a timestamp annotation', async ({ page, pageObjects }) => {
      await test.step('configure the chart and annotation layer', async () => {
        await scenario.configureAnnotationLayer({ page, pageObjects });
      });

      await test.step('configure the timestamp annotation and verify rendering', async () => {
        await scenario.assertTimestampAnnotation({ page, pageObjects });
      });
    });

    test('renders an alternate-time-field annotation', async ({ page, pageObjects }) => {
      await test.step('configure the chart and annotation layer', async () => {
        await scenario.configureAnnotationLayer({ page, pageObjects });
      });

      await test.step('configure the alternate-time-field annotation and verify rendering', async () => {
        await scenario.assertAlternateTimeFieldAnnotation({ page, pageObjects });
      });
    });

    test('opens an ES|QL visualization from Discover', async ({ page, pageObjects }) => {
      await scenario.assertEsqlVisualization({ page, pageObjects });
    });
  }
);
