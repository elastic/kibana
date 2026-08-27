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

  // For time-based sources the Analyze button is not mounted until both histogram
  // brushes exist (see data_drift_view requiresWindowParameters empty prompt).
  // Wait for loaded doc counts before clicking so the histogram has real bars
  // (empty/loading charts have zero-height buckets that ignore element clicks).
  if ('chartClickCoordinates' in testData && 'totalDocCount' in testData) {
    await dataDrift.waitForTotalDocumentCount('Reference', testData.totalDocCount);
    await dataDrift.waitForTotalDocumentCount('Comparison', testData.totalDocCount);
    await dataDrift.clickDocumentCountChart('Reference', testData.chartClickCoordinates);
    await dataDrift.clickDocumentCountChart('Comparison', testData.comparisonChartClickCoordinates);
  }

  await expect.poll(() => dataDrift.isRunAnalysisButtonDisabled(), { timeout: 30_000 }).toBe(false);
  await dataDrift.runAnalysis();
};
