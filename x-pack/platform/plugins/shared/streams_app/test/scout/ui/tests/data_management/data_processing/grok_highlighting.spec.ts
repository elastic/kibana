/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data processing - grok highlighting', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
    await apiServices.streams.clearStreamProcessors('logs-generic-default');

    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    await pageObjects.streams.switchToColumnsView();
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
    await logsSynthtraceEsClient.clean();
  });

  // This test verifies the fix for https://github.com/elastic/streams-program/issues/555
  // Grok highlighting should appear even when the grok pattern extracts into the same field it reads from
  test('should display grok highlighting when pattern extracts into the same field it reads from (message → message)', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.fillProcessorFieldInput('message');

    // Use a grok pattern that extracts into the same field it reads from (message → message)
    // The generated log messages are in format: "2025-01-01T00:00:00.000Z main Test log message"
    // This pattern extracts the timestamp, module name, and puts the rest back into message
    await pageObjects.streams.fillGrokPatternInput(
      '%{TIMESTAMP_ISO8601:extracted_timestamp} %{WORD:module} %{GREEDYDATA:message}'
    );

    // Wait for the preview to update with grok highlighting
    // The grok highlighting is indicated by spans with 'grok-pattern-match' class
    const grokHighlightLocator = page.locator('.grok-pattern-match');

    // Verify that grok highlighting appears (the .grok-pattern-match class indicates active highlighting)
    // Multiple preview rows means multiple highlights - verify at least one is visible
    // Use toPass() for reliable waiting/retry
    await expect(async () => {
      const highlightCount = await grokHighlightLocator.count();
      expect(highlightCount).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });
  });

  test('should display grok highlighting for additive patterns (non-overwriting)', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.fillProcessorFieldInput('message');

    // Use a pattern that extracts into different fields (additive, not overwriting)
    // This should also show highlighting
    await pageObjects.streams.fillGrokPatternInput(
      '%{TIMESTAMP_ISO8601:extracted_timestamp} %{WORD:module}'
    );

    // Wait for the preview to update with grok highlighting
    const grokHighlightLocator = page.locator('.grok-pattern-match');

    // Verify that grok highlighting appears
    // Multiple preview rows means multiple highlights - verify at least one is visible
    // Use toPass() for reliable waiting/retry
    await expect(async () => {
      const highlightCount = await grokHighlightLocator.count();
      expect(highlightCount).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });
  });

  test('should use original field value for highlighting when pattern overwrites source field', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.fillProcessorFieldInput('message');

    // Use a pattern that extracts into the same field (message → message)
    await pageObjects.streams.fillGrokPatternInput(
      '%{TIMESTAMP_ISO8601:extracted_timestamp} %{WORD:module} %{GREEDYDATA:message}'
    );

    // Wait for highlighting to appear - poll until count is greater than 0
    const grokHighlightLocator = page.locator('.grok-pattern-match');
    await expect(async () => {
      const count = await grokHighlightLocator.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // The highlighted content should contain the original message value
    // (the full original "2025-01-01T00:00:00.000Z main Test log message")
    // and not just the transformed value ("Test log message")

    // Get the text content of the first highlighted element
    const highlightedElements = await grokHighlightLocator.all();
    const highlightedText = await highlightedElements[0].textContent();

    // The original message contains "main" and timestamp - if highlighting uses original value,
    // these should be visible in the highlighted content
    expect(highlightedText).toContain('main');
  });
});
