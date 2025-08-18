/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data processing - editing processors', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.enable();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
    await apiServices.streams.updateStreamProcessors('logs-generic-default', {
      steps: [{ action: 'grok', from: 'message', patterns: ['%{WORD:attributes.method}'] }],
    });

    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await logsSynthtraceEsClient.clean();
    await apiServices.streams.disable();
  });

  test('should edit an existing processor', async ({ page, pageObjects }) => {
    await expect(page.getByText('%{WORD:attributes.method}')).toBeVisible();
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.hostname}');
    await pageObjects.streams.clickSaveProcessor();
    await pageObjects.streams.saveProcessorsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    await expect(page.getByText('%{WORD:attributes.hostname}')).toBeVisible();
  });

  test('should not let edit other processors while one is in progress', async ({ pageObjects }) => {
    await pageObjects.streams.clickAddProcessor();
    await expect(await pageObjects.streams.getProcessorEditButton(0)).toBeDisabled();

    await pageObjects.streams.clickCancelProcessorChanges();
    await expect(await pageObjects.streams.getProcessorEditButton(0)).toBeEnabled();
  });

  test('should cancel editing a processor', async ({ page, pageObjects }) => {
    await expect(page.getByText('%{WORD:attributes.method}')).toBeVisible();
    await pageObjects.streams.clickEditProcessor(0);

    await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.hostname}');

    // Cancel the changes and confirm discard
    await pageObjects.streams.clickCancelProcessorChanges();
    await pageObjects.streams.confirmDiscardInModal();

    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    await expect(page.getByText('%{WORD:attributes.method}')).toBeVisible();
  });

  test('should remove a processor with confirmation', async ({ page, pageObjects }) => {
    await pageObjects.streams.removeProcessor(0);

    // Confirm deletion in modal
    await pageObjects.streams.confirmDeleteInModal();

    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(0);
    await expect(page.getByText('%{WORD:attributes.method}')).toBeHidden();
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
