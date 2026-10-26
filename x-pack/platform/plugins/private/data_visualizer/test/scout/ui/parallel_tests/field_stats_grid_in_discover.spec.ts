/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect, playwright/no-skipped-test */

import { tags, test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { MetricFieldVisConfig, TestData } from '../fixtures/types';
import {
  farequoteDataViewTestData,
  farequoteKQLSearchTestData,
  farequoteLuceneFiltersSearchTestData,
  sampleLogTestData,
} from '../fixtures/expected_field_stats';
import {
  assertNonMetricFieldContents,
  assertNumberFieldContents,
} from '../fixtures/field_stats_assertions';
import { clickViewModeFieldStatsButton } from '../fixtures/discover_field_stats';

const SKIP_MESSAGE = 'Failing: See https://github.com/elastic/kibana/issues/259109';

const runDiscoverFieldStatsTests = async ({
  page,
  pageObjects,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
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

  await expect(page.testSubj.locator('discoverQueryHits')).toHaveText(
    data.expected.totalDocCountFormatted
  );

  await clickViewModeFieldStatsButton(page);

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
};

spaceTest.describe('field statistics in Discover', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
    await mlTestResources.createDataViewIfNeeded(
      'ft_module_sample_logs',
      '@timestamp',
      scoutSpace.id
    );
    await mlTestResources.createSavedSearchFarequoteKueryIfNeeded('ft_farequote', scoutSpace.id);
    await mlTestResources.createSavedSearchFarequoteLuceneIfNeeded('ft_farequote', scoutSpace.id);
    await mlTestResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded(
      'ft_farequote',
      scoutSpace.id
    );
    await mlTestResources.createSavedSearchFarequoteFilterAndKueryIfNeeded(
      'ft_farequote',
      scoutSpace.id
    );
    await scoutSpace.uiSettings.set({
      [testData.SHOW_FIELD_STATISTICS]: true,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await scoutSpace.uiSettings.unset(testData.SHOW_FIELD_STATISTICS);
    await mlTestResources.deleteSavedSearches(scoutSpace.id);
  });

  spaceTest.skip(
    `with ${farequoteDataViewTestData.suiteTitle} (${SKIP_MESSAGE})`,
    async ({ page, pageObjects }) => {
      await scoutTest.step("displays the 'Field statistics' table content correctly", async () => {
        await runDiscoverFieldStatsTests({ page, pageObjects, data: farequoteDataViewTestData });
      });
    }
  );

  spaceTest.skip(
    `with ${farequoteKQLSearchTestData.suiteTitle} (${SKIP_MESSAGE})`,
    async ({ page, pageObjects }) => {
      await scoutTest.step("displays the 'Field statistics' table content correctly", async () => {
        await runDiscoverFieldStatsTests({ page, pageObjects, data: farequoteKQLSearchTestData });
      });
    }
  );

  spaceTest.skip(
    `with ${farequoteLuceneFiltersSearchTestData.suiteTitle} (${SKIP_MESSAGE})`,
    async ({ page, pageObjects }) => {
      await scoutTest.step("displays the 'Field statistics' table content correctly", async () => {
        await runDiscoverFieldStatsTests({
          page,
          pageObjects,
          data: farequoteLuceneFiltersSearchTestData,
        });
      });
    }
  );

  spaceTest.skip(
    `with ${sampleLogTestData.suiteTitle} (${SKIP_MESSAGE})`,
    async ({ page, pageObjects }) => {
      await scoutTest.step("displays the 'Field statistics' table content correctly", async () => {
        await runDiscoverFieldStatsTests({ page, pageObjects, data: sampleLogTestData });
      });
    }
  );
});
