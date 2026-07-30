/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags, test as scoutTest } from '@kbn/scout';
import { spaceTest, testData } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { TestData } from '../fixtures/types';
import { farequoteDataViewTestData } from '../fixtures/expected_field_stats';
import {
  assertFieldStatsTableNotExists,
  assertViewModeToggleExists,
  gotoDiscoverClassic,
} from '../fixtures/discover_field_stats';

const runTestsWhenDisabled = async ({
  page,
  pageObjects,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  data: TestData;
}) => {
  await gotoDiscoverClassic(page, pageObjects.discover);

  if (data.isSavedSearch) {
    await pageObjects.discover.loadSavedSearch(data.sourceIndexOrSavedSearch);
  } else {
    await pageObjects.discover.selectDataView(data.sourceIndexOrSavedSearch);
  }

  await pageObjects.datePicker.setAbsoluteRange({
    from: testData.DISCOVER_TIME_RANGE.start,
    to: testData.DISCOVER_TIME_RANGE.end,
  });

  await assertViewModeToggleExists(page);
  await assertFieldStatsTableNotExists(page);
};

spaceTest.describe(
  'field statistics in Discover (trial license)',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
      await scoutSpace.uiSettings.set({
        [testData.SHOW_FIELD_STATISTICS]: false,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.setQueryMode('classic');
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await scoutSpace.uiSettings.unset(testData.SHOW_FIELD_STATISTICS);
      await mlTestResources.deleteDataViewByTitle('ft_farequote', scoutSpace.id);
    });

    spaceTest(
      'when disabled should show view mode toggle but not Field stats tab',
      async ({ page, pageObjects }) => {
        await scoutTest.step('verify discover field stats controls are gated', async () => {
          await runTestsWhenDisabled({ page, pageObjects, data: farequoteDataViewTestData });
        });
      }
    );
  }
);
