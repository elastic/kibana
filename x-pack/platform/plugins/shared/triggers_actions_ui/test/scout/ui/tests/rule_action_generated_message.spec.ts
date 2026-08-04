/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  defineIndexThresholdRule,
  THRESHOLD_TEST_INDEX,
  cancelRuleCreation,
} from '../fixtures';

/**
 * Verifies that useGeneratedActionMessage drives the email message textarea in
 * the fullscreen rule form:
 *   - template is written on mount (blank params → action template)
 *   - switching to "Summary of alerts" writes the summary template (blank for
 *     index-threshold, which has no defaultSummaryMessage)
 *   - switching back restores the per-alert template
 *   - a user-customized message is saved per group and restored on return
 */
test.describe(
  'Generated action message – fullscreen email journey',
  {
    tag: tags.stateful.classic,
  },
  () => {
    const createdConnectorIds: string[] = [];

    // Index-threshold defaultActionMessage contains this marker.
    const ACTION_TEMPLATE_MARKER = '{{rule.name}}';

    test.beforeAll(async ({ esClient }) => {
      await esClient.indices.create(
        {
          index: THRESHOLD_TEST_INDEX,
          mappings: { properties: { '@timestamp': { type: 'date' } } },
        },
        { ignore: [400] }
      );
      await esClient.index({
        index: THRESHOLD_TEST_INDEX,
        document: { '@timestamp': new Date().toISOString() },
      });
      await esClient.indices.refresh({ index: THRESHOLD_TEST_INDEX });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ page, apiServices }) => {
      await cancelRuleCreation(page);
      await Promise.allSettled(
        createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
      );
      createdConnectorIds.length = 0;
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: THRESHOLD_TEST_INDEX }, { ignore: [404] });
    });

    test('writes action template on mount and updates it when the alert group changes', async ({
      page,
      apiServices,
    }) => {
      const connectorName = `scout-gen-msg-${Date.now()}`;
      const { id: connectorId } = await apiServices.alerting.connectors.create({
        name: connectorName,
        connectorTypeId: '.email',
        config: { service: '__json', from: 'test@example.com', hasAuth: false },
        secrets: {},
      });
      createdConnectorIds.push(connectorId);

      await page.gotoApp('rules');
      await defineIndexThresholdRule(page, `scout-gen-msg-rule-${Date.now()}`);

      // Add the email action
      await page.testSubj.click('ruleActionsAddActionButton');
      await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
      await page.testSubj
        .locator('ruleActionsConnectorsModal')
        .getByRole('button', { name: connectorName })
        .click();

      // Hook should have seeded the message with the action template on mount.
      const messageTextArea = page.testSubj.locator('messageTextArea');
      await expect(messageTextArea).toBeVisible({ timeout: 10_000 });
      await expect(messageTextArea).toContainText(ACTION_TEMPLATE_MARKER);

      // Switch to "Summary of alerts".
      // summaryOrPerRuleSelect is a button that opens the context menu.
      const summarySelect = page.testSubj.locator('summaryOrPerRuleSelect');
      await summarySelect.scrollIntoViewIfNeeded();
      await summarySelect.click();
      await page.testSubj.locator('actionNotifyWhen-option-summary').click();

      // index-threshold has no defaultSummaryMessage; hook writes ''.
      await expect(messageTextArea).toHaveValue('', { timeout: 5_000 });

      // Switch back to "For each alert".
      await summarySelect.click();
      await page.testSubj.locator('actionNotifyWhen-option-for_each').click();

      // Per-alert template should be restored.
      await expect(messageTextArea).toContainText(ACTION_TEMPLATE_MARKER, { timeout: 5_000 });
    });

    test('preserves a user-customized message across group switches', async ({
      page,
      apiServices,
    }) => {
      const connectorName = `scout-gen-msg-custom-${Date.now()}`;
      const { id: connectorId } = await apiServices.alerting.connectors.create({
        name: connectorName,
        connectorTypeId: '.email',
        config: { service: '__json', from: 'test@example.com', hasAuth: false },
        secrets: {},
      });
      createdConnectorIds.push(connectorId);

      await page.gotoApp('rules');
      await defineIndexThresholdRule(page, `scout-gen-msg-custom-rule-${Date.now()}`);

      // Add the email action
      await page.testSubj.click('ruleActionsAddActionButton');
      await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
      await page.testSubj
        .locator('ruleActionsConnectorsModal')
        .getByRole('button', { name: connectorName })
        .click();

      const messageTextArea = page.testSubj.locator('messageTextArea');
      await expect(messageTextArea).toBeVisible({ timeout: 10_000 });

      // Replace the default template with a custom message.
      await messageTextArea.clear();
      await messageTextArea.fill('my-custom-per-alert-message');
      await expect(messageTextArea).toHaveValue('my-custom-per-alert-message');

      // Switch to "Summary of alerts".
      const summarySelect = page.testSubj.locator('summaryOrPerRuleSelect');
      await summarySelect.scrollIntoViewIfNeeded();
      await summarySelect.click();
      await page.testSubj.locator('actionNotifyWhen-option-summary').click();

      // Summary group gets a blank message (no template).
      await expect(messageTextArea).toHaveValue('', { timeout: 5_000 });

      // Switch back to "For each alert".
      await summarySelect.click();
      await page.testSubj.locator('actionNotifyWhen-option-for_each').click();

      // The custom message should be restored, not the template.
      await expect(messageTextArea).toHaveValue('my-custom-per-alert-message', { timeout: 5_000 });
    });
  }
);
