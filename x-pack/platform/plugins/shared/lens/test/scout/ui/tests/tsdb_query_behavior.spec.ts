/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  ROLLED_UP_MEDIAN_WARNING,
  TSDB_DATA_VIEW_ID,
  TSDB_ES_ARCHIVE,
  TSDB_INDEX,
  TSDB_TIME_RANGE,
  downsampleTSDBIndex,
} from '../fixtures';

test.describe('Lens TSDB query and editor behavior', { tag: tags.deploymentAgnostic }, () => {
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

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
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
    await pageObjects.lens.openFullEditor();
    const fieldLocator = page.testSubj.locator('lnsFieldListPanelField-bytes_gauge');
    // field list may be slow to render after data view switch
    await fieldLocator.waitFor({ state: 'visible', timeout: 30_000 });
    await fieldLocator.dragTo(page.testSubj.locator('workspace-drag-drop-prompt'));

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
    await pageObjects.lens.openFullEditor();
    await pageObjects.lens.switchDataPanelDataView(downsampledDataViewTitle);
    const fieldLocator = page.testSubj.locator('lnsFieldListPanelField-bytes_gauge');
    // field list may be slow to render after data view switch
    await fieldLocator.waitFor({ state: 'visible', timeout: 30_000 });
    await fieldLocator.dragTo(page.testSubj.locator('workspace-drag-drop-prompt'));

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
      'min',
      'average',
      'max',
      'counter_rate',
      'last_value',
      'median',
      'percentile',
      'percentile_rank',
      'standard_deviation',
      'sum',
      'unique_count',
    ];
    const supportedByFieldType = {
      counter: ['min', 'max', 'counter_rate', 'last_value'],
      gauge: allOperations,
    } as const;

    for (const fieldType of ['counter', 'gauge'] as const) {
      const supportedOperations = supportedByFieldType[fieldType];
      const unsupportedOperations = allOperations.filter(
        (op) => !(supportedOperations as readonly string[]).includes(op)
      );

      await test.step(`supported ${fieldType} operations`, async () => {
        // Reset editor for each field type to get empty dimension slots
        await pageObjects.lens.openFullEditor();

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
          // .euiFormErrorText is an EUI-internal CSS class — no data-test-subj available yet
          await expect(
            page.locator('[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText')
          ).toHaveCount(0);
          await pageObjects.lens.selectOperation('min');
        }
        await pageObjects.lens.closeDimensionEditor();
      });

      // Unsupported operations are always present for counter; empty for gauge
      await test.step(`unsupported ${fieldType} operations`, async () => {
        // Reuse the existing dimensions from the supported step — just reopen the y-axis
        await pageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
        await pageObjects.lens.selectOperation('min');

        for (const operation of unsupportedOperations) {
          await expect(
            page.testSubj.locator(`lns-indexPatternDimension-${operation} incompatible`)
          ).toBeVisible();
          await pageObjects.lens.selectOperation(operation, true);
          // .euiFormErrorText is an EUI-internal CSS class — no data-test-subj available yet
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
    await pageObjects.lens.openFullEditor();
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
    // role="presentation" is EUI's combobox group label — no data-test-subj available
    await expect(
      page.locator('[role="presentation"]').filter({ hasText: 'Time series dimensions' })
    ).toBeVisible();
    await pageObjects.lens.closeDimensionEditor();

    await pageObjects.lens.openFullEditor();
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
    await pageObjects.lens.clearDimensionField();
    await page.testSubj
      .locator('indexPattern-dimension-field')
      .getByTestId('comboBoxInput')
      .click();
    // role="presentation" is EUI's combobox group label — no data-test-subj available
    await expect(
      page.locator('[role="presentation"]').filter({ hasText: 'Time series dimensions' })
    ).toHaveCount(0);
    await pageObjects.lens.closeDimensionEditor();
  });
});
