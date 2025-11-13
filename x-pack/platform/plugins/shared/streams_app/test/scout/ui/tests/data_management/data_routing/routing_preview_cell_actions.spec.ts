/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data routing - preview table cell actions',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.enable();
      await logsSynthtraceEsClient.clean();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoPartitioningTab('logs');
      await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('should create equals condition using cell action', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectPreviewPanelVisible();

      const dataGrid = page.getByTestId('streamsAppRoutingPreviewPanelWithResults');

      const cell = dataGrid
        .locator('[role="gridcell"][data-gridcell-column-id="severity_text"]')
        .first();
      await dataGrid.scrollIntoViewIfNeeded();
      await cell.scrollIntoViewIfNeeded();

      const cellValue = await cell.textContent();
      await cell.hover();

      await pageObjects.streams.clickFilterForButton();

      const fieldInput = page.getByTestId('streamsAppConditionEditorFieldText').locator('input');
      const operatorSelect = page.getByTestId('streamsAppConditionEditorOperator');
      const valueInput = page.getByTestId('streamsAppConditionEditorValueText').locator('input');

      await expect(fieldInput).toHaveValue('severity_text');
      await expect(operatorSelect).toHaveValue('eq');
      // The cell value is the full value with the last character being a newline, so we need to remove the last character
      await expect(valueInput).toHaveValue(cellValue!.slice(0, -1));
    });

    test('should create not-equals condition using cell action', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectPreviewPanelVisible();

      const dataGrid = page.getByTestId('streamsAppRoutingPreviewPanelWithResults');

      const cell = dataGrid
        .locator('[role="gridcell"][data-gridcell-column-id="severity_text"]')
        .first();
      await dataGrid.scrollIntoViewIfNeeded();
      await cell.scrollIntoViewIfNeeded();

      const cellValue = await cell.textContent();
      await cell.hover();

      await pageObjects.streams.clickFilterOutButton();

      const fieldInput = page.getByTestId('streamsAppConditionEditorFieldText').locator('input');
      const operatorSelect = page.getByTestId('streamsAppConditionEditorOperator');
      const valueInput = page.getByTestId('streamsAppConditionEditorValueText').locator('input');

      await expect(fieldInput).toHaveValue('severity_text');
      await expect(operatorSelect).toHaveValue('neq');
      await expect(valueInput).toHaveValue(cellValue!.slice(0, -1));
    });

    test('should replace condition when using cell action on existing condition', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('replace-condition');

      await pageObjects.streams.fillConditionEditor({
        field: 'service.name',
        operator: 'neq',
        value: 'initial',
      });

      await pageObjects.streams.expectPreviewPanelVisible();

      const fieldInput = page.getByTestId('streamsAppConditionEditorFieldText').locator('input');
      await expect(fieldInput).toHaveValue('service.name');

      const dataGrid = page.getByTestId('streamsAppRoutingPreviewPanelWithResults');
      const cell = dataGrid
        .locator('[role="gridcell"][data-gridcell-column-id="severity_text"]')
        .first();
      await dataGrid.scrollIntoViewIfNeeded();
      await cell.scrollIntoViewIfNeeded();

      const cellValue = await cell.textContent();
      await cell.hover();

      await pageObjects.streams.clickFilterForButton();

      const operatorSelect = page.getByTestId('streamsAppConditionEditorOperator');
      const valueInput = page.getByTestId('streamsAppConditionEditorValueText').locator('input');

      await expect(fieldInput).toHaveValue('severity_text');
      await expect(operatorSelect).toHaveValue('eq');
      await expect(valueInput).toHaveValue(cellValue!.slice(0, -1));
    });
  }
);
