/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags } from '@kbn/scout';
import { spaceTest } from '../fixtures';
import { runIndexDataVisualizerTests } from '../fixtures/index_data_visualizer_steps';
import { farequoteKQLSearchTestData } from '../fixtures/expected_field_stats_random_sampler';

spaceTest.describe(
  'index based with farequote KQL saved search',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
      await mlTestResources.createSavedSearchFarequoteKueryIfNeeded('ft_farequote', scoutSpace.id);
      await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.mlNavigation.navigateToDataVisualizer();
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteSavedSearches(scoutSpace.id);
      await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
    });

    spaceTest('displays index details', async ({ page, pageObjects }) => {
      await runIndexDataVisualizerTests({
        page,
        pageObjects,
        testData: farequoteKQLSearchTestData,
      });
    });
  }
);
