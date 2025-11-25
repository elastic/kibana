/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data mapping - schema editor - Wired Streams',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.enable();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a parent wired stream
      await apiServices.streams.forkStream('logs', 'logs.parent', {
        field: 'severity_text',
        eq: 'info',
      });
      // Create a child wired stream
      await apiServices.streams.forkStream('logs.parent', 'logs.parent.child', {
        field: 'service.name',
        eq: 'test-service',
      });

      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing mappings before each test
      await apiServices.streams.clearStreamMappings('logs.parent');
      await apiServices.streams.clearStreamMappings('logs.parent.child');

      await pageObjects.streams.gotoSchemaEditorTab('logs.parent.child');
      // Verify this is a wired stream (not classic)
      await pageObjects.streams.verifyWiredBadge();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('inherited fields display with parent links', async ({ page, pageObjects }) => {
      // First, map a field in the parent stream
      await pageObjects.streams.gotoSchemaEditorTab('logs.parent');
      await pageObjects.streams.expectSchemaEditorTableVisible();

      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const parentFieldName = 'attributes.parent_field';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(parentFieldName);
      await page.keyboard.press('Enter');
      await pageObjects.streams.setFieldMappingType('keyword');
      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();
      await pageObjects.toasts.closeAll();

      // Now check the child stream for inherited fields
      await pageObjects.streams.gotoSchemaEditorTab('logs.parent.child');
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Search for the inherited field
      await pageObjects.streams.searchFields(parentFieldName);

      // Verify the field is shown as inherited
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: parentFieldName,
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'status',
        rowIndex: 0,
        value: 'Inherited',
      });

      // Verify parent link is displayed
      await expect(page.getByTestId('streamsAppFieldParentLink')).toBeVisible();
      // The link text includes screen reader text, so use toContainText
      await expect(page.getByTestId('streamsAppFieldParentLink')).toContainText('logs.parent');
    });

    test('ECS/Otel type pre-selection for known fields', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Click the "Add field" button
      await page.getByTestId('streamsAppContentAddFieldButton').click();

      // Verify the add field flyout opens
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      // Add an Otel field that should have type recommendation (IP type)
      const ecsFieldName = 'resource.attributes.host.ip';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(ecsFieldName);
      await page.keyboard.press('Enter');

      // Wait a moment for ECS/Otel recommendation to load
      await page.waitForTimeout(500);

      // Check if IP type is pre-selected or recommended
      expect(await pageObjects.streams.fieldTypeSuperSelect.getSelectedValue()).toBe('ip');

      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeHidden();

      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();
      await pageObjects.streams.searchFields(ecsFieldName);

      // Verify the field was added with IP type
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: ecsFieldName,
      });
      await pageObjects.streams.expectCellValueContains({
        columnName: 'type',
        rowIndex: 0,
        value: 'ip',
      });
    });

    test('shows alias relationship in table', async ({ page, pageObjects }) => {
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Add an ECS field - this should automatically create an alias field
      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const ecsFieldName = 'attributes.process_id';
      const aliasFieldName = 'process_id';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(ecsFieldName);
      await page.keyboard.press('Enter');
      await pageObjects.streams.setFieldMappingType('keyword');

      // Check if the add button is enabled (form should be valid)
      const addButton = page.getByTestId('streamsAppSchemaEditorAddFieldButton');
      await expect(addButton).toBeEnabled();

      await addButton.click();
      // Wait for flyout to close - it may take a moment after clicking Add
      await expect(page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')).toBeHidden({
        timeout: 15000,
      });

      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();

      await pageObjects.toasts.closeAll();
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Verify the ECS field was created
      await pageObjects.streams.searchFields(ecsFieldName);
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: ecsFieldName,
      });

      // Verify the alias field was automatically created
      await pageObjects.streams.searchFields(aliasFieldName);
      await pageObjects.streams.expectCellValueContains({
        columnName: 'name',
        rowIndex: 0,
        value: aliasFieldName,
      });

      // Verify the Type column shows the alias relationship for the alias field
      await pageObjects.streams.expectCellValueContains({
        columnName: 'type',
        rowIndex: 1,
        value: `Alias for ${ecsFieldName}`,
      });
    });

    test('rows are shown in order with statuses filterable', async ({
      page,
      pageObjects,
      esClient,
    }) => {
      // Ingest a document with an unmapped field to logs.parent (condition severity_text='info' AND service.name='test-service')
      await esClient.index({
        index: 'logs',
        document: {
          '@timestamp': new Date().toISOString(),
          message: 'Test log message',
          severity_text: 'info',
          'service.name': 'test-service',
          'attributes.unmapped_field': 'test-value',
        },
      });
      await esClient.indices.refresh({ index: 'logs' });

      // First, map a field in the parent stream (will be inherited in child)
      await pageObjects.streams.gotoSchemaEditorTab('logs.parent');
      await pageObjects.streams.expectSchemaEditorTableVisible();

      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      const parentFieldName = 'attributes.parent_mapped_field';
      await page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName').click();
      await page.keyboard.type(parentFieldName);
      await page.keyboard.press('Enter');
      await pageObjects.streams.setFieldMappingType('keyword');
      await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();
      await pageObjects.streams.reviewStagedFieldMappingChanges();
      await pageObjects.streams.submitSchemaChanges();
      await pageObjects.toasts.closeAll();

      // Verify the table has mapped, inherited, and unmapped fields
      await pageObjects.streams.expectSchemaEditorTableVisible();

      // Get all rows to verify order
      const allRows = await pageObjects.streams.getPreviewTableRows();
      expect(allRows.length).toBeGreaterThan(0);

      // Find indices of different field types to verify order
      let mappedFieldIndex = -1;
      let inheritedFieldIndex = -1;
      let unmappedFieldIndex = -1;
      let unmanagedFieldIndex = -1;

      await pageObjects.streams.schemaDataGrid.processAllVirtualizedRows(async (row, rowIndex) => {
        const i = parseInt(rowIndex || '0', 10);
        const statusText = await row.locator('[data-gridcell-column-id="status"]').textContent();
        if (statusText?.startsWith('Mapped')) {
          mappedFieldIndex = i;
        } else if (statusText?.startsWith('Inherited')) {
          inheritedFieldIndex = i;
        } else if (statusText?.startsWith('Unmapped')) {
          unmappedFieldIndex = i;
        } else if (statusText?.startsWith('Unmanaged')) {
          unmanagedFieldIndex = i;
        }
      });

      // Filter out -1 and assert captured indices are in ascending order
      const validIndices = [
        mappedFieldIndex,
        inheritedFieldIndex,
        unmappedFieldIndex,
        unmanagedFieldIndex,
      ].filter((index) => index !== -1);
      for (let i = 0; i < validIndices.length - 1; i++) {
        expect(validIndices[i]).toBeLessThan(validIndices[i + 1]);
      }

      // Expect only those statuses that are present in the table
      const expectedFilterOptionsInOrder = [
        { text: 'Mapped', index: mappedFieldIndex },
        { text: 'Inherited', index: inheritedFieldIndex },
        { text: 'Unmapped', index: unmappedFieldIndex },
        { text: 'Unmanaged', index: unmanagedFieldIndex },
      ]
        .filter((option) => option.index !== -1)
        .map((option) => option.text);

      await pageObjects.streams.clickFieldStatusFilter();

      // Assert that the filter options have text content in the expected order
      const filterOptions = await pageObjects.streams.getFilterOptions();
      await expect(filterOptions).toHaveText(expectedFilterOptionsInOrder);

      // Close the filter dropdown
      await pageObjects.streams.clickFieldStatusFilter();
    });
  }
);
