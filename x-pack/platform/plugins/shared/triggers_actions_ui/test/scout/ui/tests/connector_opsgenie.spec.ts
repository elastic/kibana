/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/opsgenie.ts
//
// All 19 tests migrated. Nested describes are flattened (max describe depth = 1).
// `opsgenie-subActionSelect` and `opsgenie-prioritySelect` are native <select> elements.
// Monaco JSON editor is driven via MonacoEnvironment.monaco.editor API.

import { v4 as uuidv4 } from 'uuid';
import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  CONNECTORS_APP_PATH,
  CONNECTORS_LIST_SELECTORS,
  defineIndexThresholdRule,
  THRESHOLD_TEST_INDEX,
} from '../fixtures';

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: {
      editor?: {
        getModels: () => Array<{ getValue: () => string; setValue: (s: string) => void }>;
      };
    };
  };
}

const setMonacoValue = async (page: ScoutPage, value: string) => {
  await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
  await page.evaluate((v) => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    if (!editor) throw new Error('MonacoEnvironment.monaco.editor not available');
    editor.getModels().forEach((m) => m.setValue(v));
  }, value);
};

const getMonacoValue = async (page: ScoutPage): Promise<string> => {
  await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
  return page.evaluate(() => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    return editor?.getModels()?.[0]?.getValue() ?? '';
  });
};

const navigateToConnectors = async (page: ScoutPage, kbnUrl: { get: (p: string) => string }) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

const searchAndOpenConnector = async (page: ScoutPage, name: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  await searchBox.fill(name);
  await searchBox.press('Enter');
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
  await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();
};

const openOpsgenieTestTab = async (page: ScoutPage, connectorId: string) => {
  await page.testSubj.click(`edit${connectorId}`);
  await page.testSubj.click('testConnectorTab');
  await page.testSubj
    .locator('opsgenie-subActionSelect')
    .waitFor({ state: 'visible', timeout: 10_000 });
};

const closeFlyoutIfOpen = async (page: ScoutPage) => {
  const closeBtn = page.testSubj.locator('edit-connector-flyout-close-btn');
  if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeBtn.click();
    const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }
};

const cancelRuleCreation = async (page: ScoutPage) => {
  const cancelBtn = page.testSubj.locator('rulePageFooterCancelButton');
  if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cancelBtn.click();
    const confirmBtn = page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }
};

test.describe('Opsgenie connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  let testPageConnectorId: string;
  let alertsConnectorName: string;

  test.beforeAll(async ({ apiServices, esClient }) => {
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

    // Connector for test-page tests
    const testConnector = await apiServices.alerting.connectors.create({
      name: `opsgenie-test-page-${Date.now()}`,
      connectorTypeId: '.opsgenie',
      config: { apiUrl: 'https://test.opsgenie.com' },
      secrets: { apiKey: '1234' },
    });
    testPageConnectorId = testConnector.id;
    createdConnectorIds.push(testPageConnectorId);

    // Connector for alerts-page tests
    alertsConnectorName = `opsgenie-alerts-${Date.now()}`;
    const alertsConnector = await apiServices.alerting.connectors.create({
      name: alertsConnectorName,
      connectorTypeId: '.opsgenie',
      config: { apiUrl: 'https://test.opsgenie.com' },
      secrets: { apiKey: '1234' },
    });
    createdConnectorIds.push(alertsConnector.id);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    await cancelRuleCreation(page);
    await closeFlyoutIfOpen(page);
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
    await esClient.indices.delete({ index: THRESHOLD_TEST_INDEX }, { ignore: [404] });
  });

  // ── connector page ────────────────────────────────────────────────────────

  test('connector page - should create the connector', async ({ page, kbnUrl, apiServices }) => {
    await navigateToConnectors(page, kbnUrl);
    const connectorName = `opsgenie-create-${uuidv4().slice(0, 8)}`;

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.opsgenie-card');
    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('config\\.apiUrl-input').fill('https://test.opsgenie.com');
    await page.testSubj.locator('secrets\\.apiKey-input').fill('apiKey');
    await page
      .locator('[data-test-subj="create-connector-flyout-save-btn"]:not([disabled])')
      .click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    await page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT).fill(connectorName);
    await page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT).press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const row = page.testSubj.locator('connectors-row');
    await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Opsgenie');

    // Find and track created connector for cleanup
    const all = await apiServices.alerting.connectors.getAll();
    const created = (all as Array<{ id: string; name: string }>).find(
      (c) => c.name === connectorName
    );
    if (created) createdConnectorIds.push(created.id);
  });

  test('connector page - should edit the connector', async ({ page, kbnUrl, apiServices }) => {
    const connectorName = `opsgenie-edit-${Date.now()}`;
    const updatedName = `${connectorName}-updated`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.opsgenie',
      config: { apiUrl: 'https://test.opsgenie.com' },
      secrets: { apiKey: '1234' },
    });
    createdConnectorIds.push(created.id);
    await navigateToConnectors(page, kbnUrl);

    await searchAndOpenConnector(page, connectorName);
    await page.testSubj.locator('nameInput').fill(updatedName);
    await page.testSubj.locator('config\\.apiUrl-input').fill('https://test.opsgenie.com');
    await page.testSubj.locator('secrets\\.apiKey-input').fill('apiKey');
    await page.locator('[data-test-subj="edit-connector-flyout-save-btn"]:not([disabled])').click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Updated '${updatedName}'`
    );

    await page.testSubj.click('euiFlyoutCloseButton');

    await page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT).fill(updatedName);
    await page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT).press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
  });

  test('connector page - should reset connector when canceling an edit', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `opsgenie-cancel-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.opsgenie',
      config: { apiUrl: 'https://test.opsgenie.com' },
      secrets: { apiKey: '1234' },
    });
    createdConnectorIds.push(created.id);
    await navigateToConnectors(page, kbnUrl);

    await searchAndOpenConnector(page, connectorName);
    await page.testSubj.locator('nameInput').fill('some test name to cancel');
    await page.testSubj.click('edit-connector-flyout-close-btn');
    await page.testSubj.click('confirmModalConfirmButton');
    await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();

    await searchAndOpenConnector(page, connectorName);
    await expect(page.testSubj.locator('nameInput')).toHaveValue(connectorName);
    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('connector page - should disable the run button when the message field is not filled', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `opsgenie-disable-run-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.opsgenie',
      config: { apiUrl: 'https://test.opsgenie.com' },
      secrets: { apiKey: '1234' },
    });
    createdConnectorIds.push(created.id);
    await navigateToConnectors(page, kbnUrl);

    await searchAndOpenConnector(page, connectorName);
    await expect(page.testSubj.locator('nameInput')).toBeVisible();
    await page.locator('[data-test-subj="testConnectorTab"]').click();
    await page.testSubj.locator('executeActionButton').waitFor({ state: 'visible' });

    await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
  });

  // ── test page ─────────────────────────────────────────────────────────────

  test('page - should show the sub action selector when in test mode', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);
    await expect(page.testSubj.locator('opsgenie-subActionSelect')).toBeVisible();
  });

  test('page - should preserve the alias when switching between create and close alert actions', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.locator('aliasInput').fill('new alias');
    await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');

    await expect(page.testSubj.locator('opsgenie-subActionSelect')).toHaveValue('closeAlert');
    await expect(page.testSubj.locator('aliasInput')).toHaveValue('new alias');
  });

  test('page - should not preserve the message when switching to close alert and back to create alert', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.locator('messageInput').fill('a message');
    await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');
    await expect(page.testSubj.locator('messageInput')).toBeHidden();

    await page.testSubj.locator('opsgenie-subActionSelect').selectOption('createAlert');
    await expect(page.testSubj.locator('messageInput')).toBeVisible();
    await expect(page.testSubj.locator('messageInput')).toHaveValue('');
  });

  test('page - createAlert - should show the additional options when clicking more options', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.click('opsgenie-display-more-options');

    await expect(page.testSubj.locator('entityInput')).toBeVisible();
    await expect(page.testSubj.locator('sourceInput')).toBeVisible();
    await expect(page.testSubj.locator('userInput')).toBeVisible();
    await expect(page.testSubj.locator('noteTextArea')).toBeVisible();
  });

  test('page - createAlert - should show and then hide the additional form options when clicking the button twice', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.click('opsgenie-display-more-options');
    await expect(page.testSubj.locator('entityInput')).toBeVisible();

    await page.testSubj.click('opsgenie-display-more-options');
    await expect(page.testSubj.locator('entityInput')).toBeHidden();
  });

  test('page - createAlert - should populate the json editor with message, description, and alias', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.locator('messageInput').fill('a message');
    await page.testSubj.locator('descriptionTextArea').fill('a description');
    await page.testSubj.locator('aliasInput').fill('an alias');
    await page.testSubj.locator('opsgenie-prioritySelect').selectOption('P5');
    await page.testSubj.locator('opsgenie-tags').locator('input').fill('a tag');
    await page.testSubj.locator('opsgenie-tags').locator('input').press('Enter');

    await page.testSubj.click('opsgenie-show-json-editor-toggle');

    const raw = await getMonacoValue(page);
    const parsed = JSON.parse(raw);
    expect(parsed).toStrictEqual({
      message: 'a message',
      description: 'a description',
      alias: 'an alias',
      priority: 'P5',
      tags: ['a tag'],
    });
  });

  test('page - createAlert - should populate the form with values from the json editor', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.click('opsgenie-show-json-editor-toggle');
    await setMonacoValue(
      page,
      JSON.stringify({
        message: 'a message',
        description: 'a description',
        alias: 'an alias',
        priority: 'P3',
        tags: ['tag1'],
      })
    );
    await page.testSubj.click('opsgenie-show-json-editor-toggle');

    await expect(page.testSubj.locator('messageInput')).toHaveValue('a message');
    await expect(page.testSubj.locator('descriptionTextArea')).toHaveValue('a description');
    await expect(page.testSubj.locator('aliasInput')).toHaveValue('an alias');
    await expect(page.testSubj.locator('opsgenie-prioritySelect')).toHaveValue('P3');
    await expect(page.testSubj.locator('opsgenie-tags')).toContainText('tag1');
  });

  test('page - createAlert - should disable the run button when the json editor validation fails', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.click('opsgenie-show-json-editor-toggle');
    await setMonacoValue(page, JSON.stringify({ message: '' }));

    await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
  });

  test('page - closeAlert - should show the additional options for closing an alert when clicking more options', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');
    await page.testSubj.click('opsgenie-display-more-options');

    await expect(page.testSubj.locator('sourceInput')).toBeVisible();
    await expect(page.testSubj.locator('userInput')).toBeVisible();
  });

  test('page - closeAlert - should show and then hide the additional options when clicking the button twice', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    await openOpsgenieTestTab(page, testPageConnectorId);

    await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');
    await page.testSubj.click('opsgenie-display-more-options');
    await expect(page.testSubj.locator('sourceInput')).toBeVisible();

    await page.testSubj.click('opsgenie-display-more-options');
    await expect(page.testSubj.locator('sourceInput')).toBeHidden();
  });

  // ── alerts page ───────────────────────────────────────────────────────────

  test('alerts page - should default to the create alert action', async ({ page }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await expect(page.testSubj.locator('messageInput')).toBeVisible();
    await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
  });

  test('alerts page - should default to the close alert action when setting the run when to recovered', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
    await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

    await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
    await expect(page.testSubj.locator('noteTextArea')).toBeVisible();
    await expect(page.testSubj.locator('messageInput')).toBeHidden();
  });

  test('alerts page - should not preserve the alias when switching run when to recover', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await page.testSubj.locator('aliasInput').fill('an alias');

    await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
    await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

    await expect(page.testSubj.locator('messageInput')).toBeHidden();
    await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
  });

  test('alerts page - should not preserve the alias when switching run when to threshold met', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
    await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

    await expect(page.testSubj.locator('messageInput')).toBeHidden();
    await page.testSubj.locator('aliasInput').fill('an alias');

    await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
    await page.testSubj.click('addNewActionConnectorActionGroup-threshold met');

    await expect(page.testSubj.locator('messageInput')).toBeVisible();
    await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
  });

  test('alerts page - should show the message is required error when clicking the save button', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await expect(page.testSubj.locator('rulePageFooterSaveButton')).toBeDisabled();
  });
});
