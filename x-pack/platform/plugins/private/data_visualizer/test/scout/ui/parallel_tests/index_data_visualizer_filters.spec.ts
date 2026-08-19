/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags, test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { TestData } from '../fixtures/types';
import {
  farequoteKQLFiltersSearchTestData,
  farequoteLuceneFiltersSearchTestData,
} from '../fixtures/expected_field_stats_random_sampler';
import { gotoDiscoverClassic } from '../fixtures/discover_field_stats';
import {
  addFilterAllowExistingBadges,
  getFilterFieldKeyVariants,
  hasFilterBadge,
  removeFirstPresentFilter,
  toggleFilterPinnedForField,
} from '../fixtures/filter_bar_assertions';

const PINNED_FILTER = {
  key: 'type',
  value: 'farequote',
  enabled: true,
  pinned: true,
  negated: false,
};

const openMlDataVisualizerViaSidebar = async (
  page: ExtParallelRunTestFixtures['page'],
  pageObjects: ExtParallelRunTestFixtures['pageObjects']
) => {
  await pageObjects.collapsibleNav.clickItem('Machine Learning');
  await page.testSubj.locator('mlApp').waitFor({ state: 'visible' });
  await page.testSubj.click('~mlMainTab & ~dataVisualizer');
  await page.testSubj
    .locator('~mlMainTab & ~dataVisualizer & ~selected')
    .waitFor({ state: 'visible' });
  await page.testSubj.locator('mlPageDataVisualizerSelector').waitFor({ state: 'visible' });
};

const openDiscoverViaSidebar = async (
  page: ExtParallelRunTestFixtures['page'],
  pageObjects: ExtParallelRunTestFixtures['pageObjects']
) => {
  await pageObjects.collapsibleNav.clickItem('Discover');
  await expect(page.testSubj.locator('queryInput')).toBeVisible({ timeout: 30_000 });
  await expect(pageObjects.discover.getSelectedDataView()).toBeVisible({ timeout: 30_000 });
};

const assertFilterBarFilterContent = async (
  page: ExtParallelRunTestFixtures['page'],
  pageObjects: ExtParallelRunTestFixtures['pageObjects'],
  filter: {
    key: string;
    value: string;
    enabled?: boolean;
    pinned?: boolean;
    negated?: boolean;
  }
) => {
  await expect
    .poll(
      async () => {
        for (const field of getFilterFieldKeyVariants(filter.key)) {
          if (
            await pageObjects.filterBar.hasFilter({
              field,
              value: filter.value,
              enabled: filter.enabled ?? true,
              pinned: filter.pinned ?? false,
              negated: filter.negated ?? false,
            })
          ) {
            return true;
          }
        }

        if (
          await hasFilterBadge(page, {
            field: filter.key,
            value: filter.value,
            enabled: filter.enabled ?? true,
            pinned: filter.pinned ?? false,
            negated: filter.negated ?? false,
          })
        ) {
          return true;
        }

        const labels = await pageObjects.filterBar.getFiltersLabel();
        return labels.some(
          (label) => label.includes(filter.value) && label.includes(filter.key.split('.')[0])
        );
      },
      { timeout: 30_000 }
    )
    .toBe(true);
};

const runFilterFromDiscoverTest = async ({
  page,
  pageObjects,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  data: TestData;
}) => {
  await gotoDiscoverClassic(page, pageObjects.discover);
  await pageObjects.discover.selectDataView('ft_farequote');
  await pageObjects.datePicker.setAbsoluteRange({
    from: testData.DISCOVER_TIME_RANGE.start,
    to: testData.DISCOVER_TIME_RANGE.end,
  });

  await addFilterAllowExistingBadges(page, {
    field: PINNED_FILTER.key,
    operator: 'is',
    value: PINNED_FILTER.value,
  });
  await toggleFilterPinnedForField(
    page,
    (field) => pageObjects.filterBar.toggleFilterPinned(field),
    PINNED_FILTER.key
  );
  await assertFilterBarFilterContent(page, pageObjects, PINNED_FILTER);

  await openMlDataVisualizerViaSidebar(page, pageObjects);
  await pageObjects.dataVisualizerSelector.navigateToDataViewSelection();
  await pageObjects.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
    data.sourceIndexOrSavedSearch,
    data.isSavedSearch
  );

  await pageObjects.indexDataVisualizer.clickUseFullDataButton(
    data.expected.totalDocCountFormatted
  );

  for (const filter of data.expected.filters ?? []) {
    await assertFilterBarFilterContent(page, pageObjects, {
      key: filter.key,
      value: filter.value,
      enabled: true,
      pinned: false,
      negated: false,
    });
  }

  await assertFilterBarFilterContent(page, pageObjects, PINNED_FILTER);
};

const runFilterToDiscoverTest = async ({
  page,
  pageObjects,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  data: TestData;
}) => {
  await pageObjects.mlNavigation.navigateToDataVisualizer();
  await pageObjects.dataVisualizerSelector.navigateToDataViewSelection();
  await pageObjects.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
    data.sourceIndexOrSavedSearch,
    data.isSavedSearch
  );

  await pageObjects.indexDataVisualizer.waitForTimeRangeSelectorSection();
  await pageObjects.indexDataVisualizer.clickUseFullDataButton(
    data.expected.totalDocCountFormatted
  );

  await addFilterAllowExistingBadges(page, {
    field: PINNED_FILTER.key,
    operator: 'is',
    value: PINNED_FILTER.value,
  });
  await toggleFilterPinnedForField(
    page,
    (field) => pageObjects.filterBar.toggleFilterPinned(field),
    PINNED_FILTER.key
  );
  await assertFilterBarFilterContent(page, pageObjects, PINNED_FILTER);

  await openDiscoverViaSidebar(page, pageObjects);
  await pageObjects.discover.selectDataView('ft_farequote');
  await assertFilterBarFilterContent(page, pageObjects, PINNED_FILTER);
};

spaceTest.describe(
  'data visualizer with pinned global filters',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
      await mlTestResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded(
        'ft_farequote',
        scoutSpace.id
      );
      await mlTestResources.createSavedSearchFarequoteFilterAndKueryIfNeeded(
        'ft_farequote',
        scoutSpace.id
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.setQueryMode('classic');
    });

    spaceTest.afterEach(async ({ page }) => {
      await removeFirstPresentFilter(page, [PINNED_FILTER.key, 'type.keyword', 'type']);
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteSavedSearches(scoutSpace.id);
    });

    spaceTest(
      `retains pinned filters from discover with ${farequoteLuceneFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await scoutTest.step('retains pinned filters from other plugins', async () => {
          await runFilterFromDiscoverTest({
            page,
            pageObjects,
            data: farequoteLuceneFiltersSearchTestData,
          });
        });
      }
    );

    spaceTest(
      `retains pinned filters to discover with ${farequoteLuceneFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await scoutTest.step('retains pinned filters to other plugins', async () => {
          await runFilterToDiscoverTest({
            page,
            pageObjects,
            data: farequoteLuceneFiltersSearchTestData,
          });
        });
      }
    );

    spaceTest(
      `retains pinned filters from discover with ${farequoteKQLFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await scoutTest.step('retains pinned filters from other plugins', async () => {
          await runFilterFromDiscoverTest({
            page,
            pageObjects,
            data: farequoteKQLFiltersSearchTestData,
          });
        });
      }
    );

    spaceTest(
      `retains pinned filters to discover with ${farequoteKQLFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await scoutTest.step('retains pinned filters to other plugins', async () => {
          await runFilterToDiscoverTest({
            page,
            pageObjects,
            data: farequoteKQLFiltersSearchTestData,
          });
        });
      }
    );
  }
);
