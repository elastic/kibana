/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
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
  toggleSuggestionCheckbox,
  isSuggestionCheckboxChecked,
  clickAcceptSelectedButton,
  openBulkAcceptModal,
  clickBulkModalCancelButton,
  MOCK_SUGGESTIONS_MULTIPLE,
  BULK_ACCEPT_BUTTON_TEST_ID,
  BULK_MODAL_TEST_IDS,
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

  test('should select multiple suggestions', async ({ page }) => {
    const suggestion0Name = MOCK_SUGGESTIONS_MULTIPLE[0].name;
    const suggestion1Name = MOCK_SUGGESTIONS_MULTIPLE[1].name;

    // Initially checkboxes should be unchecked
    expect(await isSuggestionCheckboxChecked(page, suggestion0Name)).toBe(false);
    expect(await isSuggestionCheckboxChecked(page, suggestion1Name)).toBe(false);

    // Accept Selected button should not be visible initially
    await expect(page.getByTestId(BULK_ACCEPT_BUTTON_TEST_ID)).toBeHidden();

    // Select first suggestion
    await toggleSuggestionCheckbox(page, suggestion0Name);
    expect(await isSuggestionCheckboxChecked(page, suggestion0Name)).toBe(true);

    // Accept Selected button should appear
    const acceptSelectedButton = page.getByTestId(BULK_ACCEPT_BUTTON_TEST_ID);
    await expect(acceptSelectedButton).toBeVisible();
    await expect(acceptSelectedButton).toContainText('Accept selected (1)');

    // Select second suggestion
    await toggleSuggestionCheckbox(page, suggestion1Name);
    expect(await isSuggestionCheckboxChecked(page, suggestion1Name)).toBe(true);

    // Button should update count
    await expect(acceptSelectedButton).toContainText('Accept selected (2)');
  });

  test('should deselect suggestions', async ({ page }) => {
    const suggestion0Name = MOCK_SUGGESTIONS_MULTIPLE[0].name;
    const suggestion1Name = MOCK_SUGGESTIONS_MULTIPLE[1].name;

    // Select both suggestions
    await toggleSuggestionCheckbox(page, suggestion0Name);
    await toggleSuggestionCheckbox(page, suggestion1Name);

    const acceptSelectedButton = page.getByTestId(BULK_ACCEPT_BUTTON_TEST_ID);
    await expect(acceptSelectedButton).toContainText('Accept selected (2)');

    // Deselect first suggestion
    await toggleSuggestionCheckbox(page, suggestion0Name);
    expect(await isSuggestionCheckboxChecked(page, suggestion0Name)).toBe(false);
    await expect(acceptSelectedButton).toContainText('Accept selected (1)');

    // Deselect second suggestion
    await toggleSuggestionCheckbox(page, suggestion1Name);
    expect(await isSuggestionCheckboxChecked(page, suggestion1Name)).toBe(false);

    // Accept Selected button should be hidden when nothing is selected
    await expect(acceptSelectedButton).toBeHidden();
  });

  test('should open bulk accept modal with selected suggestions', async ({ page }) => {
    const suggestion0Name = MOCK_SUGGESTIONS_MULTIPLE[0].name;
    const suggestion1Name = MOCK_SUGGESTIONS_MULTIPLE[1].name;

    // Open bulk modal with two suggestions selected
    const modal = await openBulkAcceptModal(page, [suggestion0Name, suggestion1Name]);

    // Verify modal content
    await expect(modal.getByTestId(BULK_MODAL_TEST_IDS.streamItem(suggestion0Name))).toBeVisible();
    await expect(modal.getByTestId(BULK_MODAL_TEST_IDS.streamItem(suggestion1Name))).toBeVisible();

    // Verify modal title shows correct count
    await expect(
      modal.getByTestId('streamsAppBulkCreateStreamsConfirmationModalTitle')
    ).toContainText('Create 2 streams');

    // Cancel and verify modal closes
    await clickBulkModalCancelButton(modal);
    await expect(modal).toBeHidden();
  });

  test('should cancel bulk accept and preserve selections', async ({ page }) => {
    const suggestion0Name = MOCK_SUGGESTIONS_MULTIPLE[0].name;
    const suggestion1Name = MOCK_SUGGESTIONS_MULTIPLE[1].name;

    // Select suggestions and open modal
    await toggleSuggestionCheckbox(page, suggestion0Name);
    await toggleSuggestionCheckbox(page, suggestion1Name);

    await clickAcceptSelectedButton(page);
    const modal = page.getByTestId(BULK_MODAL_TEST_IDS.modal);
    await expect(modal).toBeVisible();

    // Cancel
    await clickBulkModalCancelButton(modal);
    await expect(modal).toBeHidden();

    // Verify selections are preserved
    expect(await isSuggestionCheckboxChecked(page, suggestion0Name)).toBe(true);
    expect(await isSuggestionCheckboxChecked(page, suggestion1Name)).toBe(true);

    // Accept Selected button should still show correct count
    const acceptSelectedButton = page.getByTestId(BULK_ACCEPT_BUTTON_TEST_ID);
    await expect(acceptSelectedButton).toContainText('Accept selected (2)');
  });
});
