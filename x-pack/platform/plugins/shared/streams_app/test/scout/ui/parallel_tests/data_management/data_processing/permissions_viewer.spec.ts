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
  'Streams data processing permissions - viewer role (no simulate, no manage)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });

      // Set up state as admin once — not per test
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{WORD:attributes.method}'],
          },
          {
            condition: {
              field: 'test_field',
              contains: 'logs',
              steps: [
                {
                  action: 'grok',
                  from: 'message',
                  patterns: ['%{WORD:attributes.method}'],
                },
              ],
            },
          },
        ],
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should NOT allow viewer to add processors (requires simulate privilege)', async ({
      page,
    }) => {
      // Verify the "Create processor" button is not visible (requires simulate)
      const createProcessorButton = page.getByTestId(
        'streamsAppStreamDetailEnrichmentCreateProcessorButton'
      );
      await expect(createProcessorButton).toBeHidden();
    });

    test('should NOT allow viewer to edit existing processors (requires simulate privilege)', async ({
      pageObjects,
    }) => {
      // Verify processors are visible
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);

      // Verify edit button is disabled (requires simulate)
      const editButton = await pageObjects.streams.getProcessorEditButton(0);
      await expect(editButton).toBeDisabled();
    });

    test('should NOT allow viewer to duplicate processors (requires manage privilege)', async ({
      pageObjects,
    }) => {
      // Verify processors are visible
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);

      // Verify duplicate button is disabled (requires manage)
      const duplicateButton = await pageObjects.streams.getProcessorDuplicateButton(0);
      await expect(duplicateButton).toBeDisabled();
    });

    test('should NOT allow viewer to delete processors (requires manage privilege)', async ({
      page,
      pageObjects,
    }) => {
      // Verify processors are visible
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);

      // Try to access the context menu
      const processors = await pageObjects.streams.getProcessorsListItems();
      const targetProcessor = processors[0];
      await targetProcessor.getByRole('button', { name: 'Step context menu' }).click();

      // Verify delete option is disabled (requires manage)
      const deleteButton = page.getByTestId('stepContextMenuDeleteItem');
      await expect(deleteButton).toBeDisabled();
    });

    test('should NOT allow viewer to add conditions (requires simulate privilege)', async ({
      page,
    }) => {
      // Verify the create condition button is not visible (requires simulate)
      const createConditionButton = page.getByTestId(
        'streamsAppStreamDetailEnrichmentCreateConditionButton'
      );
      await expect(createConditionButton).toBeHidden();
    });

    test('should NOT show save changes button for viewer (requires manage privilege)', async ({
      page,
    }) => {
      // Save changes button should not be visible (requires manage)
      const saveButton = page.getByRole('button', { name: 'Save changes' });
      await expect(saveButton).toBeHidden();
    });

    test('should NOT allow viewer to edit existing conditions (requires simulate privilege)', async ({
      pageObjects,
    }) => {
      // Verify condition is visible
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify edit button is disabled (requires simulate)
      const editButton = await pageObjects.streams.getConditionEditButton(0);
      await expect(editButton).toBeDisabled();
    });

    test('should NOT allow viewer to delete conditions (requires manage privilege)', async ({
      page,
      pageObjects,
    }) => {
      // Verify condition is visible
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Click the condition's own context menu button (not nested processor buttons)
      const contextMenuButton = await pageObjects.streams.getConditionContextMenuButton(0);
      await contextMenuButton.click();

      // Verify delete option is disabled (requires manage)
      const deleteButton = page.getByTestId('stepContextMenuDeleteItem');
      await expect(deleteButton).toBeDisabled();
    });

    test('should NOT allow viewer to add nested steps to conditions (requires simulate privilege)', async ({
      pageObjects,
    }) => {
      // Verify condition is visible
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify the "Create nested step" button is disabled (requires simulate)
      const addNestedStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
      await expect(addNestedStepButton).toBeDisabled();
    });
  }
);
