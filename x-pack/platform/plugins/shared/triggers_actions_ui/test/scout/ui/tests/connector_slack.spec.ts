/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../fixtures';

test.describe('Slack connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('shows Slack2 and hides the create-disabled Slack V1 cards', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));

    await page.testSubj.click('createConnectorButton');

    await expect(page.testSubj.locator('.slack2-card')).toBeVisible();
    await expect(page.testSubj.locator('.slack-card')).toBeHidden();
    await expect(page.testSubj.locator('.slack_api-card')).toBeHidden();
  });

  test('creates a Slack2 webhook connector via the UI', async ({ page, apiServices, kbnUrl }) => {
    const connectorName = `scout-slack2-${Date.now()}`;
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.locator('.slack2-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.slack2-card');

    // The connector form renders only after the action-type model resolves and
    // ConnectorForm lazy-loads its field chunk via Suspense. On a cold CI cache
    // that can exceed the default 10s fill timeout, so wait for nameInput first.
    const nameInput = page.testSubj.locator('nameInput');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(connectorName);
    await page.testSubj.locator('form-generator-field-secrets-webhook').click();
    await page.testSubj
      .locator('generator-field-secrets-webhookUrl')
      .fill('https://hooks.slack.com/services/test');

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    // Verify the connector appears in the list with type 'Slack'.
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(rows.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');

    // Track the connector for cleanup.
    const allConnectors = (await apiServices.alerting.connectors.getAll()) as Array<{
      id: string;
      name: string;
    }>;
    const created = allConnectors.find((c) => c.name === connectorName);
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });
});
