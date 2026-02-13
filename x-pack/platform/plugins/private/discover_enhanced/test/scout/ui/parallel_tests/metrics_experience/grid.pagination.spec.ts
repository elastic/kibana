/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  createMetricsTestIndex,
  cleanMetricsTestIndex,
  insertMetricsDocuments,
  TOTAL_METRIC_FIELDS,
  PAGINATION,
  DEFAULT_TIME_RANGE,
} from '../../fixtures';

const { PAGE_SIZE, TOTAL_PAGES, LAST_PAGE_CARDS } = PAGINATION;

spaceTest.describe(
  'Metrics in Discover - Grid Pagination',
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

      await spaceTest.step(
        `pagination is visible with ${TOTAL_METRIC_FIELDS} metrics`,
        async () => {
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.pagination.container).toBeVisible();
        }
      );

      await spaceTest.step(`UI shows ${TOTAL_PAGES} pages`, async () => {
        const totalPages = await metricsExperience.pagination.getTotalPages();
        expect(totalPages).toBe(TOTAL_PAGES);
      });

      await spaceTest.step(`first page shows ${PAGE_SIZE} cards`, async () => {
        const cardCount = await metricsExperience.getVisibleCardCount();
        expect(cardCount).toBe(PAGE_SIZE);
      });

      await spaceTest.step(
        `last page (page ${TOTAL_PAGES}) shows ${LAST_PAGE_CARDS} remaining cards`,
        async () => {
          await metricsExperience.pagination.getPageButton(TOTAL_PAGES - 1).click();
          await expect(metricsExperience.grid).toBeVisible();
          const cardCount = await metricsExperience.getVisibleCardCount();
          expect(cardCount).toBe(LAST_PAGE_CARDS);
        }
      );

      await spaceTest.step('navigate back to first page using page button', async () => {
        await metricsExperience.pagination.getPageButton(0).click();
        await expect(metricsExperience.grid).toBeVisible();
        const cardCount = await metricsExperience.getVisibleCardCount();
        expect(cardCount).toBe(PAGE_SIZE);
      });

      await spaceTest.step('navigate forward using next arrow', async () => {
        await metricsExperience.pagination.nextButton.click();
        await expect(metricsExperience.grid).toBeVisible();
        const cardCount = await metricsExperience.getVisibleCardCount();
        expect(cardCount).toBe(PAGE_SIZE); // page 2 has 20 cards
      });

      await spaceTest.step('navigate backward using prev arrow', async () => {
        await metricsExperience.pagination.prevButton.click();
        await expect(metricsExperience.grid).toBeVisible();
        const cardCount = await metricsExperience.getVisibleCardCount();
        expect(cardCount).toBe(PAGE_SIZE); // back to page 1
      });
    });
  }
);
