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
  setupPartitionLogsInterceptor,
  getStreamName,
  clickSuggestionPreviewButton,
  clickSuggestionEditButton,
  clickSuggestionRejectButton,
  MOCK_SUGGESTIONS_MULTIPLE,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe('Stream data routing - AI suggestions interactions', { tag: ['@ess'] }, () => {
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
      MOCK_SUGGESTIONS_MULTIPLE,
      browserAuth,
      pageObjects,
      DATE_RANGE
    );
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await cleanupLlmProxyAndConnector(llmSetup, apiServices);
    await logsSynthtraceEsClient.clean();
  });

  test('should preview suggestion', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    await clickSuggestionPreviewButton(page, streamName);

    await expect(page.getByTestId('streamsAppRoutingPreviewPanelWithResults')).toBeVisible();
  });

  test('should edit suggestion', async ({ page }) => {
    const streamName = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(MOCK_SUGGESTIONS_MULTIPLE[0].name);
  });

  test('should reject suggestion', async ({ page }) => {
    const streamName0 = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    const streamName1 = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[1].name);
    await clickSuggestionRejectButton(page, streamName0);

    await expect(page.getByText(streamName0)).toBeHidden();
    await expect(page.getByText(streamName1)).toBeVisible();
  });

  test('should regenerate suggestions', async ({ page }) => {
    llmSetup.llmProxy.clear();

    setupPartitionLogsInterceptor(
      llmSetup.llmProxy,
      MOCK_SUGGESTIONS_MULTIPLE,
      'partition_logs regenerate'
    );

    const regenerateButton = page
      .getByTestId('streamsAppGenerateSuggestionButton')
      .filter({ hasText: 'Regenerate' });
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();

    await llmSetup.llmProxy.waitForAllInterceptorsToHaveBeenCalled();

    await expect(page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout')).toBeVisible();
  });

  test('should update suggestion name when editing and accepting', async ({
    page,
    pageObjects,
  }) => {
    const originalStreamName = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    await clickSuggestionEditButton(page, originalStreamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    await pageObjects.streams.fillRoutingRuleName('debug');

    const acceptButton = page.getByTestId('streamsAppStreamDetailRoutingUpdateAndAcceptButton');
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();

    const modal = page.getByTestId('streamsAppCreateStreamConfirmationModal');
    await expect(modal).toBeVisible();

    const nameField = modal.getByTestId('streamsAppCreateStreamConfirmationModalStreamName');
    const updatedStreamName = getStreamName('debug');
    await expect(nameField).toHaveValue(updatedStreamName);

    await modal.getByTestId('streamsAppCreateStreamConfirmationModalCancelButton').click();
    await expect(modal).toBeHidden();

    await expect(page.getByTestId(`suggestionName-${updatedStreamName}`)).toBeVisible();
    await expect(page.getByTestId(`suggestionName-${originalStreamName}`)).toBeHidden();
  });

  test('should update suggestion condition when editing and accepting', async ({
    page,
    pageObjects,
  }) => {
    const streamName = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    await clickSuggestionEditButton(page, streamName);

    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      value: 'updated-service',
      operator: 'equals',
    });

    const acceptButton = page.getByTestId('streamsAppStreamDetailRoutingUpdateAndAcceptButton');
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();

    const modal = page.getByTestId('streamsAppCreateStreamConfirmationModal');
    await expect(modal).toBeVisible();

    const conditionField = modal.getByTestId('streamsAppConditionDisplayField');
    await expect(conditionField).toContainText('service.name');
    const conditionValue = modal.getByTestId('streamsAppConditionDisplayValue');
    await expect(conditionValue).toContainText('updated-service');

    await modal.getByTestId('streamsAppCreateStreamConfirmationModalCancelButton').click();
    await expect(modal).toBeHidden();

    const conditionPanel = page.getByTestId(`suggestionConditionPanel-${streamName}`);
    await expect(conditionPanel.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
  });

  test('should cancel editing and revert to original suggestion', async ({ page, pageObjects }) => {
    const streamName = getStreamName(MOCK_SUGGESTIONS_MULTIPLE[0].name);
    await clickSuggestionEditButton(page, streamName);

    const nameInput = page.getByTestId('streamsAppRoutingStreamEntryNameField');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('modified');
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      value: 'modified-service',
      operator: 'equals',
    });

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();

    await expect(nameInput).toBeHidden();

    await expect(page.getByTestId(`suggestionName-${streamName}`)).toBeVisible();
    const conditionPanel = page.getByTestId(`suggestionConditionPanel-${streamName}`);
    await expect(conditionPanel.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_text'
    );
  });
});
