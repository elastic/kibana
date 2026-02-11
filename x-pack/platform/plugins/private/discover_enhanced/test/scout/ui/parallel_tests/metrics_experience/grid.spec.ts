/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../fixtures';

spaceTest.describe('Metrics in Discover - Grid', { tag: ['@ess', '@svlOblt'] }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSDB_LOGS);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.TSDB_LOGS);
    await scoutSpace.uiSettings.setDefaultTime({
      from: testData.TSDB_LOGS_DEFAULT_START_TIME,
      to: testData.TSDB_LOGS_DEFAULT_END_TIME,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders metrics grid with cards', async ({ pageObjects }) => {
    await spaceTest.step('navigate and run ES|QL query', async () => {
      await pageObjects.discover.goto();
      await pageObjects.discover.selectTextBaseLang();
      await pageObjects.metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_TSDB_LOGS);
    });

    await spaceTest.step('grid is visible', async () => {
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    await spaceTest.step('at least one metric card is visible', async () => {
      await expect(pageObjects.metricsExperience.getCardByIndex(0)).toBeVisible();
    });
  });

  spaceTest('renders grid with different ES|QL command combinations', async ({ pageObjects }) => {
    await spaceTest.step('setup: navigate to Discover ES|QL mode', async () => {
      await pageObjects.discover.goto();
      await pageObjects.discover.selectTextBaseLang();
    });

    await spaceTest.step('grid renders with WHERE filter', async () => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | WHERE @timestamp > NOW() - 1 DAY`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    await spaceTest.step('grid renders with LIMIT', async () => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | LIMIT 5`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    await spaceTest.step('grid renders with SORT', async () => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | SORT @timestamp DESC`
      );
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });
  });

  spaceTest('does not render grid with unsupported commands', async ({ pageObjects }) => {
    await spaceTest.step('setup: navigate to Discover ES|QL mode', async () => {
      await pageObjects.discover.goto();
      await pageObjects.discover.selectTextBaseLang();
    });

    await spaceTest.step('grid does not render with FROM command', async () => {
      await pageObjects.metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.FROM_TSDB_LOGS);
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });

    await spaceTest.step('grid does not render with STATS command', async () => {
      await pageObjects.metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | STATS count()`
      );
      await expect(pageObjects.metricsExperience.grid).toBeHidden();
    });
  });
});
