/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../fixtures';

spaceTest.describe(
  'Metrics in Discover - Grid',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSDB_LOGS);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.TSDB_LOGS);
      await scoutSpace.uiSettings.setDefaultTime({
        from: testData.TSDB_LOGS_DEFAULT_START_TIME,
        to: testData.TSDB_LOGS_DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should render metrics grid with cards', async ({ pageObjects }) => {
      await spaceTest.step('run ES|QL query', async () => {
        await pageObjects.metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_TSDB_LOGS);
      });

      await spaceTest.step('verify grid is visible', async () => {
        await expect(pageObjects.metricsExperience.grid).toBeVisible();
      });

      await spaceTest.step('verify at least one metric card is visible', async () => {
        await expect(pageObjects.metricsExperience.getCardByIndex(0)).toBeVisible();
      });
    });

    spaceTest('should render grid with WHERE filter', async ({ pageObjects }) => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | WHERE @timestamp > NOW() - 1 DAY`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with LIMIT', async ({ pageObjects }) => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | LIMIT 5`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with SORT', async ({ pageObjects }) => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | SORT @timestamp DESC`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest('should not render grid with FROM command', async ({ pageObjects }) => {
      await pageObjects.metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.FROM_TSDB_LOGS);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    spaceTest('should not render grid with STATS command', async ({ pageObjects }) => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | STATS count()`
      );
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });
  }
);
