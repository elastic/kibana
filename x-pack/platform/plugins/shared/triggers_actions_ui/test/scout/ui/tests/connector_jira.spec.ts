/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';
const JIRA_CONNECTOR_TYPE_ID = '.jira';

const SEARCH_INPUT = '[data-test-subj="actionsList"] .euiFieldSearch';
const ACTIONS_TABLE_LOADED =
  '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)';
const CONNECTORS_ROW = 'connectors-row';
const CONNECTOR_NAME_CELL = 'connectorsTableCell-name';
const CONNECTOR_TYPE_CELL = 'connectorsTableCell-actionType';
const TEST_CONNECTOR_TAB = 'testConnectorTab';
const SUMMARY_INPUT = 'summaryInput';
const CODE_EDITOR = 'kibanaCodeEditor';
const EXECUTE_BUTTON = 'executeActionButton';
const EXECUTION_FAILURE_RESULT = 'executionFailureResult';
const FLYOUT_CLOSE_BUTTON = 'edit-connector-flyout-close-btn';

const OTHER_FIELDS_PARSE_ERROR =
  '[subActionParams.incident.otherFields.0]: could not parse record value from json input';

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: {
      editor?: { getModels: () => Array<{ setValue: (s: string) => void }> };
    };
  };
}

// Set the Monaco "Other fields" code editor value via the Monaco model API —
// `.fill()` on a Monaco editor's textarea is unreliable because Monaco uses
// a hidden textarea + virtualized canvas. setValue() also dispatches the
// onDidChangeContent event so React state stays in sync.
const setOtherFieldsValue = async (page: ScoutPage, value: string) => {
  await page.testSubj.locator(CODE_EDITOR).waitFor({ state: 'visible' });
  await page.evaluate((v) => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    if (!editor) {
      throw new Error('MonacoEnvironment.monaco.editor not available');
    }
    // The connector test tab only renders one Monaco instance (the
    // "Other fields" editor), so setting all models is safe and avoids
    // index-coupling.
    editor.getModels().forEach((m) => m.setValue(v));
  }, value);
};

const openTestConnectorFlyout = async (page: ScoutPage, connectorId: string) => {
  await page.testSubj.click(`edit${connectorId}`);
  await page.testSubj.click(TEST_CONNECTOR_TAB);
  await page.testSubj.locator(SUMMARY_INPUT).waitFor({ state: 'visible' });
};

test.describe('Jira connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  let jiraConnectorId: string;
  let jiraConnectorName: string;

  test.beforeAll(async ({ apiServices }) => {
    jiraConnectorName = `scout-jira-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: jiraConnectorName,
      connectorTypeId: JIRA_CONNECTOR_TYPE_ID,
      config: { apiUrl: 'https://test.com', projectKey: 'apiKey' },
      secrets: { email: 'test@elastic.co', apiToken: 'changeme' },
    });
    jiraConnectorId = created.id;
    createdConnectorIds.push(jiraConnectorId);
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(ACTIONS_TABLE_LOADED).waitFor();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('shows the created connector in the list', async ({ page }) => {
    const searchBox = page.locator(SEARCH_INPUT);
    await searchBox.fill(jiraConnectorName);
    await searchBox.press('Enter');
    await page.locator(ACTIONS_TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator(CONNECTORS_ROW);
    await expect(rows).toHaveCount(1);
    // The table cells wrap text in an inner `.euiTableCellContent` div
    // alongside icons/tooltips, so toContainText is the right granularity.
    await expect(rows.getByTestId(CONNECTOR_NAME_CELL)).toContainText(jiraConnectorName);
    await expect(rows.getByTestId(CONNECTOR_TYPE_CELL)).toContainText('Jira');
  });

  test('does not throw a type error for other fields when its valid json', async ({ page }) => {
    await openTestConnectorFlyout(page, jiraConnectorId);

    await page.testSubj.locator(SUMMARY_INPUT).fill('Test summary');
    await setOtherFieldsValue(page, '{ "key": "value" }');
    await page.testSubj.click(EXECUTE_BUTTON);

    await expect(page.testSubj.locator(EXECUTION_FAILURE_RESULT)).toBeVisible();
    // The execute call fails (apiUrl is fake) but the failure message
    // should NOT include the otherFields JSON parse error.
    await expect(page.testSubj.locator(EXECUTION_FAILURE_RESULT)).not.toContainText(
      OTHER_FIELDS_PARSE_ERROR
    );

    await page.testSubj.click(FLYOUT_CLOSE_BUTTON);
  });

  test('disables the execute button when other fields is not valid json', async ({ page }) => {
    // The original FTR spec asserted a server-side JSON parse error because
    // its Monaco setValue helper did not propagate the value to React state,
    // so client-side validation was bypassed. With the value correctly set,
    // the client-side validateJSON catches the malformed JSON and the form
    // disables the execute button — that's the modern, intended behavior.
    await openTestConnectorFlyout(page, jiraConnectorId);

    await page.testSubj.locator(SUMMARY_INPUT).fill('Test summary');
    await setOtherFieldsValue(page, '{ "no_valid_json" }');

    await expect(page.testSubj.locator(EXECUTE_BUTTON)).toBeDisabled();

    await page.testSubj.click(FLYOUT_CLOSE_BUTTON);
  });
});
