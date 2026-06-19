/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags, EuiComboBoxWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../fixtures';

const TINES_CONFIG = {
  url: 'https://test.tines.com',
  email: 'test@foo.com',
  token: 'apiToken',
};

// Mock story + webhook data mirroring what the Tines external-service simulator
// (tines_simulation.ts) returns. Used in the test-page tests below to avoid
// needing the FTR simulator plugin loaded in Scout's stateful/classic config.
const MOCK_STORY = { id: 1, name: 'story 1', published: true };
const MOCK_WEBHOOK = { id: 1, name: 'agent 1', storyId: 1 };

// Intercepts `/api/actions/connector/{id}/_execute` requests made by the
// test-connector tab and returns fake data so the story/webhook selectors
// populate without hitting the real Tines API.
const setupTinesMocks = async (page: ScoutPage, connectorId: string) => {
  await page.route('**/api/actions/connector/**/_execute', async (route) => {
    const body = route.request().postDataJSON() as { params?: { subAction?: string } } | undefined;
    const subAction = body?.params?.subAction;

    const baseResponse = { status: 'ok', connector_id: connectorId };

    if (subAction === 'stories') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseResponse,
          data: { stories: [MOCK_STORY], incompleteResponse: false },
        }),
      });
    } else if (subAction === 'webhooks') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseResponse,
          data: { webhooks: [MOCK_WEBHOOK], incompleteResponse: false },
        }),
      });
    } else if (subAction === 'run' || subAction === 'test') {
      // Test-page Run button uses SUB_ACTION.TEST; rule-action runtime uses
      // SUB_ACTION.RUN. Either way return a generic success payload.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...baseResponse, data: { status: 'ok' } }),
      });
    } else {
      await route.continue();
    }
  });
};

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: { editor?: { getModels: () => Array<{ setValue: (s: string) => void }> } };
  };
}

// Sets the JSON body field on the Tines test-connector tab via the Monaco
// model API. The field uses a Monaco editor, and `.fill()` on the textarea
// does not propagate to React state — same pattern as connector_jira.spec.ts.
const setTinesJsonBody = async (page: ScoutPage, value: object) => {
  await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
  await page.evaluate((v) => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    if (!editor) throw new Error('MonacoEnvironment.monaco.editor not available');
    editor.getModels().forEach((m) => m.setValue(v));
  }, JSON.stringify(value));
};

const fillTinesConnectorFields = async (
  page: ScoutPage,
  { name, url }: { name: string; url: string }
) => {
  await page.testSubj.locator('nameInput').fill(name);
  await page.testSubj.locator('config.url-input').fill(url);
  await page.testSubj.locator('secrets.email-input').fill(TINES_CONFIG.email);
  await page.testSubj.locator('secrets.token-input').fill(TINES_CONFIG.token);
};

const findConnectorIdByName = async (
  apiServices: { alerting: { connectors: { getAll: () => Promise<unknown> } } },
  name: string
): Promise<string | undefined> => {
  const all = (await apiServices.alerting.connectors.getAll()) as Array<{
    id: string;
    name: string;
  }>;
  return all.find((c) => c.name === name)?.id;
};

test.describe('Tines connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  // Connector shared across the test-page tests (created once in beforeAll).
  let testPageConnectorId: string;

  test.beforeAll(async ({ apiServices }) => {
    const created = await apiServices.alerting.connectors.create({
      name: `scout-tines-test-page-${Date.now()}`,
      connectorTypeId: '.tines',
      config: { url: TINES_CONFIG.url },
      secrets: { email: TINES_CONFIG.email, token: TINES_CONFIG.token },
    });
    testPageConnectorId = created.id;
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  });

  test.afterEach(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.connectors.delete(testPageConnectorId);
  });

  // ── Connector-page tests ──────────────────────────────────────────────────

  test('creates a Tines connector via the UI', async ({ page, apiServices }) => {
    const connectorName = `scout-tines-${Date.now()}`;

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.locator('.tines-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.tines-card');
    await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });
    await fillTinesConnectorFields(page, { name: connectorName, url: TINES_CONFIG.url });

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(rows.getByTestId('connectorsTableCell-actionType')).toContainText('Tines');

    const id = await findConnectorIdByName(apiServices, connectorName);
    expect(id).toBeDefined();
    createdConnectorIds.push(id!);
  });

  test('edits a Tines connector via the UI', async ({ page, apiServices, kbnUrl }) => {
    const connectorName = `scout-tines-edit-${Date.now()}`;
    const updatedConnectorName = `${connectorName}-updated`;

    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.tines',
      config: { url: TINES_CONFIG.url },
      secrets: { email: TINES_CONFIG.email, token: TINES_CONFIG.token },
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
    await rows.getByTestId('connectorsTableCell-name').locator('button').click();

    await fillTinesConnectorFields(page, { name: updatedConnectorName, url: TINES_CONFIG.url });

    const editSaveButton = page.testSubj.locator('edit-connector-flyout-save-btn');
    await expect(editSaveButton).toBeEnabled();
    await editSaveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Updated '${updatedConnectorName}'`
    );

    // Close the flyout and verify the updated name appears in the list.
    await page.testSubj.click('euiFlyoutCloseButton');
    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toBeHidden();

    await searchBox.fill(updatedConnectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId('connectorsTableCell-name')).toContainText(updatedConnectorName);
    await expect(rows.getByTestId('connectorsTableCell-actionType')).toContainText('Tines');
  });

  test('resets the connector form when an edit is canceled', async ({
    page,
    apiServices,
    kbnUrl,
  }) => {
    const connectorName = `scout-tines-cancel-${Date.now()}`;

    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.tines',
      config: { url: TINES_CONFIG.url },
      secrets: { email: TINES_CONFIG.email, token: TINES_CONFIG.token },
    });
    createdConnectorIds.push(created.id);

    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await rows.getByTestId('connectorsTableCell-name').locator('button').click();

    await page.testSubj.locator('nameInput').fill('some test name to cancel');
    await page.testSubj.click('edit-connector-flyout-close-btn');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();

    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await rows.getByTestId('connectorsTableCell-name').locator('button').click();

    await expect(page.testSubj.locator('nameInput')).toHaveValue(connectorName);
  });

  test('disables the Run button when the test-connector fields are empty', async ({
    page,
    apiServices,
    kbnUrl,
  }) => {
    const connectorName = `scout-tines-run-${Date.now()}`;

    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.tines',
      config: { url: TINES_CONFIG.url },
      secrets: { email: TINES_CONFIG.email, token: TINES_CONFIG.token },
    });
    createdConnectorIds.push(created.id);

    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await rows.getByTestId('connectorsTableCell-name').locator('button').click();

    await page.testSubj.click('testConnectorTab');
    await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
  });

  // ── Test-page tests (use page.route to mock the Tines API) ────────────────

  test('shows the story/webhook selectors and JSON editor on the test tab', async ({
    page,
    kbnUrl,
  }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    await expect(page.testSubj.locator('tines-storySelector')).toBeVisible();
    await expect(page.testSubj.locator('tines-webhookSelector')).toBeVisible();
    await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
  });

  test('enables the story selector once stories are loaded', async ({ page, kbnUrl }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    // Story selector becomes enabled once the mocked /stories response lands.
    await expect(page.testSubj.locator('tines-storySelector')).toBeEnabled({ timeout: 20_000 });
    // Webhook selector stays disabled until a story is selected. EuiComboBox
    // renders as a <div>, so toBeDisabled() doesn't apply — assert the
    // is-disabled class instead.
    await expect(page.testSubj.locator('tines-webhookSelector')).toHaveClass(
      /euiComboBox-isDisabled/
    );
  });

  test('enables the webhook selector after a story is selected', async ({ page, kbnUrl }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    await expect(page.testSubj.locator('tines-storySelector')).toBeEnabled({ timeout: 20_000 });
    await new EuiComboBoxWrapper(page, 'tines-storySelector').selectSingleOption(MOCK_STORY.name);

    await expect(page.testSubj.locator('tines-webhookSelector')).toBeEnabled();
  });

  test('clears and disables the webhook selector when the selected story is cleared', async ({
    page,
    kbnUrl,
  }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    const storyCombo = new EuiComboBoxWrapper(page, 'tines-storySelector');
    const webhookCombo = new EuiComboBoxWrapper(page, 'tines-webhookSelector');

    await expect(page.testSubj.locator('tines-storySelector')).toBeEnabled({ timeout: 20_000 });
    await storyCombo.selectSingleOption(MOCK_STORY.name);
    await expect(page.testSubj.locator('tines-webhookSelector')).toBeEnabled();
    await webhookCombo.selectSingleOption(MOCK_WEBHOOK.name);
    expect(await webhookCombo.getSelectedValue()).toContain(MOCK_WEBHOOK.name);

    // Clear the story — the webhook selector should be disabled and emptied.
    await storyCombo.clear();
    await expect(page.testSubj.locator('tines-webhookSelector')).toHaveClass(
      /euiComboBox-isDisabled/
    );
    expect(await webhookCombo.getSelectedValue()).toBe('');
  });

  test('keeps the Run button disabled when story+webhook are set but JSON is missing', async ({
    page,
    kbnUrl,
  }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    await expect(page.testSubj.locator('tines-storySelector')).toBeEnabled({ timeout: 20_000 });
    await new EuiComboBoxWrapper(page, 'tines-storySelector').selectSingleOption(MOCK_STORY.name);
    await expect(page.testSubj.locator('tines-webhookSelector')).toBeEnabled();
    await new EuiComboBoxWrapper(page, 'tines-webhookSelector').selectSingleOption(
      MOCK_WEBHOOK.name
    );

    // Story + webhook are filled but JSON body is still empty.
    await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
  });

  test('enables the Run button and executes successfully with story, webhook, and JSON filled', async ({
    page,
    kbnUrl,
  }) => {
    await setupTinesMocks(page, testPageConnectorId);
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await page.testSubj.click(`edit${testPageConnectorId}`);
    await expect(page.testSubj.locator('edit-connector-flyout')).toBeVisible();
    await page.testSubj.click('testConnectorTab');

    await expect(page.testSubj.locator('tines-storySelector')).toBeEnabled({ timeout: 20_000 });
    await new EuiComboBoxWrapper(page, 'tines-storySelector').selectSingleOption(MOCK_STORY.name);
    await expect(page.testSubj.locator('tines-webhookSelector')).toBeEnabled();
    await new EuiComboBoxWrapper(page, 'tines-webhookSelector').selectSingleOption(
      MOCK_WEBHOOK.name
    );
    await setTinesJsonBody(page, { hello: 'tines' });

    await expect(page.testSubj.locator('executeActionButton')).toBeEnabled();
    await page.testSubj.click('executeActionButton');

    await expect(page.testSubj.locator('executionSuccessfulResult')).toBeVisible();
  });
});
