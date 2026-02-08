/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import {
  loadRule,
  cleanupRule,
  loadPack,
  cleanupPack,
  packFixture,
  multiQueryPackFixture,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'Alert Event Details - Response Actions Form',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    let multiQueryPackId: string;
    let multiQueryPackName: string;
    let ruleId: string;
    let ruleName: string;
    let packId: string;
    let packName: string;
    const packData = packFixture();
    const multiQueryPackData = multiQueryPackFixture();

    test.beforeEach(async ({ kbnClient }) => {
      const pack = await loadPack(kbnClient, packData);
      packId = pack.saved_object_id;
      packName = pack.name;

      const multiQueryPack = await loadPack(kbnClient, multiQueryPackData);
      multiQueryPackId = multiQueryPack.saved_object_id;
      multiQueryPackName = multiQueryPack.name;

      const rule = await loadRule(kbnClient);
      ruleId = rule.id;
      ruleName = rule.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      await cleanupPack(kbnClient, packId);
      await cleanupPack(kbnClient, multiQueryPackId);
      await cleanupRule(kbnClient, ruleId);
    });

    test('adds response actions with osquery with proper validation and form values', async ({
      browserAuth,
      page,
      kbnUrl,
    }) => {
      test.setTimeout(180_000); // Complex form test
      await browserAuth.loginWithCustomRole(socManagerRole);

      await page.goto(kbnUrl.get('/app/security/rules'));
      await waitForPageReady(page);
      await page.getByText(ruleName).first().click();
      await waitForPageReady(page);
      await page.testSubj.locator('editRuleSettingsLink').click();
      await waitForPageReady(page);
      await page.testSubj.locator('edit-rule-actions-tab').click();
      await waitForPageReady(page);

      await expect(
        page.getByText('Response actions are run on each rule execution.').first()
      ).toBeVisible();
      await page.testSubj.locator('Osquery-response-action-type-selection-option').click();

      // Check validation errors
      const errorsContainer = page.testSubj.locator('response-actions-error');
      await expect(errorsContainer.getByText('Query is a required field').first()).toBeVisible();
      await expect(
        errorsContainer.getByText('The timeout value must be 60 seconds or higher.')
      ).not.toBeVisible();

      // Test that changing one error doesn't clear others
      const responseAction0 = page.testSubj.locator('response-actions-list-item-0');
      await responseAction0.getByText('Advanced').click();
      const timeoutInput = responseAction0.locator('[data-test-subj="timeout-input"]');
      await timeoutInput.clear();
      await expect(
        errorsContainer.getByText('The timeout value must be 60 seconds or higher.')
      ).toBeVisible();
      await expect(errorsContainer.getByText('Query is a required field').first()).toBeVisible();

      await timeoutInput.fill('6');
      await expect(
        errorsContainer.getByText('The timeout value must be 60 seconds or higher.').first()
      ).toBeVisible();

      await timeoutInput.fill('66');
      await expect(
        errorsContainer.getByText('The timeout value must be 60 seconds or higher.')
      ).not.toBeVisible();
      await expect(errorsContainer.getByText('Query is a required field').first()).toBeVisible();

      // Fill in query
      await expect(responseAction0.getByText('Query is a required field').first()).toBeVisible();
      const queryEditor0 = responseAction0.locator('[data-test-subj="kibanaCodeEditor"]');
      await queryEditor0.click();
      await queryEditor0.pressSequentially('select * from uptime1');

      // Add second response action (pack)
      await page.testSubj.locator('Osquery-response-action-type-selection-option').click();
      const responseAction1 = page.testSubj.locator('response-actions-list-item-1');
      await responseAction1.getByText('Run a set of queries in a pack').click();
      await expect(errorsContainer.getByText('Pack is a required field').first()).toBeVisible();
      await expect(responseAction1.getByText('Pack is a required field').first()).toBeVisible();

      const packComboBox = responseAction1.locator('[data-test-subj="comboBoxInput"]');
      await packComboBox.click();
      await packComboBox.pressSequentially(packName);
      await expect(page.getByText(`doesn't match any options`).first()).not.toBeVisible();
      await page.getByRole('option', { name: packName }).click();

      // Add third response action (query with ECS mapping)
      await page.testSubj.locator('Osquery-response-action-type-selection-option').click();
      const responseAction2 = page.testSubj.locator('response-actions-list-item-2');
      await expect(responseAction2.getByText('Query is a required field').first()).toBeVisible();

      const queryEditor2 = responseAction2.locator('[data-test-subj="kibanaCodeEditor"]');
      await queryEditor2.click();
      await queryEditor2.pressSequentially('select * from uptime');
      await expect(
        responseAction2.getByText('Query is a required field').first()
      ).not.toBeVisible();

      await responseAction2.getByText('Advanced').click();
      const ecsFieldInput = responseAction2.locator('[data-test-subj="ECS-field-input"]');
      const ecsComboBox = ecsFieldInput.locator('[data-test-subj="comboBoxInput"]');
      await ecsComboBox.click();
      await page.waitForTimeout(500);
      await ecsComboBox.pressSequentially('labels', { delay: 100 });
      // The option accessible name is "Custom key/value pairs." so match by text content
      const labelOption = page.locator('[role="option"]').filter({ hasText: 'labels' }).first();
      await labelOption.waitFor({ state: 'visible', timeout: 15_000 });
      await labelOption.click();

      const osqueryColumnSelect = responseAction2.locator(
        '[data-test-subj="osqueryColumnValueSelect"]'
      );
      const columnComboBox = osqueryColumnSelect.locator('[data-test-subj="comboBoxInput"]');
      await columnComboBox.click();
      await page.waitForTimeout(1000);
      await columnComboBox.pressSequentially('days', { delay: 100 });
      // Wait for the option to appear and click it - use filter by text content since option name may differ
      const daysOption = page.locator('[role="option"]').filter({ hasText: 'days' }).first();
      await daysOption.waitFor({ state: 'visible', timeout: 15_000 });
      await daysOption.click();

      // Save rule
      await page.testSubj.locator('ruleEditSubmitButton').click();
      await expect(page.getByText(`${ruleName} was saved`).first()).toBeVisible();

      // Verify saved values
      await waitForPageReady(page);
      await page.testSubj.locator('editRuleSettingsLink').click();
      await waitForPageReady(page);
      await page.testSubj.locator('edit-rule-actions-tab').click();

      await expect(responseAction0.getByText('select * from uptime1')).toBeVisible();
      await expect(responseAction2.getByText('select * from uptime')).toBeVisible();
      await expect(
        responseAction2.getByText(
          'Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}'
        )
      ).toBeVisible();
      await expect(responseAction2.getByText('Days of uptime')).toBeVisible();

      // Change pack to empty and verify it becomes a query
      const packSearchInput = responseAction1.locator('[data-test-subj="comboBoxSearchInput"]');
      await expect(packSearchInput).toHaveValue(packName);
      await packComboBox.click();
      await packComboBox.press('ControlOrMeta+a');
      await packComboBox.press('Backspace');
      await packComboBox.press('Enter');

      // Remove first response action
      await responseAction0.locator('[data-test-subj="remove-response-action"]').click();

      // Verify responseAction1 is now the first item and is a pack
      const newResponseAction0 = page.testSubj.locator('response-actions-list-item-0');
      await newResponseAction0.locator('[data-test-subj="comboBoxSearchInput"]').click();
      await expect(page.getByText('Search for a pack to run').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await newResponseAction0.locator('[data-test-subj="comboBoxInput"]').click();
      await page.waitForTimeout(300);
      await newResponseAction0
        .locator('[data-test-subj="comboBoxInput"]')
        .pressSequentially(packName);
      await page.getByRole('option', { name: packName }).click();
      await expect(newResponseAction0.getByText(packName)).toBeVisible();

      // Verify responseAction2 is now responseAction1
      const newResponseAction1 = page.testSubj.locator('response-actions-list-item-1');
      await expect(newResponseAction1.getByText('select * from uptime')).toBeVisible();
      await expect(
        newResponseAction1.getByText(
          'Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}'
        )
      ).toBeVisible();
      await expect(newResponseAction1.getByText('Days of uptime')).toBeVisible();

      // Intercept save to verify payload
      const savePromise = page.waitForResponse(
        async (response) => {
          const url = response.url();
          const method = response.request().method();

          return url.includes('/api/detection_engine/rules') && method === 'PUT';
        },
        { timeout: 15_000 }
      );

      await page.testSubj.locator('ruleEditSubmitButton').click();
      const saveResponse = await savePromise;
      const requestBody = saveResponse.request().postDataJSON();

      const oneQuery = [
        {
          interval: 3600,
          query: 'select * from uptime;',
          id: Object.keys(packData.queries!)[0],
        },
      ];
      expect(requestBody.response_actions[0].params.queries).toStrictEqual(oneQuery);

      await expect(page.getByText(`${ruleName} was saved`).first()).toBeVisible();

      // Change pack to multi-query pack
      await waitForPageReady(page);
      await page.testSubj.locator('editRuleSettingsLink').click();
      await waitForPageReady(page);
      await page.testSubj.locator('edit-rule-actions-tab').click();

      const finalResponseAction0 = page.testSubj.locator('response-actions-list-item-0');
      await expect(
        finalResponseAction0.locator('[data-test-subj="comboBoxSearchInput"]')
      ).toHaveValue(packName);
      // Clear the current pack selection before typing the new one
      const finalPackComboBox = finalResponseAction0.locator('[data-test-subj="comboBoxInput"]');
      await finalPackComboBox.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);
      await finalPackComboBox.pressSequentially(multiQueryPackName);
      const multiPackOption = page.getByRole('option', { name: multiQueryPackName });
      await multiPackOption.waitFor({ state: 'visible', timeout: 15_000 });
      await multiPackOption.click();
      await expect(finalResponseAction0.getByText('SELECT * FROM memory_info;')).toBeVisible();
      await expect(finalResponseAction0.getByText('SELECT * FROM system_info;')).toBeVisible();

      const finalResponseAction1 = page.testSubj.locator('response-actions-list-item-1');
      await expect(finalResponseAction1.getByText('select * from uptime')).toBeVisible();
      await expect(
        finalResponseAction1.getByText(
          'Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}'
        )
      ).toBeVisible();
      await expect(finalResponseAction1.getByText('Days of uptime')).toBeVisible();

      // Intercept final save
      const finalSavePromise = page.waitForResponse(
        async (response) => {
          const url = response.url();
          const method = response.request().method();

          return url.includes('/api/detection_engine/rules') && method === 'PUT';
        },
        { timeout: 15_000 }
      );

      await page.getByText('Save changes').first().click();
      const finalResponse = await finalSavePromise;
      const finalRequestBody = finalResponse.request().postDataJSON();

      const threeQueries = [
        {
          interval: 3600,
          query: 'SELECT * FROM memory_info;',
          platform: 'linux',
          id: Object.keys(multiQueryPackData.queries!)[0],
        },
        {
          interval: 3600,
          query: 'SELECT * FROM system_info;',
          id: Object.keys(multiQueryPackData.queries!)[1],
        },
        {
          interval: 10,
          query: 'select opera_extensions.* from users join opera_extensions using (uid);',
          id: Object.keys(multiQueryPackData.queries!)[2],
        },
      ];
      expect(finalRequestBody.response_actions[0].params.queries).toStrictEqual(threeQueries);
    });
  }
);
