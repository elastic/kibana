/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test as scoutTest } from '@kbn/scout';
import { spaceTest } from '../fixtures';
import { assertDataDriftPageContent } from '../fixtures/data_drift_steps';
import { farequoteKQLFiltersDataDriftTestData } from '../fixtures/data_drift_test_data';

spaceTest.describe(
  'data drift with ft_farequote_filter_and_kuery saved search',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.createDataViewIfNeeded('ft_ihp_outlier', undefined, scoutSpace.id);
      await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
      await mlTestResources.createSavedSearchFarequoteFilterAndKueryIfNeeded(
        'ft_farequote',
        scoutSpace.id
      );
      await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
      await mlTestResources.deleteSavedSearches(scoutSpace.id);
      // ft_ihp_outlier is created first and becomes the space default; leaving it hijacks source selection in the next suite sharing the worker space.
      await mlTestResources.deleteDataViewByTitle('ft_ihp_outlier', scoutSpace.id);
      await mlTestResources.deleteDataViewByTitle('ft_farequote', scoutSpace.id);
      await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
    });

    spaceTest('loads the source data in data drift', async ({ pageObjects }) => {
      const { mlNavigation, jobSourceSelection, dataDrift } = pageObjects;
      const driftTestData = farequoteKQLFiltersDataDriftTestData;

      await scoutTest.step('loads the data drift index or saved search select page', async () => {
        await mlNavigation.navigateToDataDrift();
      });

      await scoutTest.step('loads the data drift view', async () => {
        await jobSourceSelection.selectSourceForDataDrift(
          driftTestData.sourceIndexOrSavedSearch,
          driftTestData.isSavedSearch
        );
        await assertDataDriftPageContent({ pageObjects, testData: driftTestData });

        await dataDrift.waitForDataViewTitleIfNeeded(driftTestData.dataViewName);

        await dataDrift.waitForTotalDocumentCount('Reference', driftTestData.totalDocCount);
        await dataDrift.waitForTotalDocumentCount('Comparison', driftTestData.totalDocCount);
      });
    });
  }
);
