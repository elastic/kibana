/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

// Note: Processor update and removal API correctness is covered by
// API tests in x-pack/platform/plugins/shared/streams/test/scout/api/tests/processing_persistence.spec.ts
// These UI tests focus on the user experience: cancel flows, confirmation modals, and permission handling
test.describe('Stream data processing - editing steps', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
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
                patterns: ['%{CUSTOM_WORD:attributes.method}'],
                pattern_definitions: { CUSTOM_WORD: '%{WORD}' },
              },
            ],
          },
        },
      ],
    });

    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
  });

  test.afterAll(async ({ logsSynthtraceEsClient }) => {
    await logsSynthtraceEsClient.clean();
  });

  test('should edit an existing processor', async ({ page, pageObjects }) => {
    expect(await pageObjects.streams.getProcessorPatternText()).toBe(
      '%{CUSTOM_WORD:attributes.method}'
    );
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.hostname}');
    await pageObjects.streams.clickSaveProcessor();
    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    await expect(page.getByText('%{CUSTOM_WORD:attributes.hostname}')).toBeVisible();
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
    expect(await pageObjects.streams.getProcessorPatternText()).toBe(
      '%{CUSTOM_WORD:attributes.method}'
    );
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.hostname}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');

    // Cancel the changes and confirm discard
    await pageObjects.streams.clickCancelProcessorChanges();
    await pageObjects.streams.confirmDiscardInModal();

    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    expect(await pageObjects.streams.getProcessorPatternText()).toBe(
      '%{CUSTOM_WORD:attributes.method}'
    );
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
    await pageObjects.streams.gotoProcessingTab('logs-generic-default');

    // Edit button should be disabled or show tooltip
    await expect(await pageObjects.streams.getProcessorEditButton(0)).toBeDisabled();
  });
});
