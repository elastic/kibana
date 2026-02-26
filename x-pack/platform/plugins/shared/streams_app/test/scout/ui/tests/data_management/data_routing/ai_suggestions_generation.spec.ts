/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';
import {
  setupLlmProxyAndConnector,
  cleanupLlmProxyAndConnector,
  setupTestPage,
  setupPartitionLogsInterceptor,
  getStreamName,
  MOCK_SUGGESTIONS_MULTIPLE,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe(
  'Stream data routing - AI suggestions generation',
  { tag: tags.stateful.classic },
  () => {
    let llmSetup: LlmProxySetup;

    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
      await logsSynthtraceEsClient.clean();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs.otel' });

      llmSetup = await setupLlmProxyAndConnector(log, apiServices);
    });

    test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoPartitioningTab('logs.otel');
      await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);

      await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await cleanupLlmProxyAndConnector(llmSetup, apiServices);
      await logsSynthtraceEsClient.clean();
    });

    test('should successfully generate and display suggestions', async ({ page }) => {
      setupPartitionLogsInterceptor(llmSetup.llmProxy, MOCK_SUGGESTIONS_MULTIPLE);

      // Click the generate button
      const button = page.getByTestId('streamsAppGenerateSuggestionButton');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.click();

      await llmSetup.llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for suggestions to appear
      const suggestionsCallout = page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout');
      await expect(suggestionsCallout).toBeVisible();

      for (const suggestion of MOCK_SUGGESTIONS_MULTIPLE) {
        const streamName = getStreamName(suggestion.name);
        await expect(page.getByTestId(`suggestionName-${streamName}`)).toBeVisible();
      }
    });

    test('should handle empty suggestions response', async ({ page }) => {
      setupPartitionLogsInterceptor(llmSetup.llmProxy, [], 'partition_logs with empty partitions');

      // Click the generate button
      const button = page.getByTestId('streamsAppGenerateSuggestionButton');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.click();

      await llmSetup.llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const noSuggestionsCallout = page.getByTestId('streamsAppNoSuggestionsCallout');
      await expect(noSuggestionsCallout).toBeVisible();
    });

    test('should not show background processing message during loading', async ({ page }) => {
      setupPartitionLogsInterceptor(llmSetup.llmProxy, MOCK_SUGGESTIONS_MULTIPLE);

      // Click the generate button
      const button = page.getByTestId('streamsAppGenerateSuggestionButton');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.click();

      // Wait for the loading prompt to appear
      const loadingPrompt = page.getByTestId('streamsAppPipelineSuggestionLoadingPrompt');
      await expect(loadingPrompt).toBeVisible();

      // Verify that the background processing message is NOT shown on the partitioning page
      // This message should only appear for processing steps, not for partitioning suggestions
      const backgroundMessage = page.getByText(
        "You don't need to stay on this page. The suggestion will be available when you return."
      );
      await expect(backgroundMessage).toHaveCount(0);

      await llmSetup.llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Wait for suggestions to appear (or no suggestions callout)
      const suggestionsCallout = page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout');
      const noSuggestionsCallout = page.getByTestId('streamsAppNoSuggestionsCallout');

      // Either one is acceptable - we're mainly testing the loading state behavior
      await Promise.race([
        suggestionsCallout.waitFor({ state: 'visible', timeout: 15000 }),
        noSuggestionsCallout.waitFor({ state: 'visible', timeout: 15000 }),
      ]);
    });
  }
);
