/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';
import {
  setupLlmProxyAndConnector,
  cleanupLlmProxyAndConnector,
  setupTestPage,
  setupPartitionLogsInterceptor,
  generateSuggestions,
  getStreamName,
  partitionLogsWhenCondition,
  expectErrorToast,
  MOCK_SUGGESTIONS_MULTIPLE,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe(
  'Stream data routing - AI suggestions generation',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let llmSetup: LlmProxySetup;

    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
      await apiServices.streams.enable();
      await logsSynthtraceEsClient.clean();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });

      llmSetup = await setupLlmProxyAndConnector(log, apiServices);
    });

    test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoPartitioningTab('logs');
      await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);

      await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await cleanupLlmProxyAndConnector(llmSetup, apiServices);
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('should successfully generate and display suggestions', async ({ page }) => {
      setupPartitionLogsInterceptor(llmSetup.llmProxy, MOCK_SUGGESTIONS_MULTIPLE);
      await generateSuggestions(page, llmSetup.llmProxy);

      for (const suggestion of MOCK_SUGGESTIONS_MULTIPLE) {
        const streamName = getStreamName(suggestion.name);
        await expect(page.getByTestId(`suggestionName-${streamName}`)).toBeVisible();
      }
    });

    test('should handle empty suggestions response', async ({ page }) => {
      setupPartitionLogsInterceptor(llmSetup.llmProxy, [], 'partition_logs with empty partitions');
      await generateSuggestions(page, llmSetup.llmProxy);

      const noSuggestionsCallout = page.getByTestId('streamsAppNoSuggestionsCallout');
      await expect(noSuggestionsCallout).toBeVisible();
    });

    test('should show error toast when API returns 500 error', async ({ page, pageObjects }) => {
      const simulatorPromise = llmSetup.llmProxy
        .intercept('partition_logs error', partitionLogsWhenCondition)
        .waitForIntercept();

      const button = page.getByTestId('streamsAppGenerateSuggestionButton');
      await expect(button).toBeEnabled();
      await button.click();

      const simulator = await simulatorPromise;
      await simulator.error({ message: 'Internal server error' });

      await expectErrorToast(pageObjects);
    });
  }
);
