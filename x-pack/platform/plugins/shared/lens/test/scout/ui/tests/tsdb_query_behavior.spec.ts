/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxWrapper, test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ROLLED_UP_MEDIAN_WARNING, downsampleTSDBIndex, tsdbTestData } from '../fixtures';

const { TSDB_DATA_VIEW_ID, TSDB_ES_ARCHIVE, TSDB_INDEX, TSDB_TIME_RANGE } = tsdbTestData;

const setupLensEditor = async ({
  browserAuth,
  pageObjects,
}: {
  browserAuth: { loginAsPrivilegedUser: () => Promise<void> };
  pageObjects: {
    lens: {
      openNewEditor: () => Promise<void>;
      switchDataPanelDataView: (dataViewTitle: string) => Promise<void>;
    };
  };
}): Promise<void> => {
  await browserAuth.loginAsPrivilegedUser();
  await pageObjects.lens.openNewEditor();
  await pageObjects.lens.switchDataPanelDataView(TSDB_INDEX);
};

test.describe('Lens TSDB query and editor behavior', { tag: tags.stateful.classic }, () => {
  let downsampledTargetIndex = '';
  const downsampledDataViewTitle = `${TSDB_INDEX},${TSDB_INDEX}_downsampled`;
  const createdDataViewIds: string[] = [];

  test.beforeAll(async ({ apiServices, esArchiver, esClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(TSDB_ES_ARCHIVE);

    const { data: tsdbDataView } = await apiServices.dataViews.create({
      id: TSDB_DATA_VIEW_ID,
      title: TSDB_INDEX,
      timeFieldName: '@timestamp',
      override: true,
    });
    createdDataViewIds.push(tsdbDataView.id);

    await uiSettings.set({
      'dateFormat:tz': 'UTC',
      defaultIndex: TSDB_DATA_VIEW_ID,
      'timepicker:timeDefaults': JSON.stringify(TSDB_TIME_RANGE),
    });

    downsampledTargetIndex = await downsampleTSDBIndex(esClient, TSDB_INDEX, { isStream: false });
    const { data: downsampleDataView } = await apiServices.dataViews.create({
      title: downsampledDataViewTitle,
      timeFieldName: '@timestamp',
      override: true,
    });
    createdDataViewIds.push(downsampleDataView.id);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await setupLensEditor({ browserAuth, pageObjects });
  });

  test.afterAll(async ({ apiServices, esClient, kbnClient, uiSettings }) => {
    for (const dataViewId of createdDataViewIds) {
      await apiServices.dataViews.delete(dataViewId);
    }
    await uiSettings.unset('dateFormat:tz', 'defaultIndex', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
    if (downsampledTargetIndex) {
      await esClient.indices.delete({ index: downsampledTargetIndex }, { ignore: [404] });
    }
    await esClient.indices.delete({ index: TSDB_INDEX }, { ignore: [404] });
  });

  test('defaults to median without warnings for non-rolled-up metrics', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.lens.dragFieldToWorkspace('bytes_gauge');

    await expect
      .poll(() => pageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel'))
      .toBe('Median of bytes_gauge');

    await pageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
    await expect(page.testSubj.locator('median-partial-warning')).toHaveCount(0);
    await expect(page.testSubj.locator('lens-editor-warning')).toHaveCount(0);
    await pageObjects.lens.closeDimensionEditor();
  });

  test('defaults to average and shows warnings for rolled-up metrics', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.lens.switchDataPanelDataView(downsampledDataViewTitle);
    await pageObjects.lens.dragFieldToWorkspace('bytes_gauge');

    await expect
      .poll(() => pageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel'))
      .toBe('Average of bytes_gauge');

    await pageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
    await expect(page.testSubj.locator('median-partial-warning')).toBeVisible();
    await page.testSubj.locator('lns-indexPatternDimension-median').click();
    await pageObjects.lens.waitForVisualization('xyVisChart');
    expect(await pageObjects.lens.getMessageListTexts('warning')).toContain(
      ROLLED_UP_MEDIAN_WARNING
    );
    await pageObjects.lens.closeDimensionEditor();

    await pageObjects.lens.save('New', { addToDashboard: 'new' });
    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.lens.getMessageListTexts('warning')).toContain(
      ROLLED_UP_MEDIAN_WARNING
    );
  });

  test('allows supported operations and rejects unsupported operations for time series fields', async ({
    page,
    pageObjects,
  }) => {
    const allOperations = [
      'average',
      'max',
      'last_value',
      'median',
      'percentile',
      'percentile_rank',
      'standard_deviation',
      'sum',
      'unique_count',
    ];
    const supportedByFieldType = {
      counter: ['max', 'last_value'],
      gauge: allOperations,
    } as const;

    for (const fieldType of ['counter', 'gauge'] as const) {
      const supportedOperations = supportedByFieldType[fieldType];
      const unsupportedOperations = allOperations.filter((op) => !supportedOperations.includes(op));

      await test.step(`supported ${fieldType} operations`, async () => {
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'min',
          field: `bytes_${fieldType}`,
          keepOpen: true,
        });

        for (const operation of supportedOperations) {
          await expect(
            page.testSubj.locator(`lns-indexPatternDimension-${operation} incompatible`)
          ).toHaveCount(0);
          await pageObjects.lens.selectOperation(operation);
          await expect(
            page.locator('[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText')
          ).toHaveCount(0);
          await pageObjects.lens.selectOperation('min');
        }
        await pageObjects.lens.closeDimensionEditor();
      });

      // Unsupported operations are always present for counter; empty for gauge
      await test.step(`unsupported ${fieldType} operations`, async () => {
        if (unsupportedOperations.length === 0) {
          return;
        }
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'min',
          field: `bytes_${fieldType}`,
          keepOpen: true,
        });

        for (const operation of unsupportedOperations) {
          await expect(
            page.testSubj.locator(`lns-indexPatternDimension-${operation} incompatible`)
          ).toBeVisible();
          await pageObjects.lens.selectOperation(operation, true);
          await expect(
            page.locator('[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText')
          ).toHaveText('This field does not work with the selected function.');
          await pageObjects.lens.selectOperation('min');
        }
        await pageObjects.lens.closeDimensionEditor();
      });
    }
  });

  test('shows time series dimension group only for breakdown field picker', async ({
    pageObjects,
    page,
  }) => {
    const dimensionFieldComboBox = new EuiComboBoxWrapper(page, 'indexPattern-dimension-field');

    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes_counter',
    });
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      keepOpen: true,
    });
    await page.testSubj
      .locator('indexPattern-dimension-field')
      .getByTestId('comboBoxInput')
      .click();
    await expect(page.getByRole('option', { name: 'Time series dimensions' })).toBeVisible();
    await pageObjects.lens.closeDimensionEditor();

    await pageObjects.lens.openNewEditor();
    await pageObjects.lens.switchDataPanelDataView(TSDB_INDEX);
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes_counter',
    });
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      keepOpen: true,
    });
    await dimensionFieldComboBox.clear();
    await page.testSubj
      .locator('indexPattern-dimension-field')
      .getByTestId('comboBoxInput')
      .click();
    await expect(page.getByRole('option', { name: 'Time series dimensions' })).toHaveCount(0);
    await pageObjects.lens.closeDimensionEditor();
  });
});
