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

test.describe('Stream data processing - editing steps', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }, testInfo: TestInfo) => {
    // Generate unique stream name for this worker
    testStream = getUniqueClassicStreamName(testInfo, 'edit-steps');

    await generateLogsData(logsSynthtraceEsClient)({ index: testStream });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Set up processors for this worker's stream
    await apiServices.streams.updateStreamProcessors(testStream, {
      steps: [
        {
          condition: {
            field: 'test_field',
            contains: 'logs',
            steps: [{ action: 'grok', from: 'message', patterns: ['%{WORD:attributes.method}'] }],
          },
        },
      ],
    });

    await pageObjects.streams.gotoProcessingTab(testStream);
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await safeClearStreamProcessors(apiServices, testStream);
    await safeDeleteStream(apiServices, testStream);
    await logsSynthtraceEsClient.clean();
  });

  test('should edit an existing processor', async ({ page, pageObjects }) => {
    expect(await pageObjects.streams.getProcessorPatternText()).toBe('%{WORD:attributes.method}');
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.hostname}');
    await pageObjects.streams.clickSaveProcessor();
    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    await expect(page.getByText('%{WORD:attributes.hostname}')).toBeVisible();
  });

  test('should edit an existing condition', async ({ page, pageObjects }) => {
    await expect(page.getByTestId('streamsAppConditionBlock')).toBeVisible();
    await pageObjects.streams.clickEditCondition(0);

    await pageObjects.streams.fillCondition('test_field', 'contains', 'new_value_text');
    await pageObjects.streams.clickSaveCondition();
    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);
    await expect(page.getByText('new_value_text')).toBeVisible();
  });

  test('should not let other processors be edited while one is in progress', async ({
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await expect(await pageObjects.streams.getProcessorContextMenuButton(0)).toBeDisabled();

    await pageObjects.streams.clickCancelProcessorChanges();
    await expect(await pageObjects.streams.getProcessorContextMenuButton(0)).toBeEnabled();
  });

  test('should cancel editing a processor', async ({ pageObjects }) => {
    expect(await pageObjects.streams.getProcessorPatternText()).toBe('%{WORD:attributes.method}');
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.hostname}');

    // Cancel the changes and confirm discard
    await pageObjects.streams.clickCancelProcessorChanges();
    await pageObjects.streams.confirmDiscardInModal();

    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    expect(await pageObjects.streams.getProcessorPatternText()).toBe('%{WORD:attributes.method}');
  });

  test('should remove a processor with confirmation', async ({ page, pageObjects }) => {
    await pageObjects.streams.removeProcessor(0);

    // Confirm deletion in modal
    await pageObjects.streams.confirmDeleteInModal();

    expect(await pageObjects.streams.getProcessorsListItemsFast()).toHaveLength(0);
    await expect(page.getByTestId('fullText')).toBeHidden();
  });

  test('should cancel a processor removal', async ({ pageObjects }) => {
    await pageObjects.streams.removeProcessor(0);

    // Cancel deletion
    await pageObjects.streams.cancelDeleteInModal();

    // Verify processor still exists
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
  });

  test('should handle insufficient privileges gracefully', async ({ browserAuth, pageObjects }) => {
    // Login as user with limited privileges
    await browserAuth.loginAsViewer();
    await pageObjects.streams.gotoProcessingTab(testStream);

    // Edit button should be disabled or show tooltip
    await expect(await pageObjects.streams.getProcessorEditButton(0)).toBeDisabled();
  });
});
