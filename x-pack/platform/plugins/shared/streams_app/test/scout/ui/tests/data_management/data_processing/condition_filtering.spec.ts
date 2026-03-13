/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - condition filtering and match rate',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Generate logs with alternating log levels (50% info, 50% warn)
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

    test('should display condition match rate badge on WHERE blocks', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches approximately 50% of documents (log.level equals info)
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'info');
      await pageObjects.streams.clickSaveCondition();

      // Verify the condition was created
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify the match rate badge is displayed
      const matchRateBadge = page.getByTestId('streamsAppConditionMatchRateBadge');
      await expect(matchRateBadge).toBeVisible();

      // The badge should show approximately 50% (since half the logs are 'info')
      // We check it contains a percentage value
      await expect(matchRateBadge).toContainText('%');
    });

    test('should show 0% match rate when condition matches no documents', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches no documents
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'nonexistent_value');
      await pageObjects.streams.clickSaveCondition();

      // Verify the condition was created
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify the match rate badge shows 0%
      const matchRateBadge = page.getByTestId('streamsAppConditionMatchRateBadge');
      await expect(matchRateBadge).toBeVisible();
      await expect(matchRateBadge).toContainText('0%');
    });

    test('should show 100% match rate when condition matches all documents', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches all documents (service.name equals test-service)
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('service.name', 'equals', 'test-service');
      await pageObjects.streams.clickSaveCondition();

      // Verify the condition was created
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify the match rate badge shows 100%
      const matchRateBadge = page.getByTestId('streamsAppConditionMatchRateBadge');
      await expect(matchRateBadge).toBeVisible();
      await expect(matchRateBadge).toContainText('100%');
    });

    test('should show selected documents percentage when editing processor under a condition', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches approximately 50% of documents (log.level equals warn)
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'warn');
      await pageObjects.streams.clickSaveCondition();

      // Verify the condition was created
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Add a processor under the condition - this should auto-select the condition
      // and show the "Selected X%" indicator for condition-based document filtering
      const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
      await addStepButton.click();
      await pageObjects.streams.clickAddProcessor(false);

      // The "Selected" button should show approximately 50% since half the logs match the condition
      // This indicates that condition-based document filtering is active
      const selectedButton = page.getByRole('button', { name: /Selected.*%/ });
      await expect(selectedButton).toBeVisible();

      // The percentage should be approximately 50% (half documents match log.level = warn)
      await expect(selectedButton).toContainText('50%');
    });

    test('should maintain match rate badge after saving condition', async ({
      page,
      pageObjects,
    }) => {
      // Create and save a condition
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'info');
      await pageObjects.streams.clickSaveCondition();
      await pageObjects.streams.saveStepsListChanges();

      // Reload the page
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');

      // Verify the condition is still there
      expect(await pageObjects.streams.getConditionsListItems()).toHaveLength(1);

      // Verify the match rate badge is still displayed after reload
      const matchRateBadge = page.getByTestId('streamsAppConditionMatchRateBadge');
      await expect(matchRateBadge).toBeVisible();
      await expect(matchRateBadge).toContainText('%');
    });

    test('should show match rate badge for nested conditions', async ({ page, pageObjects }) => {
      // Create a parent condition
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'info');
      await pageObjects.streams.clickSaveCondition();

      // Add a nested condition under the parent
      const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
      await addStepButton.click();
      await pageObjects.streams.clickAddCondition(false);
      await pageObjects.streams.fillCondition('service.name', 'equals', 'test-service');
      await pageObjects.streams.clickSaveCondition();

      // Both conditions should have match rate badges
      const matchRateBadges = page.getByTestId('streamsAppConditionMatchRateBadge');
      await expect(matchRateBadges).toHaveCount(2);
    });
  }
);
