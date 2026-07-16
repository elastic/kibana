/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { EuiComboBoxWrapper, spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  testData,
  canConvertToLensByTitle,
  convertToLensByTitle,
  createOpenInLensSuiteSetup,
} from '../../../fixtures';

/** Returns the selected option labels from a combo box inside the dimension editor flyout. */
const getDimensionFlyoutComboBoxSelectedOptions = async (
  page: ScoutPage,
  comboBoxTestSubj: string
): Promise<string[]> => {
  const comboBox = new EuiComboBoxWrapper(page, comboBoxTestSubj);
  const selectedOptions = await comboBox.getSelectedMultiOptions();
  if (selectedOptions.length > 0) {
    return selectedOptions;
  }

  const value = await comboBox.getSelectedValue();
  return value ? [value] : [];
};

spaceTest.describe('Lens open in Lens — agg-based Table', { tag: tags.stateful.classic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.AGG_BASED.TABLE,
    dashboardTitles: testData.DASHBOARD_TITLES.OPEN_IN_LENS.AGG_BASED.TABLE,
  });

  spaceTest.beforeAll(openInLensSuite.beforeAll);

  spaceTest.beforeEach(openInLensSuite.beforeEach);

  spaceTest.afterAll(openInLensSuite.afterAll);

  spaceTest('should not allow converting of unsupported aggregations', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    expect(await canConvertToLensByTitle({ dashboard }, 'Table - Unsupported Agg')).toBe(false);
  });

  spaceTest('should convert aggregation with params', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;

    await convertToLensByTitle({ dashboard }, 'Table - Agg with params');
    await lens.waitForVisualization('lnsDataTable');
    expect(await lens.getLayerCount()).toBe(1);

    await expect(lens.getDimensionTriggerLocator()).toHaveCount(1);
    const dimensions = await lens.getDimensionTriggers();
    await expect(dimensions[0]).toHaveText('Average machine.ram');
  });

  spaceTest('should convert total function to summary row', async ({ pageObjects, page }) => {
    const { dashboard, lens } = pageObjects;

    await convertToLensByTitle({ dashboard }, 'Table - Summary row');
    await lens.waitForVisualization('lnsDataTable');
    expect(await lens.getLayerCount()).toBe(1);

    await expect(lens.getDimensionTriggerLocator()).toHaveCount(1);
    const dimensions = await lens.getDimensionTriggers();
    await expect(dimensions[0]).toHaveText('Average machine.ram');

    await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
    expect(
      await getDimensionFlyoutComboBoxSelectedOptions(page, 'lnsDatatable_summaryrow_function')
    ).toStrictEqual(['Sum']);
  });

  spaceTest('should convert sibling pipeline aggregation', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;

    await convertToLensByTitle({ dashboard }, 'Table - Sibling pipeline agg');
    await lens.waitForVisualization('lnsDataTable');
    expect(await lens.getLayerCount()).toBe(1);

    await expect(lens.getDimensionTriggerLocator()).toHaveCount(2);

    const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
    const splitRowText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
    expect(metricText).toBe('Overall Max of Count');
    expect(splitRowText).toBe('@timestamp');
  });

  spaceTest('should convert parent pipeline aggregation', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;

    await convertToLensByTitle({ dashboard }, 'Table - Parent pipeline agg');
    await lens.waitForVisualization('lnsDataTable');
    expect(await lens.getLayerCount()).toBe(1);

    await expect(lens.getDimensionTriggerLocator()).toHaveCount(2);

    const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
    const splitRowText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
    expect(metricText).toBe('Cumulative Sum of Count');
    expect(splitRowText).toBe('@timestamp');
  });

  spaceTest(
    'should convert split rows and split table to split table rows',
    async ({ pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await convertToLensByTitle({ dashboard }, 'Table - Split rows and tables');
      await lens.waitForVisualization('lnsDataTable');
      expect(await lens.getLayerCount()).toBe(1);

      await expect(lens.getDimensionTriggerLocator()).toHaveCount(3);

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
      const splitRowText1 = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
      const splitRowText2 = await lens.getDimensionTriggerText('lnsDatatable_rows', 1);
      expect(metricText).toBe('Count');
      expect(splitRowText1).toBe('@timestamp');
      expect(splitRowText2).toBe('bytes: Descending');
    }
  );

  spaceTest('should convert percentage column', async ({ pageObjects, page }) => {
    const { dashboard, lens } = pageObjects;

    await convertToLensByTitle({ dashboard }, 'Table - Percentage Column');
    await lens.waitForVisualization('lnsDataTable');
    expect(await lens.getLayerCount()).toBe(1);

    await expect(lens.getDimensionTriggerLocator()).toHaveCount(2);

    const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
    const percentageColumnText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 1);

    await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger', 0, 1);
    expect(
      await getDimensionFlyoutComboBoxSelectedOptions(page, 'indexPattern-dimension-format')
    ).toStrictEqual(['Percent']);

    expect(metricText).toBe('Count');
    expect(percentageColumnText).toBe('Count percentages');
  });
});
