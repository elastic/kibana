/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */
// The webhook header form renders an indexed list of identical
// `webhookHeaderPanel` rows where individual cells share their
// data-test-subj across rows; addressing row 0 vs row 1 by index is the only
// way to distinguish them.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';
const WEBHOOK_CONNECTOR_TYPE_ID = '.webhook';
const WEBHOOK_CARD_SUBJ = '.webhook-card';

const ACTIONS_TABLE_LOADED =
  '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)';
const SEARCH_INPUT = '[data-test-subj="actionsList"] .euiFieldSearch';

const CREATE_CONNECTOR_BUTTON = 'createConnectorButton';
const NAME_INPUT = 'nameInput';
const WEBHOOK_URL_INPUT = 'webhookUrlText';
const AUTH_NONE = 'authNone';
const AUTH_SSL = 'authSSL';
const VIEW_HEADERS_SWITCH = 'webhookViewHeadersSwitch';
const ADD_HEADER_BUTTON = 'webhookAddHeaderButton';
const HEADER_KEY_INPUT = 'webhookHeadersKeyInput';
const HEADER_VALUE_INPUT = 'webhookHeadersValueInput';
const HEADER_SECRET_VALUE_INPUT = 'webhookHeadersSecretValueInput';
const HEADER_TYPE_SELECT = 'webhookHeaderTypeSelect';
const SAVE_BUTTON = 'create-connector-flyout-save-btn';
const TOAST_TITLE = 'euiToastHeader__title';

const CERT_TABS = 'webhookCertTypeTabs';
const CERT_CR_TAB = 'webhookCertTypeCRTab';
const CERT_PFX_TAB = 'webhookCertTypePFXTab';

const CONNECTORS_ROW = 'connectors-row';
const CONNECTOR_NAME_CELL = 'connectorsTableCell-name';

test.describe('Webhook connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    // Don't wait for the actions table here — when there are no connectors,
    // the page renders the empty-state instead and the table is absent.
    // Tests that need the table wait for it after creating a connector.
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

    await page.testSubj.click(AUTH_NONE);
    await page.testSubj.locator(NAME_INPUT).fill(connectorName);
    await page.testSubj.locator(WEBHOOK_URL_INPUT).fill('https://www.example.com');

    await page.testSubj.click(VIEW_HEADERS_SWITCH);
    // After toggling, one default empty header row is present. Add a second.
    await page.testSubj.click(ADD_HEADER_BUTTON);

    const headerKeys = page.testSubj.locator(HEADER_KEY_INPUT);
    const headerValues = page.testSubj.locator(HEADER_VALUE_INPUT);
    const headerTypeSelects = page.testSubj.locator(HEADER_TYPE_SELECT);

    await expect(headerKeys).toHaveCount(2);
    await expect(headerValues).toHaveCount(2);
    await expect(headerTypeSelects).toHaveCount(2);

    // Config header (row 0)
    await headerKeys.nth(0).fill('config-key');
    await headerValues.nth(0).fill('config-value');

    // Secret header (row 1) — switch the second row's type to "secret".
    // EuiSuperSelectWrapper only accepts a CSS selector string, but the two
    // selects share the same data-test-subj across rows, so we open the
    // second one by index and click the `option-secret` listbox option
    // directly. The popover dismisses on selection because the listbox is
    // rendered in a portal at the document root rather than inside the
    // focus-trapped flyout body.
    await headerKeys.nth(1).fill('secret-key');
    await headerValues.nth(1).fill('secret-value');

    await headerTypeSelects.nth(1).click();
    await page.testSubj.click('option-secret');

    const saveButton = page.testSubj.locator(SAVE_BUTTON);
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(`Created '${connectorName}'`);

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

    await page.testSubj.click(AUTH_SSL);

    const tabs = page.testSubj.locator(CERT_TABS).locator('.euiTab');
    await expect(tabs).toHaveCount(2);
    await expect(page.testSubj.locator(CERT_CR_TAB)).toBeVisible();
    await expect(page.testSubj.locator(CERT_PFX_TAB)).toBeVisible();
  });

  test('displays headers as expected when the connector was created via API', async ({
    apiServices,
    page,
    kbnUrl,
  }) => {
    const connectorName = `scout-webhook-headers-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: WEBHOOK_CONNECTOR_TYPE_ID,
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

    // Re-load the list now that a new connector exists. The table only
    // renders when there's at least one connector — wait for it explicitly.
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(ACTIONS_TABLE_LOADED).waitFor();

    const searchBox = page.locator(SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(ACTIONS_TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator(CONNECTORS_ROW);
    await expect(rows).toHaveCount(1);

    // The cell is a button-link to open the edit flyout.
    await rows.getByTestId(CONNECTOR_NAME_CELL).locator('button').click();

    const headerKeys = page.testSubj.locator(HEADER_KEY_INPUT);
    await expect(headerKeys).toHaveCount(2);
    await expect(headerKeys.nth(0)).toHaveValue('configHeader');
    await expect(headerKeys.nth(1)).toHaveValue('secretHeader');

    // The config header value is shown verbatim; the secret header value is
    // intentionally blanked so the encrypted secret is never displayed.
    const configValue = page.testSubj.locator(HEADER_VALUE_INPUT);
    await expect(configValue).toHaveCount(1);
    await expect(configValue).toHaveValue('config-value');

    const secretValue = page.testSubj.locator(HEADER_SECRET_VALUE_INPUT);
    await expect(secretValue).toHaveCount(1);
    await expect(secretValue).toHaveValue('');
  });
});
