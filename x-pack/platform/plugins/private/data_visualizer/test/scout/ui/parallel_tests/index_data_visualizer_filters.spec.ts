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
import { hasFilterBadge, removeFirstPresentFilter } from '../fixtures/filter_bar_assertions';

const PINNED_FILTER = {
  key: 'type',
  value: 'farequote',
  enabled: true,
  pinned: true,
  negated: false,
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
    .poll(async () => {
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
    })
    .toBe(true);
};

const runFilterTests = async ({
  page,
  pageObjects,
  data,
}: {
  page: ExtParallelRunTestFixtures['page'];
  pageObjects: ExtParallelRunTestFixtures['pageObjects'];
  data: TestData;
}) => {
  await scoutTest.step('retains pinned filters from other plugins', async () => {
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView('ft_farequote');
    await pageObjects.datePicker.setAbsoluteRange({
      from: testData.DISCOVER_TIME_RANGE.start,
      to: testData.DISCOVER_TIME_RANGE.end,
    });

    await pageObjects.filterBar.addFilter({
      field: PINNED_FILTER.key,
      operator: 'is',
      value: PINNED_FILTER.value,
    });
    await pageObjects.filterBar.toggleFilterPinned(PINNED_FILTER.key);

    await pageObjects.mlNavigation.navigateToDataVisualizer();
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
  });

  await scoutTest.step('retains pinned filters to other plugins', async () => {
    await pageObjects.mlNavigation.navigateToMl();
    await pageObjects.mlNavigation.navigateToDataVisualizer();
    await pageObjects.dataVisualizerSelector.navigateToDataViewSelection();
    await pageObjects.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
      data.sourceIndexOrSavedSearch,
      data.isSavedSearch
    );

    await pageObjects.indexDataVisualizer.clickUseFullDataButton(
      data.expected.totalDocCountFormatted
    );

    await pageObjects.filterBar.addFilter({
      field: PINNED_FILTER.key,
      operator: 'is',
      value: PINNED_FILTER.value,
    });
    await pageObjects.filterBar.toggleFilterPinned(PINNED_FILTER.key);

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await assertFilterBarFilterContent(page, pageObjects, PINNED_FILTER);
  });
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

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ page }) => {
      await removeFirstPresentFilter(page, [PINNED_FILTER.key, 'type.keyword', 'type']);
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteSavedSearches(scoutSpace.id);
      await mlTestResources.deleteDataViewByTitle('ft_farequote', scoutSpace.id);
    });

    spaceTest(
      `with ${farequoteLuceneFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await runFilterTests({ page, pageObjects, data: farequoteLuceneFiltersSearchTestData });
      }
    );

    spaceTest(
      `with ${farequoteKQLFiltersSearchTestData.suiteTitle}`,
      async ({ page, pageObjects }) => {
        await runFilterTests({ page, pageObjects, data: farequoteKQLFiltersSearchTestData });
      }
    );
  }
);
