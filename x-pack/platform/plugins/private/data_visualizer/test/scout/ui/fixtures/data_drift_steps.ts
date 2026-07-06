/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { DataVisualizerPageObjects } from './page_objects';
import type { DataDriftTestData } from './data_drift_test_data';

export const assertDataDriftPageContent = async ({
  pageObjects,
  testData,
}: {
  pageObjects: DataVisualizerPageObjects;
  testData: DataDriftTestData;
}) => {
  const { dataDrift } = pageObjects;

  await dataDrift.waitForTimeRangeSelectorSection();
  await dataDrift.clickUseFullDataButton();
  await dataDrift.setRandomSamplingOption('Reference', 'dvRandomSamplerOptionOff');
  await dataDrift.setRandomSamplingOption('Comparison', 'dvRandomSamplerOptionOff');

  await dataDrift.waitForPrimarySearchBar();
  await dataDrift.waitForReferenceDocCountContent();
  await dataDrift.waitForComparisonDocCountContent();
  await dataDrift.waitForNoWindowParametersEmptyPrompt();

  if ('chartClickCoordinates' in testData) {
    const runAnalysisInitiallyDisabled = await dataDrift.isRunAnalysisButtonDisabled();

    if (runAnalysisInitiallyDisabled) {
      await dataDrift.clickDocumentCountChart('Reference', testData.chartClickCoordinates);
      await expect.poll(() => dataDrift.isRunAnalysisButtonDisabled()).toBe(true);
      await dataDrift.clickDocumentCountChart(
        'Comparison',
        testData.comparisonChartClickCoordinates
      );
    }
  }

  await expect.poll(() => dataDrift.isRunAnalysisButtonDisabled()).toBe(false);
  await dataDrift.runAnalysis();
};
