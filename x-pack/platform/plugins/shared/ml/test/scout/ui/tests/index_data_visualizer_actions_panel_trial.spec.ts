/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';
import {
  setupFarequoteDataVisualizerFixtures,
  teardownFarequoteDataVisualizerFixtures,
} from '../fixtures/test_setup';

test.describe('index based actions panel on trial license', { tag: tags.stateful.classic }, () => {
  let dataViewId: string;

  test.beforeAll(async ({ esArchiver, apiServices, kbnClient, esClient }) => {
    dataViewId = await setupFarequoteDataVisualizerFixtures({
      esArchiver,
      apiServices,
      kbnClient,
      esClient,
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    await teardownFarequoteDataVisualizerFixtures({ apiServices, kbnClient }, dataViewId);
  });

  test('create advanced job action', async ({ pageObjects }) => {
    const { mlDataVisualizerActions, mlJobWizard } = pageObjects;

    await scoutTest.step('loads the source data in the data visualizer', async () => {
      await mlDataVisualizerActions.navigateToDataVisualizer();
      await mlDataVisualizerActions.navigateToDataViewSelection();
      await mlDataVisualizerActions.selectDataView(testData.DATA_VIEW_TITLE);
    });

    await scoutTest.step('opens the advanced job wizard', async () => {
      await expect(mlDataVisualizerActions.actionsPanel).toBeVisible();
      await expect(mlDataVisualizerActions.createAdvancedJobCard).toBeVisible();
      await expect(mlDataVisualizerActions.createDataFrameAnalyticsCard).toBeVisible();

      await mlDataVisualizerActions.clickCreateAdvancedJobButton();
      await mlJobWizard.waitForAdvancedJobWizardOpen();
      await mlJobWizard.waitForDatafeedQueryEditor();
      await expect
        .poll(() => mlJobWizard.getDatafeedQueryEditorValue())
        .toBe(testData.ADVANCED_JOB_DATAFEED_QUERY);
    });
  });

  test('view in discover page action', async ({ page, pageObjects }) => {
    const { mlDataVisualizerActions, discover, queryBar } = pageObjects;

    await scoutTest.step('loads the source data in the data visualizer', async () => {
      await mlDataVisualizerActions.navigateToDataVisualizer();
      await mlDataVisualizerActions.navigateToDataViewSelection();
      await mlDataVisualizerActions.selectSavedSearch(testData.SAVED_SEARCH_TITLE);

      await expect(mlDataVisualizerActions.timeRangeSelectorSection).toBeVisible();
      await mlDataVisualizerActions.clickUseFullDataButton(testData.DOC_COUNT_FORMATTED);
    });

    await scoutTest.step('navigates to Discover page', async () => {
      await expect(mlDataVisualizerActions.actionsPanel).toBeVisible();
      await expect(mlDataVisualizerActions.viewInDiscoverCard).toBeVisible();

      await mlDataVisualizerActions.clickViewInDiscoverButton();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => queryBar.getQuery()).toBe(testData.EXPECTED_DISCOVER_QUERY);
      await expect(page.testSubj.locator('discoverQueryHits')).toHaveText(
        testData.DOC_COUNT_FORMATTED
      );
    });
  });
});
