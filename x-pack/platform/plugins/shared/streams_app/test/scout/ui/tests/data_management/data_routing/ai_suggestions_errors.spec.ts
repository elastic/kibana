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
  partitionLogsWhenCondition,
  expectErrorToast,
  generateSuggestions,
  MOCK_SUGGESTION_INFO,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe('Stream data routing - AI suggestions error handling', { tag: ['@ess'] }, () => {
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

  test('should show error toast when network fails during generation', async ({
    page,
    context,
    pageObjects,
  }) => {
    // Set offline before clicking generate
    await context.setOffline(true);

    const button = page.getByTestId('streamsAppGenerateSuggestionButton');
    await expect(button).toBeVisible();
    await button.click();

    await expectErrorToast(pageObjects);

    await context.setOffline(false);
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

  test('should handle invalid connector responses gracefully', async ({ page }) => {
    void llmSetup.llmProxy.interceptWithFunctionRequest({
      name: 'partition_logs',
      arguments: () => JSON.stringify({ invalid: 'response' }), // Invalid format
      when: partitionLogsWhenCondition,
      interceptorName: 'partition_logs with invalid response',
    });

    const button = page.getByTestId('streamsAppGenerateSuggestionButton');
    await expect(button).toBeEnabled();
    await button.click();

    await llmSetup.llmProxy.waitForAllInterceptorsToHaveBeenCalled();

    await expect(button).toBeEnabled();
  });

  test('should show no suggestions callout when response is empty', async ({ page }) => {
    setupPartitionLogsInterceptor(llmSetup.llmProxy, [], 'partition_logs with empty partitions');
    await generateSuggestions(page, llmSetup.llmProxy);

    const noSuggestionsCallout = page.getByTestId('streamsAppNoSuggestionsCallout');
    await expect(noSuggestionsCallout).toBeVisible();
  });

  test('should recover from error and retry successfully', async ({ page, pageObjects }) => {
    const errorSimulatorPromise = llmSetup.llmProxy
      .intercept('partition_logs error retry', partitionLogsWhenCondition)
      .waitForIntercept();

    const button = page.getByTestId('streamsAppGenerateSuggestionButton');
    await expect(button).toBeEnabled();
    await button.click();

    const errorSimulator = await errorSimulatorPromise;
    await errorSimulator.error({ message: 'Internal server error' });

    await expectErrorToast(pageObjects);
    await pageObjects.toasts.closeAll();

    llmSetup.llmProxy.clear();

    setupPartitionLogsInterceptor(
      llmSetup.llmProxy,
      [MOCK_SUGGESTION_INFO],
      'partition_logs retry success'
    );

    await generateSuggestions(page, llmSetup.llmProxy);
    await expect(page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout')).toBeVisible();
  });
});
