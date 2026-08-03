/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_JOB_FIELD_TYPES } from '@kbn/ml-anomaly-utils';
import { tags, test as scoutTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import type { ExtParallelRunTestFixtures } from '../fixtures';
import type { MetricFieldVisConfig, NonMetricFieldVisConfig } from '../fixtures/types';
import {
  assertNonMetricFieldContents,
  assertNumberFieldContents,
} from '../fixtures/field_stats_assertions';

interface DataViewManagementTestData {
  suiteTitle: string;
  sourceIndexOrSavedSearch: string;
  rowsPerPage?: 10 | 25 | 50;
  newFields?: Array<{ fieldName: string; type: string; script: string }>;
  fieldsToRename?: Array<{ originalName: string; newName: string }>;
  expected: {
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
  };
}

const originalTestData: DataViewManagementTestData = {
  suiteTitle: 'original data view',
  sourceIndexOrSavedSearch: 'ft_farequote',
  expected: {
    totalDocCountFormatted: '86,274',
    metricFields: [],
    nonMetricFields: [],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
  },
};

const addDeleteFieldTestData: DataViewManagementTestData = {
  suiteTitle: 'add field',
  sourceIndexOrSavedSearch: 'ft_farequote',
  newFields: [
    {
      fieldName: 'rt_airline_lowercase',
      type: 'Keyword',
      script: 'emit(params._source.airline.toLowerCase())',
    },
  ],
  expected: {
    totalDocCountFormatted: '86,274',
    metricFields: [],
    nonMetricFields: [
      {
        fieldName: 'rt_airline_lowercase',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 11,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: true,
        hasActionMenu: true,
      },
    ],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 8,
    totalFieldsCount: 9,
  },
};

const customLabelTestData: DataViewManagementTestData = {
  suiteTitle: 'custom label',
  sourceIndexOrSavedSearch: 'ft_farequote',
  fieldsToRename: [
    {
      originalName: 'responsetime',
      newName: 'new_responsetime',
    },
  ],
  expected: {
    totalDocCountFormatted: '86,274',
    metricFields: [
      {
        fieldName: 'new_responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '86,274 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 11,
        viewableInLens: true,
        hasActionMenu: false,
      },
    ],
    nonMetricFields: [],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
  },
};

const navigateToIndexDataVisualizer = async (
  pageObjects: ExtParallelRunTestFixtures['pageObjects'],
  data: DataViewManagementTestData
) => {
  await pageObjects.mlNavigation.navigateToMl();
  await pageObjects.mlNavigation.navigateToDataVisualizer();
  await pageObjects.dataVisualizerSelector.navigateToDataViewSelection();
  await pageObjects.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
    data.sourceIndexOrSavedSearch
  );
  await pageObjects.indexDataVisualizer.waitForTimeRangeSelectorSection();
  await pageObjects.indexDataVisualizer.clickUseFullDataButton(
    data.expected.totalDocCountFormatted
  );
};

const checkPageDetails = async (
  pageObjects: ExtParallelRunTestFixtures['pageObjects'],
  data: DataViewManagementTestData
) => {
  await pageObjects.indexDataVisualizer.waitForTotalDocCountHeader();
  await pageObjects.indexDataVisualizer.waitForTotalDocCountChart();
  await pageObjects.indexDataVisualizer.waitForDataVisualizerTable();

  if (data.rowsPerPage) {
    await pageObjects.dataVisualizerTable.ensureNumRowsPerPage(data.rowsPerPage);
  }

  await pageObjects.dataVisualizerTable.waitForSearchPanel();
  await pageObjects.dataVisualizerTable.waitForFieldTypeInput();
  await pageObjects.dataVisualizerTable.waitForFieldNameInput();
  await pageObjects.indexDataVisualizer.waitForFieldCountPanel();
  await pageObjects.indexDataVisualizer.waitForMetricFieldsSummary();
  await pageObjects.indexDataVisualizer.waitForFieldsSummary();
  await pageObjects.indexDataVisualizer.waitForVisibleMetricFieldsCount(
    data.expected.visibleMetricFieldsCount
  );
  await pageObjects.indexDataVisualizer.waitForTotalMetricFieldsCount(
    data.expected.totalMetricFieldsCount
  );
  await pageObjects.indexDataVisualizer.waitForVisibleFieldsCount(
    data.expected.populatedFieldsCount
  );
  await pageObjects.indexDataVisualizer.waitForTotalFieldsCount(data.expected.totalFieldsCount);
};

spaceTest.describe('data view management', { tag: tags.stateful.classic }, () => {
  const indexPatternTitle = 'ft_farequote';

  spaceTest.beforeAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.setKibanaTimeZoneToUTC(scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth, mlTestResources, scoutSpace, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await mlTestResources.createDataViewIfNeeded(indexPatternTitle, '@timestamp', scoutSpace.id);
    await navigateToIndexDataVisualizer(pageObjects, originalTestData);
  });

  spaceTest.afterEach(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.deleteDataViewByTitle(indexPatternTitle, scoutSpace.id);
  });

  spaceTest.afterAll(async ({ mlTestResources, scoutSpace }) => {
    await mlTestResources.resetKibanaTimeZone(scoutSpace.id);
  });

  spaceTest(
    'manages runtime fields and custom labels',
    async ({ pageObjects, mlTestResources, scoutSpace }) => {
      const resetToIndexVisualizer = async () => {
        await mlTestResources.deleteDataViewByTitle(indexPatternTitle, scoutSpace.id);
        await mlTestResources.createDataViewIfNeeded(
          indexPatternTitle,
          '@timestamp',
          scoutSpace.id
        );
        await navigateToIndexDataVisualizer(pageObjects, originalTestData);
      };

      await scoutTest.step('adds new field', async () => {
        for (const newField of addDeleteFieldTestData.newFields!) {
          await pageObjects.dataVisualizerDataView.addRuntimeField(
            newField.fieldName,
            newField.script,
            newField.type
          );
        }

        for (const fieldRow of addDeleteFieldTestData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await assertNumberFieldContents(
            pageObjects.dataVisualizerTable,
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.topValuesCount,
            fieldRow.viewableInLens,
            fieldRow.hasActionMenu
          );
        }

        for (const fieldRow of addDeleteFieldTestData.expected.nonMetricFields!) {
          await assertNonMetricFieldContents(
            pageObjects.dataVisualizerTable,
            fieldRow.type,
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.exampleCount,
            fieldRow.viewableInLens,
            fieldRow.hasActionMenu
          );
        }

        await checkPageDetails(pageObjects, addDeleteFieldTestData);
      });

      await scoutTest.step('sets custom label for existing field', async () => {
        await resetToIndexVisualizer();

        for (const field of customLabelTestData.fieldsToRename!) {
          await pageObjects.dataVisualizerDataView.renameField(field.originalName, field.newName);
          await expect
            .poll(() => pageObjects.dataVisualizerTable.getDisplayName(field.originalName))
            .toBe(field.newName);
        }
      });

      await scoutTest.step('deletes existing field', async () => {
        await resetToIndexVisualizer();

        for (const newField of addDeleteFieldTestData.newFields!) {
          await pageObjects.dataVisualizerDataView.addRuntimeField(
            newField.fieldName,
            newField.script,
            newField.type
          );
        }

        for (const fieldToDelete of addDeleteFieldTestData.newFields!) {
          await pageObjects.dataVisualizerDataView.deleteField(fieldToDelete.fieldName);
        }

        await checkPageDetails(pageObjects, originalTestData);
      });
    }
  );
});
