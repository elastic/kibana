/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Streams data processing permissions - viewer with conditions (no simulate, no manage)',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      // Setup as admin first to create conditions
      await browserAuth.loginAsAdmin();
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
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

      // Now login as viewer for the actual test
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
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
