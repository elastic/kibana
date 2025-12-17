/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type TestInfo } from '@kbn/scout';
import {
  test,
  getUniqueClassicStreamName,
  safeDeleteStream,
  safeClearStreamProcessors,
} from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

// Store stream name for this worker
let testStream: string;

test.describe(
  'Streams data processing permissions - editor with conditions (no simulate, no manage)',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }, testInfo: TestInfo) => {
      // Generate unique stream name for this worker
      testStream = getUniqueClassicStreamName(testInfo, 'perms-editor-cond');

      await generateLogsData(logsSynthtraceEsClient)({ index: testStream });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      // Setup as admin first to create conditions
      await browserAuth.loginAsAdmin();
      await apiServices.streams.updateStreamProcessors(testStream, {
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

      // Now login as editor for the actual test
      await browserAuth.loginAs('editor');
      await pageObjects.streams.gotoProcessingTab(testStream);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await safeClearStreamProcessors(apiServices, testStream);
      await safeDeleteStream(apiServices, testStream);
      await logsSynthtraceEsClient.clean();
    });

    test('should NOT allow editor to edit existing conditions (requires simulate privilege)', async ({
      pageObjects,
    }) => {
      // Verify condition is visible
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify edit button is disabled (requires simulate)
      const editButton = await pageObjects.streams.getConditionEditButton(0);
      await expect(editButton).toBeDisabled();
    });

    test('should NOT allow editor to delete conditions (requires manage privilege)', async ({
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

    test('should NOT allow editor to add nested steps to conditions (requires simulate privilege)', async ({
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
