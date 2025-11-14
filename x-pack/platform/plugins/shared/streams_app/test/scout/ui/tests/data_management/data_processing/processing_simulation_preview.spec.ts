/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data processing - simulation preview', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.enable();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
    await apiServices.streams.clearStreamProcessors('logs-generic-default');

    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await logsSynthtraceEsClient.clean();
    await apiServices.streams.disable();
  });

  test('should display default samples when no processors are configured', async ({
    pageObjects,
  }) => {
    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
    }
  });

  test('should display simulation preview when configuring a new processor', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Rename');
    await pageObjects.streams.fillProcessorFieldInput('message');
    await page.locator('input[name="to"]').fill('message');

    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
    }
  });

  test('should automatically update the simulation preview when changing a new processor config', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Rename');
    await pageObjects.streams.fillProcessorFieldInput('message');
    await page.locator('input[name="to"]').fill('message');

    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
    }

    await page.locator('input[name="to"]').fill('custom_message');

    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    expect(updatedRows.length).toBeGreaterThan(0);
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'custom_message',
        rowIndex,
        value: 'Test log message',
      });
    }
  });

  test('should update the simulation preview to previous state when discarding a new processor', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Rename');
    await pageObjects.streams.fillProcessorFieldInput('message');
    await page.locator('input[name="to"]').fill('message');

    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
    }

    // Cancel the changes and confirm discard
    await pageObjects.streams.clickCancelProcessorChanges();
    await pageObjects.streams.confirmDiscardInModal();

    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    expect(updatedRows.length).toBeGreaterThan(0);
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
    }
  });

  test('should update the simulation preview with outcome of multiple new processors', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Rename');
    await pageObjects.streams.fillProcessorFieldInput('message');
    await page.locator('input[name="to"]').fill('message');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Set');
    await pageObjects.streams.fillProcessorFieldInput('custom_threshold', { isCustomValue: true });
    await page.locator('input[name="value"]').fill('1024');
    await pageObjects.streams.clickSaveProcessor();

    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'custom_threshold',
        rowIndex,
        value: '1024',
      });
    }

    // Remove first processor
    await pageObjects.streams.removeProcessor(0);
    await pageObjects.streams.confirmDeleteInModal();

    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    expect(updatedRows.length).toBeGreaterThan(0);
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'message',
        rowIndex,
        value: 'Test log message',
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'custom_threshold',
        rowIndex,
        value: '1024',
      });
    }
  });

  test('should update the simulation preview with processed dates from another locale/timezone', async ({
    page,
    pageObjects,
  }) => {
    const sourceField = 'french_date';
    const targetField = 'processed_french_date';

    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Set');
    await pageObjects.streams.fillProcessorFieldInput(sourceField, { isCustomValue: true });
    await page.locator('input[name="value"]').fill('08 avril 1999');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Set');
    await pageObjects.streams.fillProcessorFieldInput(targetField, {
      isCustomValue: true,
    });
    await page.locator('input[name="value"]').fill('null');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.selectProcessorType('Date');
    await pageObjects.streams.fillDateProcessorSourceFieldInput(sourceField);
    await pageObjects.streams.fillDateProcessorFormatInput('dd MMMM yyyy');
    await pageObjects.streams.clickDateProcessorAdvancedSettings();
    await pageObjects.streams.fillDateProcessorTargetFieldInput(targetField);
    await pageObjects.streams.fillDateProcessorTimezoneInput('Europe/Paris');
    await pageObjects.streams.fillDateProcessorLocaleInput('fr');
    await pageObjects.streams.fillDateProcessorOutputFormatInput('yyyy-MM-dd');
    await pageObjects.streams.clickSaveProcessor();

    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    expect(updatedRows.length).toBeGreaterThan(0);
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: targetField,
        rowIndex,
        value: '1999-04-08',
      });
    }
  });
});
