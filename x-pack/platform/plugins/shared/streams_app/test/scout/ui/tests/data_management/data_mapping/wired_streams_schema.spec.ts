/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data mapping - schema editor - Wired Streams',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
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

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects, page }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing mappings before each test
      await apiServices.streams.clearStreamMappings('logs.parent');
      await apiServices.streams.clearStreamMappings('logs.parent.child');

      await pageObjects.streams.gotoSchemaEditorTab('logs.parent.child');

      // Wait for the page to be fully loaded before checking for wired badge
      await page.locator('[data-test-subj="wiredStreamBadge"]').waitFor({
        state: 'visible',
        timeout: 30_000,
      });
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
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
      await pageObjects.streams.typeFieldName(parentFieldName);
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
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      // Add an Otel field that should have type recommendation (IP type)
      const ecsFieldName = 'resource.attributes.host.ip';
      await pageObjects.streams.typeFieldName(ecsFieldName);

      // Wait for ECS/Otel recommendation to load - the /fields_metadata call provides type hints
      // Give extra time for the API response to be processed and the UI to update
      await expect(pageObjects.streams.fieldTypeSuperSelect.valueInputLocator).toHaveValue('ip', {
        timeout: 30_000,
      });

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
      await pageObjects.streams.typeFieldName(ecsFieldName);
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
  }
);
