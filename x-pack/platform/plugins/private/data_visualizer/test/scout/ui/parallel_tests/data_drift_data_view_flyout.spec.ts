/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { assertDataDriftPageContent } from '../fixtures/data_drift_steps';
import { dataViewCreationTestData, nonTimeSeriesTestData } from '../fixtures/data_drift_test_data';

spaceTest.describe('data drift data view flows', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.createDataViewIfNeeded('ft_ihp_outlier', undefined, scoutSpace.id);
    await mlTestResources.createDataViewIfNeeded('ft_farequote', '@timestamp', scoutSpace.id);
    await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.deleteDataViewByTitle('ft_fare*,ft_fareq*', scoutSpace.id);
    await mlTestResources.deleteDataViewByTitle('ft_fare*_picker_test', scoutSpace.id);
    await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
  });

  spaceTest(
    `${dataViewCreationTestData.suiteTitle} allows analyzing data drift without saving`,
    async ({ pageObjects }) => {
      const { mlNavigation, dataDrift } = pageObjects;

      await mlNavigation.navigateToDataDrift();
      await dataDrift.navigateToCreateNewDataViewPage();
      await dataDrift.waitForIndexPatternNotEmptyFormError('reference');
      await dataDrift.waitForIndexPatternNotEmptyFormError('comparison');
      await expect.poll(() => dataDrift.isAnalyzeWithoutSavingButtonDisabled()).toBe(true);
      await expect.poll(() => dataDrift.isAnalyzeDataDriftButtonDisabled()).toBe(true);

      await dataDrift.setIndexPatternInput('reference', 'ft_fare*');
      await dataDrift.setIndexPatternInput('comparison', 'ft_fareq*');
      await dataDrift.selectTimeField(dataViewCreationTestData.dateTimeField);

      await expect.poll(() => dataDrift.isAnalyzeWithoutSavingButtonDisabled()).toBe(false);
      await expect.poll(() => dataDrift.isAnalyzeDataDriftButtonDisabled()).toBe(false);

      await dataDrift.clickAnalyzeWithoutSavingButton();
      await assertDataDriftPageContent({ pageObjects, testData: dataViewCreationTestData });
      await dataDrift.waitForDataViewTitle('ft_fare*,ft_fareq*');
      await dataDrift.waitForTotalDocumentCount(
        'Reference',
        dataViewCreationTestData.totalDocCount
      );
      await dataDrift.waitForTotalDocumentCount(
        'Comparison',
        dataViewCreationTestData.totalDocCount
      );
    }
  );

  spaceTest(
    `${dataViewCreationTestData.suiteTitle} hides analyze data drift without saving option if patterns are same`,
    async ({ pageObjects }) => {
      const { mlNavigation, dataDrift } = pageObjects;

      await mlNavigation.navigateToDataDrift();
      await dataDrift.navigateToCreateNewDataViewPage();
      await expect.poll(() => dataDrift.isAnalyzeWithoutSavingButtonDisabled()).toBe(true);
      await expect.poll(() => dataDrift.isAnalyzeDataDriftButtonDisabled()).toBe(true);

      await dataDrift.setIndexPatternInput('reference', 'ft_fare*');
      await dataDrift.setIndexPatternInput('comparison', 'ft_fare*');

      await dataDrift.waitForAnalyzeWithoutSavingButtonHidden();
      await expect.poll(() => dataDrift.isAnalyzeDataDriftButtonDisabled()).toBe(false);

      await dataDrift.clickAnalyzeDataDrift();
      await assertDataDriftPageContent({ pageObjects, testData: dataViewCreationTestData });
      await dataDrift.waitForDataViewTitle('ft_farequote');
      await dataDrift.waitForTotalDocumentCount(
        'Reference',
        dataViewCreationTestData.totalDocCount
      );
      await dataDrift.waitForTotalDocumentCount(
        'Comparison',
        dataViewCreationTestData.totalDocCount
      );
    }
  );

  spaceTest(
    `${nonTimeSeriesTestData.suiteTitle} loads non-time series data`,
    async ({ pageObjects }) => {
      const { mlNavigation, jobSourceSelection, dataDrift } = pageObjects;

      await mlNavigation.navigateToDataDrift();
      await jobSourceSelection.selectSourceForDataDrift(
        nonTimeSeriesTestData.sourceIndexOrSavedSearch,
        nonTimeSeriesTestData.isSavedSearch
      );
      await dataDrift.runAnalysis();
    }
  );

  spaceTest(
    'opens the data view editor from picker and loads drift after creation',
    async ({ pageObjects }) => {
      const { mlNavigation, dataDrift } = pageObjects;

      await mlNavigation.navigateToDataDrift();
      await dataDrift.openCreateDataViewFromPicker();
      await dataDrift.createDataViewViaFlyout({
        name: 'ft_fare*_picker_test',
        indexPattern: 'ft_fare*',
        timeField: '@timestamp',
      });

      await dataDrift.waitForDataViewTitle('ft_fare*_picker_test');
      await dataDrift.waitForTimeRangeSelectorSection();
    }
  );
});
