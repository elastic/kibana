/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

// Note: Field mapping and unmapping API correctness (all field types, multiple fields, nested fields) is covered by
// API tests in x-pack/platform/plugins/shared/streams/test/scout/api/tests/schema_persistence.spec.ts
// These UI tests focus on the user experience: table display, search, filtering, flyout interactions, and staging changes
test.describe('Stream data mapping - schema editor', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
    // Create a test stream with routing rules first
    await apiServices.streams.forkStream('logs', 'logs.info', {
      field: 'severity_text',
      eq: 'info',
    });

    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing mappings before each test
    await apiServices.streams.clearStreamMappings('logs.info');

    await pageObjects.streams.gotoSchemaEditorTab('logs.info');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.clearStreamChildren('logs');
    await logsSynthtraceEsClient.clean();
  });

  test('should display a list of stream mappings', async ({ page, pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();

    // Verify the table has the expected columns
    await expect(page.getByRole('columnheader').getByText('Field', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader').getByText('Type', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader').getByText('Format', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader').getByText('Field Parent')).toBeVisible();
    await expect(
      page.getByRole('columnheader').getByText('Mapping status', { exact: true })
    ).toBeVisible();

    // Verify at least one field is displayed (fields from the stream setup)
    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should allow searching by field name', async ({ pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();

    // Search for a common field like '@timestamp'
    await pageObjects.streams.searchFields('@timestamp');

    // Verify the search filters the results
    const rows = await pageObjects.streams.getPreviewTableRows();
    expect(rows).toHaveLength(1);
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: '@timestamp',
    });

    // Clear the search and verify fields are shown again
    await pageObjects.streams.clearFieldSearch();
    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    expect(updatedRows.length).toBeGreaterThan(1);

    // Search for a field with multiple results like 'host'
    await pageObjects.streams.searchFields('host');

    // Verify the search filters the results
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.name',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 1,
      value: 'host',
    });
  });

  test('should allow filtering by field type and status', async ({ pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();

    // Test filtering by type
    await pageObjects.streams.clickFieldTypeFilter();
    await pageObjects.streams.selectFilterValue('Number');

    const numberRows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < numberRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'type',
        rowIndex,
        value: 'Number',
      });
    }

    await pageObjects.streams.selectFilterValue('Number'); // Deselect the filter
    await pageObjects.streams.clickFieldTypeFilter(); // Close the dropdown

    // Test filtering by status
    await pageObjects.streams.clickFieldStatusFilter();
    await pageObjects.streams.selectFilterValue('Inherited');
    await pageObjects.streams.clickFieldStatusFilter(); // Close the dropdown

    const mappedRows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < mappedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'status',
        rowIndex,
        value: 'Inherited',
      });
    }
  });

  test('should allow mapping a field', async ({ pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();
    // Search specific unmapped field
    await pageObjects.streams.searchFields('resource.attributes.host.ip');
    // Verify the field is unmapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.ip',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Unmapped',
    });

    // Open the field actions menu
    await pageObjects.streams.openFieldActionsMenu();
    await pageObjects.streams.clickFieldAction('Map field');

    // Verify the flyout opens and set field mapping type
    await pageObjects.streams.expectFieldFlyoutOpen();
    await pageObjects.streams.setFieldMappingType('ip');
    await pageObjects.streams.stageFieldMappingChanges();

    await pageObjects.streams.reviewStagedFieldMappingChanges();
    await pageObjects.streams.submitSchemaChanges();

    // Verify the field is now mapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.ip',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Mapped',
    });
  });

  test('should allow unmapping a field', async ({ pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();
    // Search specific unmapped field
    await pageObjects.streams.searchFields('resource.attributes.host.ip');
    // Verify the field is unmapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.ip',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Unmapped',
    });

    // Open the field actions menu
    await pageObjects.streams.openFieldActionsMenu();
    await pageObjects.streams.clickFieldAction('Map field');

    // Verify the flyout opens and set field mapping type
    await pageObjects.streams.expectFieldFlyoutOpen();
    await pageObjects.streams.setFieldMappingType('ip');
    await pageObjects.streams.stageFieldMappingChanges();

    await pageObjects.streams.reviewStagedFieldMappingChanges();
    await pageObjects.streams.submitSchemaChanges();
    await pageObjects.toasts.closeAll();

    // Verify the field is now mapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.ip',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Mapped',
    });

    // Now attempt to unmap the field
    await pageObjects.streams.unmapField();

    await pageObjects.streams.reviewStagedFieldMappingChanges();
    await pageObjects.streams.submitSchemaChanges();

    // Verify the field is now unmapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: 'resource.attributes.host.ip',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Unmapped',
    });
  });

  test('should allow manually adding a new field', async ({ page, pageObjects }) => {
    // Wait for the schema editor table to load
    await pageObjects.streams.expectSchemaEditorTableVisible();

    // Click the "Add field" button
    await page.getByTestId('streamsAppContentAddFieldButton').click();

    // Verify the add field flyout opens
    await expect(page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')).toBeVisible();

    // Fill in the field name
    const fieldName = 'attributes.id';
    await pageObjects.streams.typeFieldName(fieldName);
    // Select field type
    await pageObjects.streams.setFieldMappingType('keyword');

    // Click the "Add field" button in the flyout
    await page.getByTestId('streamsAppSchemaEditorAddFieldButton').click();

    // Verify the flyout closes
    await expect(page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')).toBeHidden();

    // Review and submit the staged changes
    await pageObjects.streams.reviewStagedFieldMappingChanges();
    await pageObjects.streams.submitSchemaChanges();

    await pageObjects.toasts.closeAll();
    await pageObjects.streams.expectSchemaEditorTableVisible();
    // Search for the newly added field
    await pageObjects.streams.searchFields(fieldName);

    // Verify the field was added and is mapped
    await pageObjects.streams.expectCellValueContains({
      columnName: 'name',
      rowIndex: 0,
      value: fieldName,
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'type',
      rowIndex: 0,
      value: 'keyword',
    });
    await pageObjects.streams.expectCellValueContains({
      columnName: 'status',
      rowIndex: 0,
      value: 'Mapped',
    });
  });
});
