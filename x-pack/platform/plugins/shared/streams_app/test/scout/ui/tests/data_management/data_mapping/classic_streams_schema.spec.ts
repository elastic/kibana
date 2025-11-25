/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const CLASSIC_STREAM_NAME = 'logs-classic-test';

test.describe(
  'Stream data mapping - schema editor - Classic Streams',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.enable();
      // Create a classic stream
      await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM_NAME });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();

      // Clear existing mappings before each test
      await apiServices.streams.clearStreamMappings(CLASSIC_STREAM_NAME);

      await pageObjects.streams.gotoSchemaEditorTab(CLASSIC_STREAM_NAME);
      await pageObjects.streams.verifyClassicBadge();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('read-only user cannot add/edit fields', async ({ page, browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoSchemaEditorTab(CLASSIC_STREAM_NAME);
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Verify "Add field" button is not visible for read-only user
      await expect(page.getByTestId('streamsAppContentAddFieldButton')).toBeHidden();

      // Verify field actions menu is not available (no actions button)
      await expect(page.getByTestId('streamsAppActionsButton')).toBeHidden();
    });

    test('non-ECS field names are allowed in classic streams', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Click the "Add field" button
      await page.getByTestId('streamsAppContentAddFieldButton').click();

      // Verify the add field flyout opens
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      // Fill in a non-ECS field name
      const nonEcsFieldName = 'custom_log_level';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(nonEcsFieldName);
      await page.keyboard.press('Enter');

      // Select field type
      await pageObjects.streams.setFieldMappingType('keyword');

      // Click the "Add field" button in the flyout
      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();

      // Verify the flyout closes (no validation error)
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeHidden();

      // Review and submit the staged changes
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();
      // Search for the newly added field
      await pageObjects.streams.searchFields(nonEcsFieldName);

      // Verify the field was added successfully
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: nonEcsFieldName,
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'status',
        rowIndex: 0,
        value: 'Mapped',
      });
    });

    test('dotted field names are supported', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Click the "Add field" button
      await page.getByTestId('streamsAppContentAddFieldButton').click();

      // Verify the add field flyout opens
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      // Fill in a dotted field name
      const dottedFieldName = 'app.request.duration_ms';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(dottedFieldName);
      await page.keyboard.press('Enter');

      // Select field type
      await pageObjects.streams.setFieldMappingType('long');

      // Click the "Add field" button in the flyout
      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();

      // Verify the flyout closes
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeHidden();

      // Review and submit the staged changes
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();
      // Search for the newly added field
      await pageObjects.streams.searchFields(dottedFieldName);

      // Verify the field was added successfully
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: dottedFieldName,
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'status',
        rowIndex: 0,
        value: 'Mapped',
      });
    });

    test('copy_to advanced parameter works', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // First, add a target field
      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const targetFieldName = 'grouped_fields';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(targetFieldName);
      await page.keyboard.press('Enter');
      await pageObjects.streams.setFieldMappingType('keyword');
      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();

      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();
      await pageObjects.toasts.closeAll();

      // Now add a source field with copy_to parameter
      await pageObjects.streams.expectSchemaEditorTableVisible();
      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const sourceFieldName = 'attributes.source_field';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(sourceFieldName);
      await page.keyboard.press('Enter');
      await pageObjects.streams.setFieldMappingType('keyword');

      // Expand advanced options and add copy_to
      const addAdvancedOptionsToggle = page.getByText('Advanced field mapping parameters');
      if (await addAdvancedOptionsToggle.isVisible()) {
        await addAdvancedOptionsToggle.click();
      }

      const advancedSettingsJsonContent = JSON.stringify({ copy_to: targetFieldName });
      await pageObjects.monacoEditor.setCodeEditorValue(advancedSettingsJsonContent);

      // Check if the add button is enabled (form should be valid)
      const addButton = page.getByTestId('streamsAppSchemaEditorAddFieldButton');
      await expect(addButton).toBeEnabled();

      await addButton.click();
      // Wait for flyout to close - it may take a moment after clicking Add
      await expect(page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')).toBeHidden({
        timeout: 15000,
      });

      // Review and submit the staged changes
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Verify the field was added with copy_to parameter
      await pageObjects.streams.searchFields(sourceFieldName);
      for (const exp of [
        { columnName: 'name', rowIndex: 0, value: sourceFieldName },
        { columnName: 'status', rowIndex: 0, value: 'Mapped' },
      ]) {
        await pageObjects.streams.expectCellValueContains(exp);
      }

      // Verify copy_to parameter was saved by opening the view flyout
      await pageObjects.streams.openFieldActionsMenu();
      await pageObjects.streams.clickFieldAction('View field');

      // Expand advanced options
      const editAdvancedOptionsToggle = page.getByText('Advanced field mapping parameters');
      if (await editAdvancedOptionsToggle.isVisible()) {
        await editAdvancedOptionsToggle.click();
      }

      // Get the code block value and verify it contains copy_to
      const codeValue = await pageObjects.codeBlock.getCodeValue({ locator: '.euiCodeBlock' });
      expect(codeValue).toContain('copy_to');
      expect(codeValue).toContain(targetFieldName);
    });
  }
);
