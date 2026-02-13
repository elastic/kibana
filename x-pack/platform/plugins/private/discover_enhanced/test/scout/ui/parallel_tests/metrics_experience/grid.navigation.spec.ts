/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grid Navigation tests: pagination and search.
 *
 * These tests use a dynamically created TSDB index (test-metrics-experience)
 * with 45 metric fields (23 gauge + 22 counter) to exercise scenarios that
 * require more metrics than the static TSDB_LOGS archive provides.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  createMetricsTestIndex,
  cleanMetricsTestIndex,
  insertMetricsDocuments,
  PAGINATION,
  DEFAULT_TIME_RANGE,
  DEFAULT_CONFIG,
} from '../../fixtures';

const { PAGE_SIZE, TOTAL_PAGES } = PAGINATION;

const SEARCH_TERM = 'gauge_2';
const EXPECTED_SEARCH_RESULTS = DEFAULT_CONFIG.metrics.filter((m) =>
  m.name.includes(SEARCH_TERM)
).length;

spaceTest.describe(
  'Metrics in Discover - Grid Navigation',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      // Load TSDB_LOGS for the data view (required by selectTextBaseLang)
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSDB_LOGS);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.TSDB_LOGS);

      await createMetricsTestIndex(esClient);
      await insertMetricsDocuments(esClient);

      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await cleanMetricsTestIndex(esClient);
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should paginate through metrics', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_METRICS_TEST);

      await spaceTest.step('pagination is visible', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.pagination.container).toBeVisible();
      });

      await spaceTest.step('navigate to last page and grid updates', async () => {
        await metricsExperience.pagination.getPageButton(TOTAL_PAGES - 1).click();
        await expect(metricsExperience.grid).toBeVisible();
      });

      await spaceTest.step('navigate using next and prev arrows', async () => {
        await metricsExperience.pagination.getPageButton(0).click();
        await expect(metricsExperience.grid).toBeVisible();
        await metricsExperience.pagination.nextButton.click();
        await expect(metricsExperience.grid).toBeVisible();
        await metricsExperience.pagination.prevButton.click();
        await expect(metricsExperience.grid).toBeVisible();
      });
    });

    spaceTest('should filter metrics using search', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_METRICS_TEST);
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('search filters results across all pages', async () => {
        await metricsExperience.searchMetric(SEARCH_TERM);
        await expect(metricsExperience.cards).toHaveCount(EXPECTED_SEARCH_RESULTS);
      });

      await spaceTest.step('search for non-existent metric shows empty state', async () => {
        await metricsExperience.clearSearch();
        await metricsExperience.searchMetric('nonexistent_metric_xyz_123');
        await expect(metricsExperience.emptyState).toBeVisible();
      });

      await spaceTest.step('clearing search restores full grid', async () => {
        await metricsExperience.clearSearch();
        await expect(metricsExperience.emptyState).toBeHidden();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
      });
    });
  }
);
