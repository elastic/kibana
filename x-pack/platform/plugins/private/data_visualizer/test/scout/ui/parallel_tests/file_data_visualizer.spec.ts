/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { tags, test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  assertNonMetricFieldContents,
  assertNumberFieldContents,
  assertTableRowCount,
} from '../fixtures/field_stats_assertions';
import {
  fileDataVisualizerNegativeTestData,
  fileDataVisualizerPositiveTestData,
} from '../fixtures/file_data_visualizer_test_data';
import { spaceTest } from '../fixtures';

spaceTest.describe('file based data visualizer', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.mlNavigation.navigateToMl();
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
  });

  for (const testData of fileDataVisualizerPositiveTestData) {
    spaceTest(testData.suiteSuffix, async ({ pageObjects, esClient }) => {
      scoutTest.setTimeout(180_000);
      const {
        mlNavigation,
        dataVisualizerSelector,
        fileDataVisualizer,
        indexDataVisualizer,
        dataVisualizerTable,
      } = pageObjects;

      try {
        await scoutTest.step('displays and imports a file', async () => {
          await mlNavigation.navigateToDataVisualizer();
          await dataVisualizerSelector.navigateToFileUpload();
          await fileDataVisualizer.selectFile(testData.filePath);

          await expect
            .poll(() => fileDataVisualizer.getFileTitle(0))
            .toBe(testData.expected.results.title);
          await fileDataVisualizer.waitForFilePreviewPanel(0);

          await fileDataVisualizer.selectAnalysisExplanationButton(0);
          await fileDataVisualizer.waitForSummaryPanel();
          await fileDataVisualizer.waitForAnalysisExplanationPanel();
          await fileDataVisualizer.closeAnalysisExplanationPanel();

          await fileDataVisualizer.selectFieldStatsTab(0);
          await fileDataVisualizer.waitForFileStatsPanel(0);
          await indexDataVisualizer.waitForDataVisualizerTable();
          await dataVisualizerTable.ensureNumRowsPerPage(25);

          for (const fieldRow of testData.expected.metricFields) {
            await assertNumberFieldContents(
              dataVisualizerTable,
              fieldRow.fieldName,
              fieldRow.docCountFormatted,
              fieldRow.topValuesCount,
              false,
              false,
              false
            );
          }

          for (const fieldRow of testData.expected.nonMetricFields) {
            await assertNonMetricFieldContents(
              dataVisualizerTable,
              fieldRow.type,
              fieldRow.fieldName,
              fieldRow.docCountFormatted,
              fieldRow.exampleCount,
              false
            );
          }

          await indexDataVisualizer.waitForVisibleMetricFieldsCount(
            testData.expected.visibleMetricFieldsCount
          );
          await indexDataVisualizer.waitForTotalMetricFieldsCount(
            testData.expected.totalMetricFieldsCount
          );
          await indexDataVisualizer.waitForVisibleFieldsCount(testData.expected.totalFieldsCount);
          await indexDataVisualizer.waitForTotalFieldsCount(testData.expected.totalFieldsCount);

          await dataVisualizerTable.setFieldTypeFilter(testData.fieldTypeFilters);
          await assertTableRowCount(
            dataVisualizerTable,
            testData.expected.fieldTypeFiltersResultCount
          );
          await dataVisualizerTable.removeFieldTypeFilter(testData.fieldTypeFilters);
          await assertTableRowCount(dataVisualizerTable, testData.expected.totalFieldsCount);

          await dataVisualizerTable.setFieldNameFilter(testData.fieldNameFilters);
          await assertTableRowCount(
            dataVisualizerTable,
            testData.expected.fieldNameFiltersResultCount
          );
          await dataVisualizerTable.removeFieldNameFilter(testData.fieldNameFilters);
          await assertTableRowCount(dataVisualizerTable, testData.expected.totalFieldsCount);

          await fileDataVisualizer.setIndexName(testData.indexName);
          await expect.poll(() => fileDataVisualizer.isImportButtonEnabled()).toBe(true);
          await fileDataVisualizer.openAdvancedSettings();
          await fileDataVisualizer.setCreateIndexPatternCheckboxState(testData.createIndexPattern);
          await fileDataVisualizer.startImportAndWaitForProcessing();

          await expect
            .poll(() => fileDataVisualizer.getIngestedDocCount())
            .toBe(`${testData.expected.ingestedDocCount}`);

          await expect
            .poll(async () => {
              const fieldCaps = await esClient.fieldCaps({
                index: testData.indexName,
                fields: '*',
                filters: '-metadata',
                include_empty_fields: false,
              });
              return Object.keys(fieldCaps.fields).sort();
            })
            .toStrictEqual(testData.expected.allFields.sort());
        });
      } finally {
        await esClient.indices.delete({ index: testData.indexName }, { ignore: [404] });
      }
    });
  }

  for (const testData of fileDataVisualizerNegativeTestData) {
    spaceTest(testData.suiteSuffix, async ({ pageObjects }) => {
      const { mlNavigation, dataVisualizerSelector, fileDataVisualizer } = pageObjects;

      await scoutTest.step('does not import an invalid file', async () => {
        await mlNavigation.navigateToDataVisualizer();
        await dataVisualizerSelector.navigateToFileUpload();
        await fileDataVisualizer.selectFile(testData.filePath, true);
      });
    });
  }
});
