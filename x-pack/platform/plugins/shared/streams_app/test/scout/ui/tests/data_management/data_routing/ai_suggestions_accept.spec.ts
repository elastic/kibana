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
  setupAiSuggestionsTest,
  setupTestPage,
  setupPartitionLogsInterceptor,
  generateSuggestions,
  getStreamName,
  openSuggestionConfirmationModal,
  clickModalCreateButton,
  clickModalCancelButton,
  MODAL_TEST_IDS,
  MOCK_SUGGESTION_INFO,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe('Stream data routing - AI suggestions accept flow', { tag: ['@ess'] }, () => {
  let llmSetup: LlmProxySetup;

  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
    await apiServices.streams.enable();
    await logsSynthtraceEsClient.clean();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });

    llmSetup = await setupLlmProxyAndConnector(log, apiServices);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await setupAiSuggestionsTest(
      page,
      llmSetup,
      [MOCK_SUGGESTION_INFO],
      browserAuth,
      pageObjects,
      DATE_RANGE
    );
  });

  test.afterEach(async ({ apiServices }) => {
    try {
      await apiServices.streams.clearStreamChildren('logs');
    } catch {
      // Ignore errors if stream doesn't exist
    }
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await cleanupLlmProxyAndConnector(llmSetup, apiServices);
    await logsSynthtraceEsClient.clean();
    await apiServices.streams.disable();
  });

  test('should open confirmation modal when accepting suggestion', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    await expect(modal.getByTestId('streamsAppCreateStreamConfirmationModalTitle')).toBeVisible();
  });

  test('should display correct stream name and condition in modal', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    const nameField = modal.getByTestId(MODAL_TEST_IDS.streamNameField);
    await expect(nameField).toHaveValue(streamName);

    const conditionField = modal.getByTestId('streamsAppConditionDisplayField');
    await expect(conditionField).toBeVisible();
    await expect(conditionField).toContainText('severity_text');
  });

  test('should cancel modal without creating stream', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    await clickModalCancelButton(modal);
    await expect(modal).toBeHidden();

    const routingRule = page.getByTestId(`routingRule-${streamName}`);
    await expect(routingRule).toBeHidden();
  });

  test('should create stream successfully when accepting', async ({ page, pageObjects }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    await clickModalCreateButton(modal);

    await pageObjects.toasts.waitFor();
    const toastText = await pageObjects.toasts.getHeaderText();
    expect(toastText).toContain('Stream saved');

    await pageObjects.streams.expectRoutingRuleVisible(streamName);
  });

  test('should reset form after accepting suggestion', async ({ page, pageObjects }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    await clickModalCreateButton(modal);

    await pageObjects.toasts.waitFor();
    await pageObjects.toasts.closeAll();

    await expect(page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout')).toBeHidden();
  });

  test('should prevent accepting suggestion with duplicate name', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.existing', {
      field: 'service.name',
      eq: 'existing-service',
    });

    const duplicateSuggestion = {
      name: 'existing',
      condition: { field: 'severity_text', eq: 'info' },
    };

    await page.reload();
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);

    await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
    setupPartitionLogsInterceptor(llmSetup.llmProxy, [duplicateSuggestion]);
    await generateSuggestions(page, llmSetup.llmProxy);

    const streamName = getStreamName(duplicateSuggestion.name);
    const modal = await openSuggestionConfirmationModal(page, streamName);

    const nameField = modal.getByTestId(MODAL_TEST_IDS.streamNameField);
    await expect(nameField).toHaveValue(streamName);

    await clickModalCreateButton(modal);

    await pageObjects.toasts.waitFor();
    const toastText = await pageObjects.toasts.getMessageText();
    expect(toastText).toBeTruthy();
  });
});
