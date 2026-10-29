/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as scoutTest } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  assertNonMetricFieldContents,
  assertNumberFieldContents,
  assertTableRowCount,
} from './field_stats_assertions';
import { hasFilterBadge } from './filter_bar_assertions';
import type { DataVisualizerPageObjects } from './page_objects';
import type { MetricFieldVisConfig, TestData } from './types';

export const runIndexDataVisualizerTests = async ({
  page,
  pageObjects,
  testData,
}: {
  page: ScoutPage;
  pageObjects: DataVisualizerPageObjects;
  testData: TestData;
}) => {
  const { dataVisualizerSelector, jobSourceSelection, indexDataVisualizer, dataVisualizerTable } =
    pageObjects;

  await scoutTest.step(
    `${testData.suiteTitle} loads the source data in the data visualizer`,
    async () => {
      await dataVisualizerSelector.navigateToDataViewSelection();
      await jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
        testData.sourceIndexOrSavedSearch,
        testData.isSavedSearch
      );
    }
  );

  await scoutTest.step(`${testData.suiteTitle} displays index details`, async () => {
    await indexDataVisualizer.waitForTimeRangeSelectorSection();

    for (const filter of testData.expected.filters ?? []) {
      await expect
        .poll(() =>
          hasFilterBadge(page, {
            field: filter.key,
            value: filter.value,
            enabled: filter.enabled ?? true,
            pinned: filter.pinned ?? false,
            negated: filter.negated ?? false,
          })
        )
        .toBe(true);
    }

    await indexDataVisualizer.clickUseFullDataButton(testData.expected.totalDocCountFormatted);

    await indexDataVisualizer.waitForTotalDocCountHeader();
    await indexDataVisualizer.waitForTotalDocCountChart();
    await indexDataVisualizer.waitForDataVisualizerTable();

    await dataVisualizerTable.ensureNumRowsPerPageIfNeeded(testData.rowsPerPage);

    await dataVisualizerTable.waitForSearchPanel();
    await dataVisualizerTable.waitForFieldTypeInput();
    await dataVisualizerTable.waitForFieldNameInput();

    await indexDataVisualizer.waitForFieldCountPanel();
    await indexDataVisualizer.waitForMetricFieldsSummary();
    await indexDataVisualizer.waitForFieldsSummary();
    await indexDataVisualizer.waitForVisibleMetricFieldsCount(
      testData.expected.visibleMetricFieldsCount
    );
    await indexDataVisualizer.waitForTotalMetricFieldsCount(
      testData.expected.totalMetricFieldsCount
    );
    await indexDataVisualizer.waitForVisibleFieldsCount(testData.expected.populatedFieldsCount);
    await indexDataVisualizer.waitForTotalFieldsCount(testData.expected.totalFieldsCount);

    for (const filter of testData.expected.filters ?? []) {
      await expect
        .poll(() =>
          hasFilterBadge(page, {
            field: filter.key,
            value: filter.value,
            enabled: filter.enabled ?? true,
            pinned: filter.pinned ?? false,
            negated: filter.negated ?? false,
          })
        )
        .toBe(true);
    }

    for (const fieldRow of testData.expected.metricFields as Array<
      Required<MetricFieldVisConfig>
    >) {
      await assertNumberFieldContents(
        dataVisualizerTable,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        fieldRow.topValuesCount,
        fieldRow.viewableInLens
      );
    }

    for (const fieldRow of testData.expected.nonMetricFields ?? []) {
      await assertNonMetricFieldContents(
        dataVisualizerTable,
        fieldRow.type,
        fieldRow.fieldName,
        fieldRow.docCountFormatted,
        fieldRow.exampleCount,
        fieldRow.viewableInLens,
        false,
        fieldRow.exampleContent
      );
    }

    await dataVisualizerTable.setFieldTypeFilter(testData.fieldTypeFilters);
    await assertTableRowCount(dataVisualizerTable, testData.expected.fieldTypeFiltersResultCount);
    await dataVisualizerTable.removeFieldTypeFilter(testData.fieldTypeFilters);
    await assertTableRowCount(dataVisualizerTable, testData.expected.populatedFieldsCount);

    await dataVisualizerTable.setFieldNameFilter(testData.fieldNameFilters);
    await assertTableRowCount(dataVisualizerTable, testData.expected.fieldNameFiltersResultCount);
    await dataVisualizerTable.removeFieldNameFilter(testData.fieldNameFilters);
    await assertTableRowCount(dataVisualizerTable, testData.expected.populatedFieldsCount);

    await dataVisualizerTable.setShowEmptyFieldsSwitchState(true);
    for (const fieldName of testData.expected.emptyFields) {
      await dataVisualizerTable.waitForRow(fieldName);
    }
  });
};
