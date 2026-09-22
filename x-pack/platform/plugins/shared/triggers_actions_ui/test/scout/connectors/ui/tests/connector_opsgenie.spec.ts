/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  CONNECTORS_ROLE,
  defineIndexThresholdRule,
  THRESHOLD_TEST_INDEX,
  setMonacoValue,
  getMonacoValue,
  navigateToConnectors,
  searchConnectors,
  openConnectorFlyout,
  searchAndOpenConnector,
  closeFlyoutIfOpen,
  cancelRuleCreation,
} from '../fixtures';

// Per-spec index so opsgenie and jsm never share/delete the same ES index.
const THRESHOLD_INDEX = `${THRESHOLD_TEST_INDEX}-opsgenie`;

const openOpsgenieTestTab = async (page: ScoutPage, connectorId: string, connectorName: string) => {
  await searchConnectors(page, connectorName);
  await page.testSubj.click(`edit${connectorId}`);
  await page.testSubj.click('testConnectorTab');
  await page.testSubj.locator('opsgenie-subActionSelect').waitFor({ state: 'visible' });
};

test.describe('Opsgenie connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  let testPageConnectorId: string;
  let testPageConnectorName: string;
  let alertsConnectorName: string;

  test.beforeAll(async ({ apiServices, esClient }) => {
    await esClient.indices.create(
      {
        index: THRESHOLD_INDEX,
        mappings: { properties: { '@timestamp': { type: 'date' } } },
      },
      { ignore: [400] }
    );
    await esClient.index({
      index: THRESHOLD_INDEX,
      document: { '@timestamp': new Date().toISOString() },
    });
    await esClient.indices.refresh({ index: THRESHOLD_INDEX });

    // Connector for test-page tests
    testPageConnectorName = `opsgenie-test-page-${Date.now()}`;
    const testConnector = await apiServices.alerting.connectors.create({
      name: testPageConnectorName,
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
    await browserAuth.loginWithCustomRole(CONNECTORS_ROLE);
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
    await esClient.indices.delete({ index: THRESHOLD_INDEX }, { ignore: [404] });
  });

  // ── connector page ────────────────────────────────────────────────────────

  test('connector page - should create the connector', async ({ page, kbnUrl, apiServices }) => {
    await navigateToConnectors(page, kbnUrl);
    const connectorName = `opsgenie-create-${uuidv4().slice(0, 8)}`;

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.locator('.opsgenie-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.opsgenie-card');
    await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });
    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('config\\.apiUrl-input').fill('https://test.opsgenie.com');
    await page.testSubj.locator('secrets\\.apiKey-input').fill('apiKey');
    await expect(page.testSubj.locator('create-connector-flyout-save-btn')).toBeEnabled();
    await page.testSubj.click('create-connector-flyout-save-btn');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    await searchConnectors(page, connectorName);

    const row = page.testSubj.locator('connectors-row');
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Opsgenie');

    const all = await apiServices.alerting.connectors.getAll();
    const created = (all as Array<{ id: string; name: string }>).find(
      (c) => c.name === connectorName
    );
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });

  test('connector page - edits, cancels, and disables run on existing connectors', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    await test.step('should edit the connector', async () => {
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

      await searchConnectors(page, connectorName);
      await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
      await openConnectorFlyout(page);
      await page.testSubj.locator('nameInput').fill(updatedName);
      await page.testSubj.locator('config\\.apiUrl-input').fill('https://test.opsgenie.com');
      await page.testSubj.locator('secrets\\.apiKey-input').fill('apiKey');
      await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toBeEnabled();
      await page.testSubj.click('edit-connector-flyout-save-btn');

      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Updated '${updatedName}'`
      );

      await page.testSubj.click('euiFlyoutCloseButton');

      await searchConnectors(page, updatedName);
      const editedRow = page.testSubj.locator('connectors-row');
      await expect(editedRow).toHaveCount(1);
      await expect(editedRow.getByTestId('connectorsTableCell-name')).toContainText(updatedName);
      await expect(editedRow.getByTestId('connectorsTableCell-actionType')).toContainText(
        'Opsgenie'
      );
    });

    await test.step('should reset connector when canceling an edit', async () => {
      const connectorName = `opsgenie-cancel-${Date.now()}`;
      const created = await apiServices.alerting.connectors.create({
        name: connectorName,
        connectorTypeId: '.opsgenie',
        config: { apiUrl: 'https://test.opsgenie.com' },
        secrets: { apiKey: '1234' },
      });
      createdConnectorIds.push(created.id);
      await navigateToConnectors(page, kbnUrl);

      await searchConnectors(page, connectorName);
      await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
      await openConnectorFlyout(page);
      await page.testSubj.locator('nameInput').fill('some test name to cancel');
      await page.testSubj.click('edit-connector-flyout-close-btn');
      await page.testSubj.click('confirmModalConfirmButton');
      await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();

      await searchAndOpenConnector(page, connectorName);
      await expect(page.testSubj.locator('nameInput')).toHaveValue(connectorName);
      await page.testSubj.click('euiFlyoutCloseButton');
    });

    await test.step('should disable the run button when the message field is not filled', async () => {
      const connectorName = `opsgenie-disable-run-${Date.now()}`;
      const created = await apiServices.alerting.connectors.create({
        name: connectorName,
        connectorTypeId: '.opsgenie',
        config: { apiUrl: 'https://test.opsgenie.com' },
        secrets: { apiKey: '1234' },
      });
      createdConnectorIds.push(created.id);
      await navigateToConnectors(page, kbnUrl);

      await searchConnectors(page, connectorName);
      await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
      await openConnectorFlyout(page);
      await expect(page.testSubj.locator('nameInput')).toBeVisible();
      await page.testSubj.click('testConnectorTab');
      await page.testSubj.locator('executeActionButton').waitFor({ state: 'visible' });

      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
    });
  });

  // ── test page ─────────────────────────────────────────────────────────────

  test('page - sub action selector and alias/message switching behavior', async ({
    page,
    kbnUrl,
  }) => {
    await navigateToConnectors(page, kbnUrl);
    const reopenTestTab = async () => {
      await closeFlyoutIfOpen(page);
      await openOpsgenieTestTab(page, testPageConnectorId, testPageConnectorName);
    };

    await test.step('should show the sub action selector when in test mode', async () => {
      await reopenTestTab();
      await expect(page.testSubj.locator('opsgenie-subActionSelect')).toBeVisible();
    });

    await test.step('should preserve the alias when switching between create and close alert actions', async () => {
      await reopenTestTab();
      await page.testSubj.locator('aliasInput').fill('new alias');
      await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');

      await expect(page.testSubj.locator('opsgenie-subActionSelect')).toHaveValue('closeAlert');
      await expect(page.testSubj.locator('aliasInput')).toHaveValue('new alias');
    });

    await test.step('should not preserve the message when switching to close alert and back to create alert', async () => {
      await reopenTestTab();
      await page.testSubj.locator('messageInput').fill('a message');
      await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');
      await expect(page.testSubj.locator('messageInput')).toBeHidden();

      await page.testSubj.locator('opsgenie-subActionSelect').selectOption('createAlert');
      await expect(page.testSubj.locator('messageInput')).toBeVisible();
      await expect(page.testSubj.locator('messageInput')).toHaveValue('');
    });
  });

  test('page - createAlert additional options and JSON editor', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);
    const reopenTestTab = async () => {
      await closeFlyoutIfOpen(page);
      await openOpsgenieTestTab(page, testPageConnectorId, testPageConnectorName);
    };

    await test.step('should show the additional options when clicking more options', async () => {
      await reopenTestTab();
      await page.testSubj.click('opsgenie-display-more-options');

      await expect(page.testSubj.locator('entityInput')).toBeVisible();
      await expect(page.testSubj.locator('sourceInput')).toBeVisible();
      await expect(page.testSubj.locator('userInput')).toBeVisible();
      await expect(page.testSubj.locator('noteTextArea')).toBeVisible();
    });

    await test.step('should show and then hide the additional form options when clicking the button twice', async () => {
      await reopenTestTab();
      await page.testSubj.click('opsgenie-display-more-options');
      await expect(page.testSubj.locator('entityInput')).toBeVisible();

      await page.testSubj.click('opsgenie-display-more-options');
      await expect(page.testSubj.locator('entityInput')).toBeHidden();
    });

    await test.step('should populate the json editor with message, description, and alias', async () => {
      await reopenTestTab();
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

    await test.step('should populate the form with values from the json editor', async () => {
      await reopenTestTab();
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

    await test.step('should disable the run button when the json editor validation fails', async () => {
      await reopenTestTab();
      await page.testSubj.click('opsgenie-show-json-editor-toggle');
      await setMonacoValue(page, JSON.stringify({ message: '' }));

      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
    });
  });

  test('page - closeAlert additional options', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);
    const reopenTestTab = async () => {
      await closeFlyoutIfOpen(page);
      await openOpsgenieTestTab(page, testPageConnectorId, testPageConnectorName);
      await page.testSubj.locator('opsgenie-subActionSelect').selectOption('closeAlert');
    };

    await test.step('should show the additional options for closing an alert when clicking more options', async () => {
      await reopenTestTab();
      await page.testSubj.click('opsgenie-display-more-options');

      await expect(page.testSubj.locator('sourceInput')).toBeVisible();
      await expect(page.testSubj.locator('userInput')).toBeVisible();
    });

    await test.step('should show and then hide the additional options when clicking the button twice', async () => {
      await reopenTestTab();
      await page.testSubj.click('opsgenie-display-more-options');
      await expect(page.testSubj.locator('sourceInput')).toBeVisible();

      await page.testSubj.click('opsgenie-display-more-options');
      await expect(page.testSubj.locator('sourceInput')).toBeHidden();
    });
  });

  // ── alerts page ───────────────────────────────────────────────────────────

  test('alerts page - action group defaults and switching', async ({ page }) => {
    await page.gotoApp('rules');
    await defineIndexThresholdRule(page, `opsgenie-alert-${Date.now()}`, THRESHOLD_INDEX);

    await page.testSubj.click('ruleActionsAddActionButton');
    await page.testSubj.locator('ruleActionsConnectorsModal').waitFor({ state: 'visible' });
    await page.testSubj
      .locator('ruleActionsConnectorsModalCard')
      .filter({ hasText: alertsConnectorName })
      .locator('button')
      .click();

    await test.step('should default to the create alert action', async () => {
      await expect(page.testSubj.locator('messageInput')).toBeVisible();
      await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
    });

    await test.step('should show the message is required error when clicking the save button', async () => {
      await expect(page.testSubj.locator('rulePageFooterSaveButton')).toBeDisabled();
    });

    await test.step('should default to the close alert action when setting the run when to recovered', async () => {
      await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
      await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

      await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
      await expect(page.testSubj.locator('noteTextArea')).toBeVisible();
      await expect(page.testSubj.locator('messageInput')).toBeHidden();
    });

    await test.step('should not preserve the alias when switching run when to recover', async () => {
      // Reset to the default group this scenario originally started from.
      await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
      await page.testSubj.click('addNewActionConnectorActionGroup-threshold met');
      await expect(page.testSubj.locator('messageInput')).toBeVisible();

      await page.testSubj.locator('aliasInput').fill('an alias');

      await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
      await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

      await expect(page.testSubj.locator('messageInput')).toBeHidden();
      await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
    });

    await test.step('should not preserve the alias when switching run when to threshold met', async () => {
      await expect(page.testSubj.locator('messageInput')).toBeHidden();
      await page.testSubj.locator('aliasInput').fill('an alias');

      await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
      await page.testSubj.click('addNewActionConnectorActionGroup-threshold met');

      await expect(page.testSubj.locator('messageInput')).toBeVisible();
      await expect(page.testSubj.locator('aliasInput')).toHaveValue('{{rule.id}}:{{alert.id}}');
    });
  });
});
