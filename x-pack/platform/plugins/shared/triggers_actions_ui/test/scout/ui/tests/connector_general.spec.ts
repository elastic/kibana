/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/general.ts
//
// 13 of 13 tests migrated.

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../fixtures';

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: {
      editor?: { getModels: () => Array<{ setValue: (s: string) => void }> };
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

const createSlackConnectorApi = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      connector_type_id: '.slack',
      config: {},
      secrets: {
        webhookUrl: 'https://example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      },
    },
  });
  return resp.data;
};

const createIndexConnectorApi = async (kbnClient: KbnClient, name: string, indexName: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      connector_type_id: '.index',
      config: { index: indexName, refresh: false },
      secrets: {},
    },
  });
  return resp.data;
};

const deleteConnectorApi = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

const navigateAndWait = async (page: ScoutPage, kbnUrl: { get: (p: string) => string }) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

const searchConnector = async (page: ScoutPage, name: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  await searchBox.fill(name);
  await searchBox.press('Enter');
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

const openConnectorFlyout = async (page: ScoutPage) => {
  await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();
};

test.describe('General connector functionality', { tag: tags.stateful.classic }, () => {
  test('should create a connector', async ({ browserAuth, page, kbnUrl, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await navigateAndWait(page, kbnUrl);

    const connectorName = `scout-slack-${uuidv4().slice(0, 8)}`;

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.index-card');
    await page.locator('[data-test-subj="create-connector-flyout-back-btn"]').click();
    await page.testSubj.click('.slack-card');

    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    await page
      .locator('[data-test-subj="create-connector-flyout-save-btn"]:not([disabled])')
      .click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    await searchConnector(page, connectorName);
    const row = page.testSubj.locator('connectors-row');
    await expect(row.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');

    // Cleanup
    const all = (
      await kbnClient.request<Array<{ id: string; name: string }>>({
        method: 'GET',
        path: '/api/actions/connectors',
        headers: {},
      })
    ).data;
    const created = all.find((c) => c.name === connectorName);
    if (created) await deleteConnectorApi(kbnClient, created.id);
  });

  test('should create a connector with a custom user-defined ID', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    await navigateAndWait(page, kbnUrl);

    const connectorName = `scout-slack-${uuidv4().slice(0, 8)}`;
    const customId = `custom-${uuidv4().slice(0, 28)}`;

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.slack-card');

    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('connectorIdInput').fill(customId);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    await page
      .locator('[data-test-subj="create-connector-flyout-save-btn"]:not([disabled])')
      .click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    // Verify the connector was created with the custom ID
    const all = (
      await kbnClient.request<Array<{ id: string; name: string }>>({
        method: 'GET',
        path: '/api/actions/connectors',
        headers: {},
      })
    ).data;
    const created = all.find((c) => c.name === connectorName);
    expect(created?.id).toStrictEqual(customId);

    if (created) await deleteConnectorApi(kbnClient, created.id);
  });

  test('should auto-populate connector ID from name', async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await navigateAndWait(page, kbnUrl);

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.slack-card');

    await page.testSubj.locator('nameInput').fill('My Test Connector');

    await expect(page.testSubj.locator('connectorIdInput')).toHaveValue('my-test-connector');

    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('should show connector ID as disabled when editing an existing connector', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-slack-${Date.now()}`;
    const { id: connectorId } = await createSlackConnectorApi(kbnClient, connectorName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await expect(page.testSubj.locator('connectorIdInput')).toBeDisabled();
      await expect(page.testSubj.locator('connectorIdInput')).toHaveValue(connectorId);

      await page.testSubj.click('euiFlyoutCloseButton');
    } finally {
      await deleteConnectorApi(kbnClient, connectorId);
    }
  });

  test('should edit a connector', async ({ browserAuth, page, kbnUrl, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-slack-${Date.now()}`;
    const updatedName = `${connectorName}-updated`;
    const { id: connectorId } = await createSlackConnectorApi(kbnClient, connectorName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await page.testSubj.locator('nameInput').fill(updatedName);
      await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

      await page
        .locator('[data-test-subj="edit-connector-flyout-save-btn"]:not([disabled])')
        .click();

      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Updated '${updatedName}'`
      );

      await page.testSubj.click('euiFlyoutCloseButton');

      await searchConnector(page, updatedName);
      const row = page.testSubj.locator('connectors-row');
      await expect(row.getByTestId('connectorsTableCell-name')).toContainText(updatedName);
      await expect(row.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');
    } finally {
      await deleteConnectorApi(kbnClient, connectorId);
    }
  });

  test('should test a connector and display a successful result', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-index-${Date.now()}`;
    const indexName = `scout-idx-${Date.now()}`;
    const { id: connectorId } = await createIndexConnectorApi(kbnClient, connectorName, indexName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await page.testSubj.click('testConnectorTab');
      await page.testSubj.locator('executeActionButton').waitFor({ state: 'visible' });

      await setMonacoValue(page, '{ "key": "value" }');
      await page.locator('[data-test-subj="executeActionButton"]:not([disabled])').click();

      await expect(page.testSubj.locator('executionSuccessfulResult')).toBeVisible({
        timeout: 15_000,
      });

      await page
        .locator('[data-test-subj="edit-connector-flyout-close-btn"]:not([disabled])')
        .click();
    } finally {
      await deleteConnectorApi(kbnClient, connectorId);
    }
  });

  test('should test a connector and display a failure result', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-index-${Date.now()}`;
    const indexName = `scout-idx-${Date.now()}`;
    const { id: connectorId } = await createIndexConnectorApi(kbnClient, connectorName, indexName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await page.testSubj.click('testConnectorTab');
      await page.testSubj.locator('executeActionButton').waitFor({ state: 'visible' });

      await setMonacoValue(page, '"test"');
      await page.locator('[data-test-subj="executeActionButton"]:not([disabled])').click();

      await expect(page.testSubj.locator('executionFailureResult')).toBeVisible({
        timeout: 15_000,
      });

      await page
        .locator('[data-test-subj="edit-connector-flyout-close-btn"]:not([disabled])')
        .click();
    } finally {
      await deleteConnectorApi(kbnClient, connectorId);
    }
  });

  test('should reset connector when canceling an edit', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-slack-${Date.now()}`;
    const { id: connectorId } = await createSlackConnectorApi(kbnClient, connectorName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await page.testSubj.locator('nameInput').fill('some test name to cancel');
      await page.testSubj.click('edit-connector-flyout-close-btn');
      await page.testSubj.click('confirmModalConfirmButton');

      await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();

      await searchConnector(page, connectorName);
      await openConnectorFlyout(page);

      await expect(page.testSubj.locator('nameInput')).toHaveValue(connectorName);
      await page.testSubj.click('euiFlyoutCloseButton');
    } finally {
      await deleteConnectorApi(kbnClient, connectorId);
    }
  });

  test('should delete a connector', async ({ browserAuth, page, kbnUrl, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-slack-del-${Date.now()}`;
    const keepConnectorName = `scout-slack-keep-${Date.now()}`;
    const { id: keepId } = await createSlackConnectorApi(kbnClient, keepConnectorName);
    await createSlackConnectorApi(kbnClient, connectorName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
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

      await searchConnector(page, connectorName);
      await expect(page.testSubj.locator('connectors-row')).toHaveCount(0);
    } finally {
      await deleteConnectorApi(kbnClient, keepId);
    }
  });

  test('should bulk delete connectors', async ({ browserAuth, page, kbnUrl, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-slack-bulk-${Date.now()}`;
    const keepConnectorName = `scout-slack-keep-${Date.now()}`;
    const { id: keepId } = await createSlackConnectorApi(kbnClient, keepConnectorName);
    await createSlackConnectorApi(kbnClient, connectorName);

    try {
      await navigateAndWait(page, kbnUrl);
      await searchConnector(page, connectorName);
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

      await searchConnector(page, connectorName);
      await expect(page.testSubj.locator('connectors-row')).toHaveCount(0);
    } finally {
      await deleteConnectorApi(kbnClient, keepId);
    }
  });

  test('should not be able to delete a preconfigured connector', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await navigateAndWait(page, kbnUrl);
    await searchConnector(page, 'Serverlog');

    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await expect(page.testSubj.locator('deleteConnector')).toBeHidden();
    await expect(page.testSubj.locator('preConfiguredTitleMessage')).toBeVisible();
    await expect(
      page.locator('[data-test-subj="checkboxSelectRow-preconfigured_my-server-log"]')
    ).toBeDisabled();
  });

  test('should not be able to edit a preconfigured connector', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await navigateAndWait(page, kbnUrl);
    await searchConnector(page, 'test-preconfigured-email');

    await expect(page.testSubj.locator('connectors-row')).toHaveCount(1);
    await expect(page.testSubj.locator('preConfiguredTitleMessage')).toBeVisible();

    await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();

    await expect(page.testSubj.locator('preconfiguredBadge')).toBeVisible();
    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toBeHidden();

    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('Execution log - renders the event log list and can filter/sort', async ({
    browserAuth,
    page,
    kbnClient,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    // Create an ES query rule that always executes (substitute for test.always-firing)
    const ruleName = `scout-exec-log-${Date.now()}`;
    const createResp = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/alerting/rule',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        name: ruleName,
        rule_type_id: '.es-query',
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
      },
    });
    const ruleId = createResp.data.id;

    try {
      // Trigger an immediate run
      await kbnClient.request({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleId}/_run_soon`,
        headers: { 'kbn-xsrf': 'scout' },
      });

      // Poll execution log until at least 1 execution appears (max 30s)
      const dateStart = new Date();
      const pollEnd = Date.now() + 30_000;
      let hasExecutions = false;
      while (!hasExecutions && Date.now() < pollEnd) {
        await page.waitForTimeout(1_000);
        try {
          const logResp = await kbnClient.request<{ total: number }>({
            method: 'GET',
            path: `/internal/alerting/rule/${ruleId}/_execution_log`,
            headers: {},
            query: { date_start: dateStart.toISOString() },
          });
          hasExecutions = logResp.data.total > 0;
        } catch {
          // keep polling
        }
      }

      // Navigate to rule details and click Execution log tab
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await page.testSubj.click('eventLogListTab');

      // Guard: if tabbed content is not present, the test cannot proceed (matches FTR guard)
      if (
        !(await page.testSubj
          .locator('ruleDetailsTabbedContent')
          .isVisible({ timeout: 2_000 })
          .catch(() => false))
      ) {
        return;
      }

      // Allow entries to accumulate then refresh
      await page.waitForTimeout(5_000);
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
      await expect(page.locator('.euiDataGridRow')).not.toHaveCount(0, { timeout: 10_000 });

      // Ensure timestamp column is visible
      await page.testSubj.click('dataGridColumnSelectorButton');
      const colToggle = page.testSubj.locator(
        'dataGridColumnSelectorToggleColumnVisibility-timestamp'
      );
      if ((await colToggle.getAttribute('aria-checked')) === 'false') {
        await colToggle.click();
      }
      await page.testSubj.click('dataGridColumnSelectorButton');

      // At least one timestamp cell must be visible and not show "Invalid Date"
      const timestampCellLocator = page.locator(
        '[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]'
      );
      await expect(timestampCellLocator).not.toHaveCount(0, { timeout: 5_000 });
      const cellTexts = await timestampCellLocator.allInnerTexts();
      expect(cellTexts[0].toLowerCase()).not.toBe('invalid date');

      // Sort ascending: open column action menu, click 2nd button (index 1 = ascending)
      await page.testSubj.locator('dataGridHeaderCell-timestamp').hover();
      await page.testSubj.click('dataGridHeaderCellActionButton-timestamp');
      await page.testSubj.locator('dataGridHeaderCellActionGroup-timestamp').waitFor();
      await page.testSubj
        .locator('dataGridHeaderCellActionGroup-timestamp')
        .locator('li:nth-child(2) button')
        .click();

      await expect(page.testSubj.locator('dataGridHeaderCellSortingIcon-timestamp')).toBeVisible();
    } finally {
      await kbnClient.request({
        method: 'DELETE',
        path: `/internal/alerting/rule/${ruleId}`,
        headers: { 'kbn-xsrf': 'scout' },
      });
    }
  });
});
