/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags, test as scoutTest } from '@kbn/scout';
import { test, testData } from '../fixtures';
import type { DataVisualizerTestFixtures } from '../../../scout/ui/fixtures';
import type { TestData } from '../../../scout/ui/fixtures/types';
import { farequoteDataViewTestData } from '../../../scout/ui/fixtures/expected_field_stats';
import {
  assertFieldStatsTableNotExists,
  assertViewModeToggleNotExists,
} from '../../../scout/ui/fixtures/discover_field_stats';

const runTestsWhenDisabled = async ({
  page,
  pageObjects,
  data,
}: {
  page: DataVisualizerTestFixtures['page'];
  pageObjects: DataVisualizerTestFixtures['pageObjects'];
  data: TestData;
}) => {
  await pageObjects.discover.goto({ queryMode: 'classic' });

  if (data.isSavedSearch) {
    await pageObjects.discover.loadSavedSearch(data.sourceIndexOrSavedSearch);
  } else {
    await pageObjects.discover.selectDataView(data.sourceIndexOrSavedSearch);
  }

  await pageObjects.datePicker.setAbsoluteRange({
    from: testData.DISCOVER_TIME_RANGE.start,
    to: testData.DISCOVER_TIME_RANGE.end,
  });

  await assertViewModeToggleNotExists(page);
  await assertFieldStatsTableNotExists(page);
};

test.describe(
  'field statistics in Discover (basic license)',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ esArchiver, mlTestResources, kbnClient }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.FAREQUOTE);
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await kbnClient.uiSettings.update({
        [testData.SHOW_FIELD_STATISTICS]: false,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ mlTestResources, kbnClient }) => {
      await kbnClient.uiSettings.unset(testData.SHOW_FIELD_STATISTICS);
      await mlTestResources.deleteDataViewByTitle('ft_farequote');
    });

    test('when disabled should not show view mode toggle or Field stats table', async ({
      page,
      pageObjects,
    }) => {
      await scoutTest.step('verify discover field stats controls are hidden', async () => {
        await runTestsWhenDisabled({ page, pageObjects, data: farequoteDataViewTestData });
      });
    });
  }
);
