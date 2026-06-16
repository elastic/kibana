/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/general.ts
//
// 11 of 13 tests migrated here; 2 preconfigured-connector tests moved to
// test/scout_triggers_actions_ui/ui/tests/connector_preconfigured.spec.ts
// because they require the triggers_actions_ui kbn-scout config set.

import { v4 as uuidv4 } from 'uuid';
import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  CONNECTORS_ROLE,
  setMonacoValue,
  navigateToConnectors,
  searchConnectors,
  openConnectorFlyout,
  searchAndOpenConnector,
} from '../fixtures';

const SLACK_SECRETS = {
  webhookUrl: 'https://example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
};

// The connector flyout body (ConnectorForm) mounts and lazy-loads its fields after the
// flyout opens. Interacting before nameInput is present races that mount on a cold CI
// cache (the default 10s action timeout is not always enough). Editable connectors only
// — preconfigured flyouts have no nameInput.
const waitForConnectorForm = async (page: ScoutPage) => {
  await page.testSubj.locator('nameInput').waitFor({ state: 'visible', timeout: 30_000 });
};

test.describe('General connector functionality', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CONNECTORS_ROLE);
  });

  test.afterEach(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    await Promise.allSettled(createdRuleIds.map((id) => apiServices.alerting.rules.delete(id)));
    createdConnectorIds.length = 0;
    createdRuleIds.length = 0;
  });

  test('should create a connector', async ({ page, kbnUrl, apiServices }) => {
    await navigateToConnectors(page, kbnUrl);

    const connectorName = `scout-slack-${uuidv4().slice(0, 8)}`;

    await page.testSubj.click('createConnectorButton');

    // Wait for the connector-type card grid to finish loading and settle before
    // clicking, otherwise the click can land on a card node React is re-creating as
    // the action-type list/capabilities resolve, silently losing the selection so
    // the back button never appears. Waiting for a sibling card proves the grid is
    // painted; then confirm the selection registered before navigating back.
    await page.testSubj.locator('.slack-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.slack-card');

    await waitForConnectorForm(page);
    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    await expect(page.testSubj.locator('create-connector-flyout-save-btn')).toBeEnabled();
    await page.testSubj.click('create-connector-flyout-save-btn');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    await searchConnectors(page, connectorName);
    const row = page.testSubj.locator('connectors-row');
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');

    const all = await apiServices.alerting.connectors.getAll();
    const created = (all as Array<{ id: string; name: string }>).find(
      (c) => c.name === connectorName
    );
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });

  test('should create a connector with a custom user-defined ID', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    await navigateToConnectors(page, kbnUrl);

    const connectorName = `scout-slack-${uuidv4().slice(0, 8)}`;
    const customId = `custom-${uuidv4().slice(0, 28)}`;
    createdConnectorIds.push(customId);

    await page.testSubj.click('createConnectorButton');

    await page.testSubj.locator('.slack-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.slack-card');

    await waitForConnectorForm(page);
    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('connectorIdInput').fill(customId);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    await expect(page.testSubj.locator('create-connector-flyout-save-btn')).toBeEnabled();
    await page.testSubj.click('create-connector-flyout-save-btn');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    const all = await apiServices.alerting.connectors.getAll();
    const created = (all as Array<{ id: string; name: string }>).find(
      (c) => c.name === connectorName
    );
    expect(created?.id).toStrictEqual(customId);
  });

  test('should auto-populate connector ID from name', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);

    await page.testSubj.click('createConnectorButton');

    await page.testSubj.locator('.slack-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn2 = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn2.waitFor({ state: 'visible' });
    await backBtn2.click();
    await page.testSubj.click('.slack-card');

    await waitForConnectorForm(page);
    await page.testSubj.locator('nameInput').fill('My Test Connector');

    await expect(page.testSubj.locator('connectorIdInput')).toHaveValue('my-test-connector');

    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('should show connector ID as disabled when editing an existing connector', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `scout-slack-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: SLACK_SECRETS,
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await openConnectorFlyout(page);

    await expect(page.testSubj.locator('connectorIdInput')).toBeDisabled();
    await expect(page.testSubj.locator('connectorIdInput')).toHaveValue(connectorId);

    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('should edit a connector', async ({ page, kbnUrl, apiServices }) => {
    const connectorName = `scout-slack-${Date.now()}`;
    const updatedName = `${connectorName}-updated`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: SLACK_SECRETS,
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await openConnectorFlyout(page);

    await waitForConnectorForm(page);
    await page.testSubj.locator('nameInput').fill(updatedName);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toBeEnabled();
    await page.testSubj.click('edit-connector-flyout-save-btn');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Updated '${updatedName}'`
    );

    await page.testSubj.click('euiFlyoutCloseButton');

    await searchConnectors(page, updatedName);
    const row = page.testSubj.locator('connectors-row');
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('connectorsTableCell-name')).toContainText(updatedName);
    await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');
  });

  test('should test a connector and display a successful result', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `scout-index-${Date.now()}`;
    const indexName = `scout-idx-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.index',
      config: { index: indexName, refresh: false },
      secrets: {},
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await openConnectorFlyout(page);

    // Wait for the configuration form to load before switching tabs, otherwise the
    // tab switch can race the flyout body's mount and the Test tab content never renders.
    await waitForConnectorForm(page);
    await page.testSubj.click('testConnectorTab');
    // Wait for the test-tab panel itself (same guard used by the email openTestTab helper).
    // executeActionButton lives inside this panel and is reliable once the panel is mounted.
    await page.testSubj.locator('test-connector-form').waitFor({ state: 'visible' });

    await setMonacoValue(page, '{ "key": "value" }');
    await expect(page.testSubj.locator('executeActionButton')).toBeEnabled();
    await page.testSubj.click('executeActionButton');

    await expect(page.testSubj.locator('executionSuccessfulResult')).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeEnabled();
    await page.testSubj.click('edit-connector-flyout-close-btn');
  });

  test('should test a connector and display a failure result', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `scout-index-${Date.now()}`;
    const indexName = `scout-idx-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.index',
      config: { index: indexName, refresh: false },
      secrets: {},
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await openConnectorFlyout(page);

    // Wait for the configuration form to load before switching tabs, otherwise the
    // tab switch can race the flyout body's mount and the Test tab content never renders.
    await waitForConnectorForm(page);
    await page.testSubj.click('testConnectorTab');
    await page.testSubj.locator('test-connector-form').waitFor({ state: 'visible' });

    await setMonacoValue(page, '"test"');
    await expect(page.testSubj.locator('executeActionButton')).toBeEnabled();
    await page.testSubj.click('executeActionButton');

    await expect(page.testSubj.locator('executionFailureResult')).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeEnabled();
    await page.testSubj.click('edit-connector-flyout-close-btn');
  });

  test('should reset connector when canceling an edit', async ({ page, kbnUrl, apiServices }) => {
    const connectorName = `scout-slack-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: SLACK_SECRETS,
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await openConnectorFlyout(page);

    await waitForConnectorForm(page);
    await page.testSubj.locator('nameInput').fill('some test name to cancel');
    await page.testSubj.click('edit-connector-flyout-close-btn');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();

    await searchAndOpenConnector(page, connectorName);

    await expect(page.testSubj.locator('nameInput')).toHaveValue(connectorName);
    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('should delete a connector', async ({ page, kbnUrl, apiServices }) => {
    const connectorName = `scout-slack-del-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: SLACK_SECRETS,
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);

    await page.testSubj.click('deleteConnector');
    await page.testSubj
      .locator('deleteIdsConfirmation')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();
    await expect(page.testSubj.locator('deleteIdsConfirmation')).toBeHidden();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Deleted 1 connector'
    );

    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(0);
  });

  test('should bulk delete connectors', async ({ page, kbnUrl, apiServices }) => {
    const connectorName = `scout-slack-bulk-${Date.now()}`;
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: SLACK_SECRETS,
    });
    createdConnectorIds.push(connectorId);

    await navigateToConnectors(page, kbnUrl);
    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);

    await page.locator('.euiTableRowCellCheckbox .euiCheckbox__input').click();
    await page.testSubj.click('bulkDelete');
    await page.testSubj
      .locator('deleteIdsConfirmation')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();
    await expect(page.testSubj.locator('deleteIdsConfirmation')).toBeHidden();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Deleted 1 connector'
    );

    await searchConnectors(page, connectorName);
    await expect(page.testSubj.locator('connectors-row')).toHaveCount(0);
  });

  test('Execution log - renders the event log list and can filter/sort', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    // Waiting for the rule's first execution depends on task manager picking up the
    // run-soon task (or the 1m scheduled fire) plus the event-log write, which can
    // exceed the default 60s test timeout under CI load. Give this test extra budget.
    test.setTimeout(150_000);

    // Create an ES query rule that always executes (substitute for test.always-firing)
    const ruleName = `scout-exec-log-${Date.now()}`;
    const createResp = await apiServices.alerting.rules.create({
      name: ruleName,
      ruleTypeId: '.es-query',
      consumer: 'stackAlerts',
      params: {
        searchType: 'esQuery',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        threshold: [0],
        thresholdComparator: '>=',
        size: 100,
        esQuery: '{"query":{"match_all":{}}}',
        aggType: 'count',
        groupBy: 'all',
        termSize: 5,
        excludeHitsFromPreviousRun: false,
        sourceFields: [],
        index: ['.kibana'],
        timeField: 'updated_at',
      },
      schedule: { interval: '1m' },
      tags: ['scout-exec-log'],
      actions: [],
      enabled: true,
    });
    const ruleId = createResp.data.id;
    createdRuleIds.push(ruleId);

    // Trigger an immediate run and wait for at least one execution.
    const dateStart = new Date();
    await apiServices.alerting.rules.runSoon(ruleId);
    await apiServices.alerting.waiting.waitForExecutionCount(
      ruleId,
      1,
      undefined,
      90_000,
      dateStart
    );

    // Navigate to rule details and open the Execution log tab
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await page.testSubj.click('eventLogListTab');
    await expect(page.testSubj.locator('ruleDetailsTabbedContent')).toBeVisible();

    await page.testSubj.click('superDatePickerApplyTimeButton');

    // Event log list and status filter both exist
    await expect(page.testSubj.locator('eventLogList')).toBeVisible({ timeout: 10_000 });
    await expect(page.testSubj.locator('eventLogStatusFilterButton')).toBeVisible();

    // Status badge starts at 0 (no filters active)
    const statusBadge = page.testSubj
      .locator('eventLogStatusFilterButton')
      .locator('.euiNotificationBadge');
    await expect(statusBadge).toHaveText('0');

    // Enable "success" filter
    await page.testSubj.click('eventLogStatusFilterButton');
    await page.testSubj.click('eventLogStatusFilter-success');
    await page.testSubj.click('eventLogStatusFilterButton');

    // Status badge now shows 1 active filter
    await expect(statusBadge).toHaveText('1');

    // At least one data row exists
    await expect(page.testSubj.locator('dataGridRowCell')).not.toHaveCount(0, { timeout: 10_000 });

    // At least one timestamp cell must contain a valid date (not "Invalid Date")
    const timestampCellLocator = page.locator(
      '[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]'
    );
    await expect(timestampCellLocator).not.toHaveCount(0, { timeout: 5_000 });
    const cellTexts = await timestampCellLocator.allInnerTexts();
    const validTimestamps = cellTexts.filter(
      (text) => text.trim() !== '' && text.toLowerCase() !== 'invalid date'
    );
    expect(validTimestamps.length).toBeGreaterThan(0);

    // Sort ascending: open column action menu and click the ascending sort button.
    // The timestamp column has no explicit EuiDataGrid schema and the grid has no
    // inMemory prop, so EUI uses the default sort labels ("A-Z" / "Z-A") rather
    // than the datetime schema labels ("Old-New" / "New-Old").
    await page.testSubj.locator('dataGridHeaderCell-timestamp').hover();
    await page.testSubj.click('dataGridHeaderCellActionButton-timestamp');
    await page.testSubj.locator('dataGridHeaderCellActionGroup-timestamp').waitFor();
    await page.testSubj
      .locator('dataGridHeaderCellActionGroup-timestamp')
      .getByRole('button', { name: 'Sort A-Z' })
      .click();

    await expect(page.testSubj.locator('dataGridHeaderCellSortingIcon-timestamp')).toBeVisible();
  });
});
