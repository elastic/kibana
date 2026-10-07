/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import {
  farequoteDataViewTestData,
  farequoteLuceneSearchTestData,
} from '../fixtures/expected_field_stats_random_sampler';

const goToSourceForIndexBasedDataVisualizer = async (
  pageObjects: ExtParallelRunTestFixtures['pageObjects'],
  sourceIndexOrSavedSearch: string,
  isSavedSearch = false
) => {
  await pageObjects.mlNavigation.navigateToDataVisualizer();
  await pageObjects.dataVisualizerSelector.navigateToDataViewSelection();
  await pageObjects.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
    sourceIndexOrSavedSearch,
    isSavedSearch
  );
};

const assertRandomSamplingOption = async (
  pageObjects: ExtParallelRunTestFixtures['pageObjects'],
  page: ExtParallelRunTestFixtures['page'],
  expectedOption:
    | 'dvRandomSamplerOptionOnAutomatic'
    | 'dvRandomSamplerOptionOnManual'
    | 'dvRandomSamplerOptionOff',
  expectedProbability?: number
) => {
  await pageObjects.indexDataVisualizer.openRandomSamplerPopover();

  if (expectedOption === 'dvRandomSamplerOptionOff') {
    await expect(page.testSubj.locator('dvRandomSamplerProbabilityRange')).toBeHidden();
    await expect(page.testSubj.locator('dvRandomSamplerProbabilityUsedMsg')).toBeHidden();
    return;
  }

  if (expectedOption === 'dvRandomSamplerOptionOnManual') {
    await expect(page.testSubj.locator('dvRandomSamplerProbabilityRange')).toBeVisible();
    if (expectedProbability !== undefined) {
      await expect(page.testSubj.locator('dvRandomSamplerProbabilityRange')).toHaveAttribute(
        'value',
        `${expectedProbability}`
      );
    }
    return;
  }

  await expect(page.testSubj.locator('dvRandomSamplerProbabilityUsedMsg')).toBeVisible();
  if (expectedProbability !== undefined) {
    await expect(page.testSubj.locator('dvRandomSamplerProbabilityUsedMsg')).toContainText(
      `${expectedProbability}`
    );
  }
};

// Constantly fails on ECH: https://github.com/elastic/kibana/issues/286690
spaceTest.describe(
  'index based random sampler controls',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
      await mlTestResources.createDataViewIfNeeded(
        'ft_module_sample_logs',
        '@timestamp',
        scoutSpace.id
      );
      await mlTestResources.createSavedSearchFarequoteLuceneIfNeeded('ft_farequote', scoutSpace.id);
      await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ page }) => {
      await page.evaluate(() => {
        window.localStorage.removeItem('dataVisualizer.randomSamplerPreference');
      });
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteSavedSearches(scoutSpace.id);
      await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
    });

    spaceTest('with small data sets', async ({ pageObjects, page }) => {
      await scoutTest.step(`has random sampler 'on - automatic' by default`, async () => {
        await goToSourceForIndexBasedDataVisualizer(
          pageObjects,
          farequoteDataViewTestData.sourceIndexOrSavedSearch,
          farequoteDataViewTestData.isSavedSearch
        );
        await assertRandomSamplingOption(
          pageObjects,
          page,
          'dvRandomSamplerOptionOnAutomatic',
          100
        );
      });

      await scoutTest.step(`retains random sampler 'off' setting`, async () => {
        await pageObjects.indexDataVisualizer.setRandomSamplingOption('dvRandomSamplerOptionOff');
        await goToSourceForIndexBasedDataVisualizer(
          pageObjects,
          farequoteLuceneSearchTestData.sourceIndexOrSavedSearch,
          farequoteLuceneSearchTestData.isSavedSearch
        );
        await assertRandomSamplingOption(pageObjects, page, 'dvRandomSamplerOptionOff');
      });

      await scoutTest.step(`retains random sampler 'on - manual' setting`, async () => {
        await pageObjects.indexDataVisualizer.setRandomSamplingOption(
          'dvRandomSamplerOptionOnManual'
        );
        await goToSourceForIndexBasedDataVisualizer(pageObjects, 'ft_module_sample_logs');
        await assertRandomSamplingOption(pageObjects, page, 'dvRandomSamplerOptionOnManual');
      });
    });
  }
);
