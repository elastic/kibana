/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const CLASSIC_STREAM_NAME = 'logs-classic-test';

test.describe(
  'Stream data mapping - schema editor - Classic Streams',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Create a classic stream
      await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM_NAME });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();

      // Clear existing mappings before each test
      await apiServices.streams.clearStreamMappings(CLASSIC_STREAM_NAME);

      await pageObjects.streams.gotoSchemaEditorTab(CLASSIC_STREAM_NAME);
      await pageObjects.streams.verifyClassicBadge();
      await pageObjects.streams.expectSchemaEditorTableVisible();
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    test('read-only user cannot add/edit fields', async ({ page, browserAuth }) => {
      await browserAuth.loginAsViewer();
      await page.reload();

      // Verify "Add field" button is not visible for read-only user
      await expect(page.getByTestId('streamsAppContentAddFieldButton')).toBeHidden();

      // Verify field actions menu is not available (no actions button)
      await expect(page.getByTestId('streamsAppActionsButton')).toBeHidden();
    });

    test('copy_to advanced parameter works', async ({ page, pageObjects }) => {
      // First, add a target field
      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const targetFieldName = 'grouped_fields';
      await pageObjects.streams.typeFieldName(targetFieldName);
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
      await pageObjects.streams.typeFieldName(sourceFieldName);
      await pageObjects.streams.setFieldMappingType('keyword');

      // Expand advanced options and add copy_to
      const addAdvancedOptionsToggle = page.getByText('Advanced field mapping parameters');
      if (await addAdvancedOptionsToggle.isVisible()) {
        await addAdvancedOptionsToggle.click();
      }

      const advancedSettingsJsonContent = JSON.stringify({ copy_to: targetFieldName });
      await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue(advancedSettingsJsonContent);

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
      const codeValue = await pageObjects.streams.advancedSettingsCodeBlock.getCodeValue();
      expect(codeValue).toContain('copy_to');
      expect(codeValue).toContain(targetFieldName);
    });

    test('allows mapping a field as geo_point', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const fieldName = 'attributes.geo_test';
      await pageObjects.streams.typeFieldName(fieldName);
      await pageObjects.streams.setFieldMappingType('geo_point');

      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();

      await pageObjects.streams.searchFields(fieldName);
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: fieldName,
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'type',
        rowIndex: 0,
        value: 'geo_point',
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'status',
        rowIndex: 0,
        value: 'Mapped',
      });
    });
  }
);
