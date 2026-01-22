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
  clickSuggestionEditButton,
  MOCK_SUGGESTION_INFO,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe('Stream data routing - AI suggestions editing validation', { tag: ['@ess'] }, () => {
  let llmSetup: LlmProxySetup;

  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
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
  });

  test('should show error when editing suggestion with empty name', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    await nameInput.clear();

    await expect(page.getByText('Stream name is required', { exact: false })).toBeVisible();
  });

  test('should show error when editing suggestion with name containing dots', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('test.name');

    await expect(
      page.getByText('The child stream logs.test does not exist. Please create it first.', {
        exact: false,
      })
    ).toBeVisible();
  });

  test('should show error when editing suggestion with name exceeding max length', async ({
    page,
  }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    const longName = 'a'.repeat(200);
    await nameInput.fill(longName);

    await expect(
      page.getByText('Stream name cannot be longer than 200 characters', { exact: false })
    ).toBeVisible();
  });

  test('should show error when editing suggestion with duplicate name', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.existing', {
      field: 'service.name',
      eq: 'existing-service',
    });

    await page.reload();
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);

    await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
    setupPartitionLogsInterceptor(llmSetup.llmProxy, [MOCK_SUGGESTION_INFO]);
    await generateSuggestions(page, llmSetup.llmProxy);

    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('existing');

    await expect(
      page.getByText('A stream with this name already exists', { exact: false })
    ).toBeVisible();

    const acceptButton = page.getByTestId('streamsAppStreamDetailRoutingUpdateAndAcceptButton');
    await expect(acceptButton).toBeDisabled();
  });

  test('should allow editing suggestion with valid condition', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTION_INFO.name);
    await clickSuggestionEditButton(page, streamName);

    const conditionEditor = page.getByTestId('streamsAppConditionEditor');
    await expect(conditionEditor).toBeVisible();

    const errorText = page.getByText('Condition is required', { exact: false });
    await expect(errorText).toBeHidden();

    const acceptButton = page.getByTestId('streamsAppStreamDetailRoutingUpdateAndAcceptButton');
    await expect(acceptButton).toBeEnabled();
  });
});
