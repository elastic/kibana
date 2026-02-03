/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data processing - creating steps', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
    await apiServices.streams.clearStreamProcessors('logs-generic-default');

    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
    await logsSynthtraceEsClient.clean();
  });

  test('should create a new processor successfully', async ({ pageObjects }) => {
    await pageObjects.streams.clickAddProcessor();

    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();
    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
  });

  test('should create a new condition successfully', async ({ pageObjects }) => {
    await pageObjects.streams.clickAddCondition();
    await pageObjects.streams.fillCondition('test_field', 'contains', 'logs');
    await pageObjects.streams.clickSaveCondition();
    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);
  });

  test('should be able to nest steps under conditions', async ({ pageObjects }) => {
    // Create a condition first
    await pageObjects.streams.clickAddCondition();
    await pageObjects.streams.fillCondition('test_field', 'contains', 'logs');
    await pageObjects.streams.clickSaveCondition();
    expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

    // Add a processor under the condition
    const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
    await addStepButton.click();
    await pageObjects.streams.clickAddProcessor(false);
    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);

    // Check nesting
    const nestedSteps = await pageObjects.streams.getConditionNestedStepsList(0);
    expect(nestedSteps).toHaveLength(1);
  });

  test('should disable creating new processors while one is in progress', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();

    await expect(
      page.getByTestId('streamsAppStreamDetailEnrichmentCreateProcessorButton')
    ).toBeHidden();

    // Cancel the operation
    await pageObjects.streams.clickCancelProcessorChanges();

    // Verify we're back to idle state
    await expect(
      page.getByTestId('streamsAppStreamDetailEnrichmentCreateProcessorButton')
    ).toBeEnabled();
  });

  test('should disable saving the pipeline while one is in progress', async ({
    page,
    pageObjects,
  }) => {
    // Create a new processor ready to be saved
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();

    // Verify save button is enabled
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();

    await pageObjects.streams.clickEditProcessor(0);

    // Verify save button is disabled
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeHidden();
    await pageObjects.streams.clickCancelProcessorChanges();
    // Verify save button is enabled
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  test('should cancel creating a new processor', async ({ pageObjects }) => {
    await pageObjects.streams.clickAddProcessor();

    // Fill in some data
    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');

    // Cancel the changes and confirm discard
    await pageObjects.streams.clickCancelProcessorChanges();
    await pageObjects.streams.confirmDiscardInModal();

    // Verify we're back to idle state
    expect(await pageObjects.streams.getProcessorsListItemsFast()).toHaveLength(0);
  });

  test('should show validation errors for invalid processors configuration', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickAddProcessor();
    // Field can be automatically filled based on the samples, empty it.
    await pageObjects.streams.processorFieldComboBox.clear();

    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.clickSaveProcessor();
    await expect(page.getByText('Empty patterns are not allowed.')).toBeVisible();

    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
  });

  test('should handle insufficient privileges gracefully', async ({
    page,
    browserAuth,
    pageObjects,
  }) => {
    // Login as user with limited privileges
    await browserAuth.loginAsViewer();
    await pageObjects.streams.gotoProcessingTab('logs-generic-default');

    // Create buttons should be hidden for users without edit privileges
    const createProcessorButton = page.getByTestId(
      'streamsAppStreamDetailEnrichmentCreateProcessorButton'
    );
    await expect(createProcessorButton).toBeHidden();
  });

  test('should duplicate a processor', async ({ pageObjects }) => {
    await pageObjects.streams.clickAddProcessor();
    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.clickDuplicateProcessor(0);
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method2}');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);
  });

  test('should duplicate a processor under a condition', async ({ pageObjects }) => {
    // Create a condition first
    await pageObjects.streams.clickAddCondition();
    await pageObjects.streams.fillCondition('test_field', 'contains', 'logs');
    await pageObjects.streams.clickSaveCondition();
    expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

    // Add a processor under the condition
    const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
    await addStepButton.click();
    await pageObjects.streams.clickAddProcessor(false);
    await pageObjects.streams.fillProcessorFieldInput('message');
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
    await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
    await pageObjects.streams.clickSaveProcessor();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);

    await pageObjects.streams.clickDuplicateProcessor(0);
    await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method2}');
    await pageObjects.streams.clickSaveProcessor();

    await pageObjects.streams.saveStepsListChanges();
    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(2);
  });
});
