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
  'Streams data processing permissions - editor role (no simulate, no manage)',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      // Setup as admin first to create processors
      await browserAuth.loginAsAdmin();
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{WORD:attributes.method}'],
          },
          {
            action: 'set',
            to: 'test_field',
            value: 'test_value',
          },
        ],
      });

      // Now login as editor for the actual test
      await browserAuth.loginAs('editor');
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    test('should NOT allow editor to add processors (requires simulate privilege)', async ({
      page,
    }) => {
      // Verify the "Create processor" button is not visible (requires simulate)
      const createProcessorButton = page.getByTestId(
        'streamsAppStreamDetailEnrichmentCreateProcessorButton'
      );
      await expect(createProcessorButton).toBeHidden();
    });

    test('should NOT allow editor to edit existing processors (requires simulate privilege)', async ({
      pageObjects,
    }) => {
      // Verify processors are visible
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);

      // Verify edit button is disabled (requires simulate)
      const editButton = await pageObjects.streams.getProcessorEditButton(0);
      await expect(editButton).toBeDisabled();
    });

    test('should NOT allow editor to duplicate processors (requires manage privilege)', async ({
      pageObjects,
    }) => {
      // Verify processors are visible
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);

      // Verify duplicate button is disabled (requires manage)
      const duplicateButton = await pageObjects.streams.getProcessorDuplicateButton(0);
      await expect(duplicateButton).toBeDisabled();
    });

    test('should NOT allow editor to delete processors (requires manage privilege)', async ({
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

    test('should NOT show save changes button for editor (requires manage privilege)', async ({
      page,
    }) => {
      // Save changes button should not be visible (requires manage)
      const saveButton = page.getByRole('button', { name: 'Save changes' });
      await expect(saveButton).toBeHidden();
    });
  }
);
