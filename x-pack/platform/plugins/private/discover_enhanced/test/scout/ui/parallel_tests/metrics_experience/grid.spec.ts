/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grid activation and ES|QL command compatibility tests.
 *
 * These tests validate when the metrics grid activates (or does not) based on
 * different ES|QL commands, using static TSDB_LOGS data.
 * For pagination and search tests see grid.navigation.spec.ts.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../fixtures';

spaceTest.describe(
  'Metrics in Discover - Grid',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
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
      await browserAuth.loginAsMetricsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should render metrics grid with cards', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_TSDB_LOGS);
      await expect(metricsExperience.grid).toBeVisible();
      await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
    });

    spaceTest('should render grid with WHERE filter', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | WHERE @timestamp > "${testData.TSDB_LOGS_DEFAULT_END_TIME}" - 100 DAYS`
      );
      await expect(metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with LIMIT', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(`${testData.ESQL_QUERIES.TS_TSDB_LOGS} | LIMIT 5`);
      await expect(metricsExperience.grid).toBeVisible();
    });

    spaceTest('should render grid with SORT', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(
        `${testData.ESQL_QUERIES.TS_TSDB_LOGS} | SORT @timestamp DESC`
      );
      await expect(metricsExperience.grid).toBeVisible();
    });

    spaceTest('should not render grid with FROM command', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.FROM_TSDB_LOGS);
      await expect(metricsExperience.grid).toBeHidden();
    });

    spaceTest('should not render grid with STATS command', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(`${testData.ESQL_QUERIES.TS_TSDB_LOGS} | STATS count()`);
      await expect(metricsExperience.grid).toBeHidden();
    });

    spaceTest('should persist grid when changing time range', async ({ pageObjects }) => {
      const { metricsExperience, datePicker } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_TSDB_LOGS);
      await expect(metricsExperience.grid).toBeVisible();

      await datePicker.setCommonlyUsedTime('Last_30 days');

      await expect(metricsExperience.grid).toBeVisible();
    });

    spaceTest('should show chart actions menu on metric card', async ({ pageObjects }) => {
      const { metricsExperience } = pageObjects;
      await metricsExperience.runEsqlQuery(testData.ESQL_QUERIES.TS_TSDB_LOGS);
      await expect(metricsExperience.grid).toBeVisible();

      const cardIndex = 0;

      await spaceTest.step('open context menu from first metric card', async () => {
        await metricsExperience.openCardContextMenu(cardIndex);
      });

      await spaceTest.step('View details action is present', async () => {
        await expect(metricsExperience.chartActions.viewDetails).toBeVisible();
      });

      await spaceTest.step('Copy to dashboard action is present', async () => {
        await expect(metricsExperience.chartActions.copyToDashboard).toBeVisible();
      });

      await spaceTest.step('Explore action is present', async () => {
        await expect(metricsExperience.getQuickActionsForCard(cardIndex).explore).toBeVisible();
      });
    });
  }
);
