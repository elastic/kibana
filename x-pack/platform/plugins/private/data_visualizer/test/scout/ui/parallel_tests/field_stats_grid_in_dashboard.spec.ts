/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import type { KbnClient, ScoutSpaceParallelFixture } from '@kbn/scout';
import { tags, test as scoutTest } from '@kbn/scout';
import { spaceTest, testData } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { MetricFieldVisConfig, TestData } from '../fixtures/types';
import { farequoteLuceneFiltersSearchTestData } from '../fixtures/expected_field_stats';
import {
  assertNonMetricFieldContents,
  assertNumberFieldContents,
} from '../fixtures/field_stats_assertions';
import {
  assertFieldStatsTabNotExists,
  assertViewModeToggleExists,
  clickViewModeFieldStatsButton,
  gotoDiscoverClassic,
  selectDiscoverSource,
} from '../fixtures/discover_field_stats';

const PINNED_FILTER = {
  key: 'type',
  value: 'farequote',
};

const getSavedObjectIdByTitle = async ({
  kbnClient,
  objectType,
  title,
  space,
}: {
  kbnClient: KbnClient;
  objectType: string;
  title: string;
  space?: string;
}) => {
  const response = await kbnClient.savedObjects.find<{ title?: string }>({
    type: objectType,
    space,
  });

  return response.saved_objects.find((savedObject) => savedObject.attributes.title === title)?.id;
};

const deleteSavedObjectByTitle = async ({
  kbnClient,
  objectType,
  title,
  space,
}: {
  kbnClient: KbnClient;
  objectType: string;
  title: string;
  space?: string;
}) => {
  const id = await getSavedObjectIdByTitle({ kbnClient, objectType, title, space });

  if (id) {
    await kbnClient.savedObjects.delete({ type: objectType, id, space });
  }
};

const runDashboardFieldStatsTests = async ({
  page,
  pageObjects,
  kbnClient,
  scoutSpace,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  kbnClient: KbnClient;
  scoutSpace: ScoutSpaceParallelFixture;
  data: TestData;
}) => {
  const savedSearchTitle = `Field stats for ${data.suiteTitle} ${Date.now()}`;
  const dashboardTitle = `Dashboard for ${data.suiteTitle} ${Date.now()}`;

  await scoutTest.step('saves search with Field statistics table in Discover', async () => {
    await scoutSpace.uiSettings.set({
      [testData.SHOW_FIELD_STATISTICS]: true,
    });

    await gotoDiscoverClassic(page, pageObjects.discover);

    await selectDiscoverSource(
      pageObjects.discover,
      data.sourceIndexOrSavedSearch,
      data.isSavedSearch
    );

    await pageObjects.datePicker.setAbsoluteRange({
      from: testData.DISCOVER_TIME_RANGE.start,
      to: testData.DISCOVER_TIME_RANGE.end,
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await clickViewModeFieldStatsButton(page);
    await pageObjects.discover.saveSearchAsNew(savedSearchTitle);
  });

  await scoutTest.step('displays Field statistics table in Dashboard when enabled', async () => {
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.addSavedSearch(savedSearchTitle);
    await pageObjects.dashboard.waitForRenderComplete();

    await pageObjects.datePicker.setAbsoluteRange({
      from: testData.DISCOVER_TIME_RANGE.start,
      to: testData.DISCOVER_TIME_RANGE.end,
    });

    for (const fieldRow of data.expected.metricFields as Array<Required<MetricFieldVisConfig>>) {
      await assertNumberFieldContents(
        pageObjects.dataVisualizerTable,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        fieldRow.topValuesCount,
        fieldRow.viewableInLens
      );
    }

    for (const fieldRow of data.expected.nonMetricFields ?? []) {
      await assertNonMetricFieldContents(
        pageObjects.dataVisualizerTable,
        fieldRow.type,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        fieldRow.exampleCount,
        fieldRow.viewableInLens,
        false,
        fieldRow.exampleContent
      );
    }

    await pageObjects.filterBar.addFilter({
      field: PINNED_FILTER.key,
      operator: 'is not',
      value: PINNED_FILTER.value,
    });

    await assertNonMetricFieldContents(
      pageObjects.dataVisualizerTable,
      'text',
      '@version',
      '0 (0%)',
      0,
      false
    );

    await pageObjects.filterBar.removeFilter(PINNED_FILTER.key);
    await pageObjects.dashboard.saveDashboard(dashboardTitle);
  });

  await scoutTest.step(
    "doesn't display Field statistics table in Dashboard when disabled",
    async () => {
      await scoutSpace.uiSettings.set({
        [testData.SHOW_FIELD_STATISTICS]: false,
      });

      await gotoDiscoverClassic(page, pageObjects.discover);
      await pageObjects.discover.loadSavedSearch(savedSearchTitle);

      await pageObjects.datePicker.setAbsoluteRange({
        from: testData.DISCOVER_TIME_RANGE.start,
        to: testData.DISCOVER_TIME_RANGE.end,
      });
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await assertViewModeToggleExists(page);
      await assertFieldStatsTabNotExists(page);
    }
  );

  await deleteSavedObjectByTitle({
    kbnClient,
    objectType: 'search',
    title: savedSearchTitle,
    space: scoutSpace.id,
  });
  await deleteSavedObjectByTitle({
    kbnClient,
    objectType: 'dashboard',
    title: dashboardTitle,
    space: scoutSpace.id,
  });
};

spaceTest.describe('field statistics in Dashboard', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
    await mlTestResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded(
      'ft_farequote',
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await scoutSpace.uiSettings.unset(testData.SHOW_FIELD_STATISTICS);
    await mlTestResources.deleteSavedSearches(scoutSpace.id);
  });

  spaceTest(
    `with ${farequoteLuceneFiltersSearchTestData.suiteTitle}`,
    async ({ page, pageObjects, kbnClient, scoutSpace }) => {
      await runDashboardFieldStatsTests({
        page,
        pageObjects,
        kbnClient,
        scoutSpace,
        data: farequoteLuceneFiltersSearchTestData,
      });
    }
  );
});
