/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../fixtures';

const WEBHOOK_CARD_SUBJ = '.webhook-card';
const CREATE_CONNECTOR_BUTTON = 'createConnectorButton';
const HEADER_KEY_INPUT = 'webhookHeadersKeyInput';
const HEADER_VALUE_INPUT = 'webhookHeadersValueInput';
const getHeaderRow = (page: ScoutPage, index: number) =>
  page.testSubj.locator(`webhookHeaderRow-${index}`);

test.describe('Webhook connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('creates a connector with config and secret headers via the UI', async ({
    apiServices,
    page,
  }) => {
    const connectorName = `scout-webhook-${Date.now()}`;

    await page.testSubj.click(CREATE_CONNECTOR_BUTTON);
    await page.testSubj.click(WEBHOOK_CARD_SUBJ);

    await page.testSubj.click('authNone');
    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('webhookUrlText').fill('https://www.example.com');

    await page.testSubj.click('webhookViewHeadersSwitch');
    // After toggling, one default empty header row is present. Add a second.
    await page.testSubj.click('webhookAddHeaderButton');

    const configHeaderRow = getHeaderRow(page, 0);
    const secretHeaderRow = getHeaderRow(page, 1);

    await expect(configHeaderRow).toBeVisible();
    await expect(secretHeaderRow).toBeVisible();

    await configHeaderRow.getByTestId(HEADER_KEY_INPUT).fill('config-key');
    await configHeaderRow.getByTestId(HEADER_VALUE_INPUT).fill('config-value');

    await secretHeaderRow.getByTestId(HEADER_KEY_INPUT).fill('secret-key');
    await secretHeaderRow.getByTestId(HEADER_VALUE_INPUT).fill('secret-value');

    await secretHeaderRow.getByTestId('webhookHeaderTypeSelect').click();
    await page.testSubj.click('option-secret');

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    // Find the created connector via API for cleanup. The toast already
    // confirmed creation succeeded; the API call only retrieves the id.
    const allConnectors = (await apiServices.alerting.connectors.getAll()) as Array<{
      id: string;
      name: string;
    }>;
    const created = allConnectors.find((c) => c.name === connectorName);
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });

  test('renders CR and PFX tabs for SSL auth', async ({ page }) => {
    await page.testSubj.click(CREATE_CONNECTOR_BUTTON);
    await page.testSubj.click(WEBHOOK_CARD_SUBJ);

    await page.testSubj.click('authSSL');

    const tabs = page.testSubj.locator('webhookCertTypeTabs').locator('.euiTab');
    await expect(tabs).toHaveCount(2);
    await expect(page.testSubj.locator('webhookCertTypeCRTab')).toBeVisible();
    await expect(page.testSubj.locator('webhookCertTypePFXTab')).toBeVisible();
  });

  test('displays headers as expected when the connector was created via API', async ({
    apiServices,
    page,
    kbnUrl,
  }) => {
    const connectorName = `scout-webhook-headers-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.webhook',
      config: {
        method: 'post',
        hasAuth: false,
        authType: null,
        url: 'https://example.com/webhook',
        headers: { configHeader: 'config-value' },
      },
      secrets: {
        secretHeaders: { secretHeader: 'secretValue' },
      },
    });
    createdConnectorIds.push(created.id);

    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await expect(rows).toHaveCount(1);

    // The cell is a button-link to open the edit flyout.
    await rows.getByTestId('connectorsTableCell-name').locator('button').click();

    const configHeaderRow = getHeaderRow(page, 0);
    const secretHeaderRow = getHeaderRow(page, 1);
    await expect(configHeaderRow.getByTestId(HEADER_KEY_INPUT)).toHaveValue('configHeader');
    await expect(secretHeaderRow.getByTestId(HEADER_KEY_INPUT)).toHaveValue('secretHeader');

    await expect(configHeaderRow.getByTestId(HEADER_VALUE_INPUT)).toHaveValue('config-value');
    await expect(secretHeaderRow.getByTestId('webhookHeadersSecretValueInput')).toHaveValue('');
  });
});
