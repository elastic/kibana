/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/alert_create_flyout.ts
//
// 13 of 13 tests migrated.
//
// Substitutions from original:
//   - Slack#xyztest → Slack connector created via API in beforeAll
//   - test.always-firing rule → .es-query rule (tests 5-6)
//   - defineIndexThresholdAlert → Scout equivalent helper (tests 1-4)

import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, defineIndexThresholdRule, THRESHOLD_TEST_INDEX } from '../fixtures';

const searchRules = async (page: ScoutPage, query: string) => {
  const field = page.testSubj.locator('ruleSearchField');
  await field.fill(query);
  await field.press('Enter');
  await page
    .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
    .waitFor();
};

const defineEsQueryAlert = async (page: ScoutPage, alertName: string) => {
  await page.gotoApp('rules');
  await page.testSubj.click('createRuleButton');
  await page.testSubj.click('.es-query-SelectOption');
  await page.testSubj.locator('ruleDetailsNameInput').fill(alertName);
  await page.testSubj.click('queryFormType_esQuery');
  await page.testSubj.click('selectIndexExpression');
  const indexCombo = page.testSubj.locator('thresholdIndexesComboBox');
  await indexCombo.locator('[data-test-subj="comboBoxInput"]').click();
  await indexCombo
    .locator('[data-test-subj="comboBoxSearchInput"]')
    .pressSequentially('scout-threshold-rule', { delay: 50 });
  const indexOption = page.locator(`.euiComboBoxOption[title="${THRESHOLD_TEST_INDEX}"]`);
  await indexOption.waitFor({ state: 'visible', timeout: 30_000 });
  await indexOption.click();
  // The time-field <select> is populated asynchronously after the index is
  // chosen. Select the first real field by its value and assert it stuck, so a
  // late field re-fetch can't silently reset the <select> to the placeholder —
  // which would leave the form invalid and the Test query button disabled.
  const timeFieldSelect = page.testSubj.locator('thresholdAlertTimeFieldSelect');
  const firstFieldOption = timeFieldSelect.locator('option:nth-child(2)');
  await firstFieldOption.waitFor({ state: 'attached' });
  const firstFieldValue = await firstFieldOption.getAttribute('value');
  if (!firstFieldValue) {
    throw new Error('No time-field options available on thresholdAlertTimeFieldSelect');
  }
  await timeFieldSelect.selectOption(firstFieldValue);
  await expect(timeFieldSelect).toHaveValue(firstFieldValue);
  await page.testSubj.click('closePopover');
  await page.testSubj.locator('ruleDetailsNameInput').click();
};

const setEditorValue = async (page: ScoutPage, testSubj: string, value: string) => {
  await page.locator(`[data-test-subj="${testSubj}"]`).waitFor({ state: 'visible' });
  // Use the Monaco API directly — clicking or focusing the textarea does not
  // reliably trigger Monaco's internal model update for React to re-render.
  // Retry until at least one model exists and holds the value: setValue() can
  // otherwise fire before the model is registered / React's onChange listener
  // is attached, silently dropping the change and leaving stale form state.
  await expect(async () => {
    const applied = await page.evaluate((v) => {
      const editor = (
        window as {
          MonacoEnvironment?: {
            monaco?: {
              editor?: { getModels(): Array<{ setValue(s: string): void; getValue(): string }> };
            };
          };
        }
      ).MonacoEnvironment?.monaco?.editor;
      const models = editor?.getModels() ?? [];
      if (models.length === 0) return false;
      models.forEach((m) => m.setValue(v));
      return models.some((m) => m.getValue() === v);
    }, value);
    expect(applied).toBe(true);
  }).toPass({ timeout: 15_000 });
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

// Navigate to rules page then use the shared fixture to fill the form.
const defineIndexThresholdAlert = async (page: ScoutPage, alertName: string) => {
  await page.gotoApp('rules');
  await defineIndexThresholdRule(page, alertName);
};

// Find and delete a rule by name via API
const deleteRuleByName = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request({
    method: 'GET',
    path: '/api/alerting/rules/_find',
    headers: {},
    query: { search: name, search_fields: 'name' },
  });
  for (const rule of (resp.data as any).data ?? []) {
    if (rule.name === name) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/internal/alerting/rule/${rule.id}`,
        headers: { 'kbn-xsrf': 'scout' },
      });
    }
  }
};

// Click the Slack connector card in the actions connector modal
const selectConnectorInModal = async (page: ScoutPage, connectorName: string) => {
  await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
  await page
    .locator('[data-test-subj="ruleActionsConnectorsModalCard"]')
    .filter({ hasText: connectorName })
    .locator('button')
    .click();
};

test.describe('Alert create flyout', { tag: tags.stateful.classic }, () => {
  let esQueryRuleId: string;
  let esQueryRuleName: string;
  let slackConnectorId: string;
  let slackConnectorName: string;

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

    const rule = makeEsQueryRule('scout-alert-flyout');
    const resp = await apiServices.alerting.rules.create(rule);
    esQueryRuleId = resp.data.id;
    esQueryRuleName = resp.data.name;

    slackConnectorName = `scout-slack-${Date.now()}`;
    const connResp = await apiServices.alerting.connectors.create({
      name: slackConnectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: {
        webhookUrl: 'https://example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      },
    });
    slackConnectorId = connResp.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    await cancelRuleCreation(page);
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    if (esQueryRuleId) await apiServices.alerting.rules.delete(esQueryRuleId);
    if (slackConnectorId) await apiServices.alerting.connectors.delete(slackConnectorId);
    await esClient.indices.delete({ index: THRESHOLD_TEST_INDEX }, { ignore: [404] });
  });

  test('should delete the right action when the same action has been added twice', async ({
    page,
    kbnClient,
  }) => {
    const ruleName = `scout-flyout-del-${Date.now()}`;
    await defineEsQueryAlert(page, ruleName);

    // Add Slack action with unique body text
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);
    await page.testSubj.locator('messageTextArea').fill('myUniqueKey');
    await page.testSubj.click('rulePageFooterSaveButton');
    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created rule "${ruleName}"`,
      { timeout: 15_000 }
    );

    try {
      // Navigate to rules list and open edit flyout. Scope the action menu to
      // the row for *this* rule — clicking a bare `selectActionButton` would hit
      // the first row in the DOM, which can be a different rule if the search
      // filter hasn't fully applied yet.
      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, ruleName);
      const ruleRow = page.locator('[data-test-subj="rulesList"] tr').filter({ hasText: ruleName });
      await expect(ruleRow).toHaveCount(1);
      await ruleRow.locator('[data-test-subj="selectActionButton"]').click();
      await page.testSubj.click('editRule');

      // Add a second Slack action
      await page.testSubj.click('ruleActionsAddActionButton');
      await selectConnectorInModal(page, slackConnectorName);

      // Fill the second action's textarea (last of all messageTextArea elements)
      const allTextAreas = await page.testSubj.locator('messageTextArea').all();
      await allTextAreas[allTextAreas.length - 1].fill('myUniqueKey1');

      await expect(page.testSubj.locator('ruleActionsItem')).toHaveCount(2);

      // Delete the FIRST action item (the 'myUniqueKey' one). Each action item
      // is the first child of its own wrapper, so a `:first-child` CSS selector
      // matches every delete button — positional `.first()` is the correct tool.
      // eslint-disable-next-line playwright/no-nth-methods
      await page.testSubj.locator('ruleActionsItemDeleteButton').first().click();

      // Only one action remains; it should be 'myUniqueKey1' (the second action)
      await expect(page.testSubj.locator('ruleActionsItem')).toHaveCount(1);
      await expect(page.testSubj.locator('messageTextArea')).toHaveCount(1);
      await expect(page.testSubj.locator('messageTextArea')).toHaveValue('myUniqueKey1');
    } finally {
      await deleteRuleByName(kbnClient, ruleName);
    }
  });

  test('should create an alert', async ({ page, kbnClient }) => {
    const alertName = `scout-flyout-create-${Date.now()}`;
    await defineIndexThresholdAlert(page, alertName);

    // filterKuery validation: invalid KQL should mark field as invalid
    const filterKuery = page.testSubj.locator('filterKuery');
    await filterKuery.fill('group:');
    await filterKuery.blur();
    await expect(filterKuery).toHaveClass(/euiFieldSearch-isInvalid/, { timeout: 5_000 });
    await filterKuery.fill('group: group-0');
    await filterKuery.blur();
    await expect(filterKuery).not.toHaveClass(/euiFieldSearch-isInvalid/);

    // Add Slack action
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);

    // Default message template should be populated for Index Threshold rule
    await expect(page.testSubj.locator('messageTextArea')).not.toBeEmpty({ timeout: 5_000 });

    // Replace with test text then insert a variable
    await page.testSubj.locator('messageTextArea').fill('test message ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.click('variableMenuButton-alert.actionGroup');
    await expect(page.testSubj.locator('messageTextArea')).toHaveValue(
      'test message {{alert.actionGroup}}'
    );

    // Append more text, then insert another variable via search
    await page.testSubj.locator('messageTextArea').press('End');
    await page.keyboard.type(' some additional text ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.locator('messageVariablesSelectableSearch').fill('rule.id');
    await page.testSubj.click('variableMenuButton-rule.id');
    await expect(page.testSubj.locator('messageTextArea')).toHaveValue(
      'test message {{alert.actionGroup}} some additional text {{rule.id}}'
    );

    // Action settings: set throttle (Settings section auto-expands in the new accordion UI)
    await page.testSubj.click('notifyWhenSelect');
    await page.testSubj.click('onThrottleInterval');
    await page.testSubj.locator('throttleInput').fill('10');

    // Conditional action filter: toggle, add structured filter, add KQL query
    await page.testSubj.click('alertsFilterQueryToggle');
    await page.testSubj.click('addFilter');
    await page.testSubj.locator('filterFieldSuggestionList').locator('input').fill('_id');
    await page.locator('[role="listbox"] [role="option"]:first-child').click();
    await page.testSubj.locator('filterOperatorList').locator('input').fill('is not');
    await page.locator('[role="listbox"] [role="option"]:first-child').click();
    await page.testSubj.locator('filterParams').locator('input').fill('fake-rule-id');
    await page.testSubj.click('saveFilter');
    await page.testSubj.locator('queryInput').fill('_id: *');

    try {
      await page.testSubj.click('rulePageFooterSaveButton');
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Created rule "${alertName}"`,
        { timeout: 15_000 }
      );

      // Verify rule appears in list
      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const row = page.locator('[data-test-subj="rulesList"] tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Index threshold');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(kbnClient, alertName);
    }
  });

  test('should create an alert with composite query in filter for conditional action', async ({
    page,
    kbnClient,
  }) => {
    const alertName = `scout-flyout-composite-${Date.now()}`;
    await defineIndexThresholdAlert(page, alertName);

    // filterKuery validation
    const filterKuery = page.testSubj.locator('filterKuery');
    await filterKuery.fill('group:');
    await filterKuery.blur();
    await expect(filterKuery).toHaveClass(/euiFieldSearch-isInvalid/, { timeout: 5_000 });
    await filterKuery.fill('group: group-0');
    await filterKuery.blur();
    await expect(filterKuery).not.toHaveClass(/euiFieldSearch-isInvalid/);

    // Add Slack action and configure message
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);
    await page.testSubj.locator('messageTextArea').fill('test message ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.click('variableMenuButton-alert.actionGroup');
    await page.testSubj.locator('messageTextArea').press('End');
    await page.keyboard.type(' some additional text ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.locator('messageVariablesSelectableSearch').fill('rule.id');
    await page.testSubj.click('variableMenuButton-rule.id');

    // Action settings: throttle (Settings section auto-expands in the new accordion UI)
    await page.testSubj.click('notifyWhenSelect');
    await page.testSubj.click('onThrottleInterval');
    await page.testSubj.locator('throttleInput').fill('10');

    // Conditional action filter: use DSL mode to combine both conditions in one filter.
    // The structured field selector stays disabled until the alerts index has field mappings
    // (which requires alerts to have fired first), so DSL mode is more reliable here.
    await page.testSubj.click('alertsFilterQueryToggle');
    await page.testSubj.click('addFilter');
    await page.testSubj.click('editQueryDSL');
    await page.testSubj.locator('addFilterPopover').waitFor({ state: 'visible' });
    const compositeFilter = JSON.stringify({
      bool: {
        must_not: [{ term: { _id: 'fake-rule-id' } }],
        filter: [{ exists: { field: 'kibana.alert.action_group' } }],
      },
    });
    // Click the visible Monaco container, select all existing content, delete it, then type
    await page.testSubj.locator('addFilterPopover').locator('.monaco-editor').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(compositeFilter);
    // data-test-subj="saveFilter" — the button text says "Add filter" but the testSubj is saveFilter
    await page.testSubj.locator('saveFilter').scrollIntoViewIfNeeded();
    await page.testSubj.click('saveFilter');
    await page.testSubj.locator('queryInput').fill('_id: *');

    try {
      await page.testSubj.click('rulePageFooterSaveButton');
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Created rule "${alertName}"`,
        { timeout: 15_000 }
      );

      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const row = page.locator('[data-test-subj="rulesList"] tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Index threshold');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(kbnClient, alertName);
    }
  });

  test('should create an alert with DSL filter for conditional action', async ({
    page,
    kbnClient,
  }) => {
    const alertName = `scout-flyout-dsl-${Date.now()}`;
    await defineIndexThresholdAlert(page, alertName);

    // filterKuery validation
    const filterKuery = page.testSubj.locator('filterKuery');
    await filterKuery.fill('group:');
    await filterKuery.blur();
    await expect(filterKuery).toHaveClass(/euiFieldSearch-isInvalid/, { timeout: 5_000 });
    await filterKuery.fill('group: group-0');
    await filterKuery.blur();
    await expect(filterKuery).not.toHaveClass(/euiFieldSearch-isInvalid/);

    // Add Slack action
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);

    // Action settings: throttle (Settings section auto-expands in the new accordion UI)
    await page.testSubj.click('notifyWhenSelect');
    await page.testSubj.click('onThrottleInterval');
    await page.testSubj.locator('throttleInput').fill('10');

    // Conditional action filter: add a DSL (Query DSL) filter
    await page.testSubj.click('alertsFilterQueryToggle');
    const dslFilter = JSON.stringify({
      bool: { filter: [{ term: { 'kibana.alert.rule.name': alertName } }] },
    });
    await page.testSubj.click('addFilter');
    await page.testSubj.click('editQueryDSL');
    await page.testSubj.locator('addFilterPopover').waitFor({ state: 'visible' });
    // The DSL filter popover hosts the only Monaco editor in the index-threshold
    // rule form, so setEditorValue (which sets every model and retries until the
    // value sticks) reliably populates it and fires the React onChange that
    // enables "Add filter". A one-shot getEditors() setValue can race the
    // editor's mount and silently leave the editor empty.
    await setEditorValue(page, 'addFilterPopover', dslFilter);
    await page.testSubj.locator('saveFilter').scrollIntoViewIfNeeded();
    await expect(page.testSubj.locator('saveFilter')).toBeEnabled({ timeout: 10_000 });
    await page.testSubj.click('saveFilter');
    // A filter badge should now be present in the filter pills group
    await expect(page.locator('[data-test-subj="filter-items-group"] > *')).toHaveCount(1, {
      timeout: 5_000,
    });

    try {
      await page.testSubj.click('rulePageFooterSaveButton');
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Created rule "${alertName}"`,
        { timeout: 15_000 }
      );

      // Re-open rule for editing and verify the DSL filter persists. Scope the
      // action menu to this rule's row so we don't edit a different row that is
      // still visible before the search filter applies.
      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const ruleRow = page
        .locator('[data-test-subj="rulesList"] tr')
        .filter({ hasText: alertName });
      await expect(ruleRow).toHaveCount(1);
      await ruleRow.locator('[data-test-subj="selectActionButton"]').click();
      await page.testSubj.click('editRule');
      await page.testSubj.locator('globalQueryBar').scrollIntoViewIfNeeded();
      // DSL filter badge should still be present in the filter pills group
      await expect(page.locator('[data-test-subj="filter-items-group"] > *')).toHaveCount(1, {
        timeout: 5_000,
      });
    } finally {
      await deleteRuleByName(kbnClient, alertName);
    }
  });

  test('should create an alert with actions in multiple groups', async ({ page, kbnClient }) => {
    const alertName = `scout-flyout-multigroup-${Date.now()}`;
    await defineEsQueryAlert(page, alertName);

    // Add Slack action for the default (active) group
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);
    await page.testSubj.locator('messageTextArea').fill('test message');

    // Switch to recovered group via settings (Settings section auto-expands in accordion)
    await page.testSubj.click('ruleActionsSettingsSelectActionGroup');
    await page.testSubj.click('addNewActionConnectorActionGroup-recovered');

    // Add a second Slack action for the recovered group
    await page.testSubj.click('ruleActionsAddActionButton');
    await selectConnectorInModal(page, slackConnectorName);
    const allTextAreas = await page.testSubj.locator('messageTextArea').all();
    await allTextAreas[allTextAreas.length - 1].fill('recovery message');

    try {
      await page.testSubj.click('rulePageFooterSaveButton');
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Created rule "${alertName}"`,
        { timeout: 15_000 }
      );

      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const row = page.locator('[data-test-subj="rulesList"] tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Elasticsearch query');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(kbnClient, alertName);
    }
  });

  test('should show save confirmation before creating alert with no actions', async ({
    page,
    kbnClient,
  }) => {
    const alertName = `scout-flyout-confirm-${Date.now()}`;
    await defineEsQueryAlert(page, alertName);

    // Save with no actions → confirmation modal should appear
    await page.testSubj.click('rulePageFooterSaveButton');
    await expect(page.testSubj.locator('confirmCreateRuleModal')).toBeVisible({ timeout: 5_000 });

    // Cancel → modal closes, save button re-enabled
    await page.testSubj
      .locator('confirmCreateRuleModal')
      .locator('[data-test-subj="confirmModalCancelButton"]')
      .click();
    await expect(page.testSubj.locator('confirmCreateRuleModal')).toBeHidden();
    await expect(page.testSubj.locator('rulePageFooterSaveButton')).toBeEnabled();

    // Confirm save → rule created
    await page.testSubj.click('rulePageFooterSaveButton');
    await expect(page.testSubj.locator('confirmCreateRuleModal')).toBeVisible();
    await page.testSubj
      .locator('confirmCreateRuleModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();
    await expect(page.testSubj.locator('confirmCreateRuleModal')).toBeHidden();
    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created rule "${alertName}"`,
      { timeout: 15_000 }
    );

    try {
      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const row = page.locator('[data-test-subj="rulesList"] tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Elasticsearch query');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(kbnClient, alertName);
    }
  });

  test('should show discard confirmation before closing flyout without saving', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await page.testSubj.click('createRuleButton');
    await page.testSubj.click('.es-query-SelectOption');
    await page.testSubj.click('rulePageFooterCancelButton');
    await expect(page.testSubj.locator('confirmRuleCloseModal')).toBeHidden();

    await page.testSubj.click('createRuleButton');
    await page.testSubj.click('.es-query-SelectOption');
    const nameInput = page.testSubj.locator('ruleDetailsNameInput');
    await nameInput.click();
    await nameInput.pressSequentially('alertName');
    await page.testSubj.click('rulePageFooterCancelButton');
    await expect(page.testSubj.locator('confirmRuleCloseModal')).toBeVisible();
    await page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalCancelButton"]')
      .click();
    await expect(page.testSubj.locator('confirmRuleCloseModal')).toBeHidden();
  });

  test('should show error when es_query is invalid', async ({ page }) => {
    const alertName = `scout-es-query-${Date.now()}`;
    await defineEsQueryAlert(page, alertName);

    await setEditorValue(page, 'queryJsonEditor', '{"query":{"foo":""}}');
    // The button is disabled while the form has validation errors (e.g. the
    // index/time-field still settling); wait for it to enable before clicking.
    await expect(page.testSubj.locator('testQuery')).toBeEnabled({ timeout: 15_000 });
    await page.testSubj.click('testQuery');
    await expect(page.testSubj.locator('testQuerySuccess')).toBeHidden();
    await expect(page.testSubj.locator('testQueryError')).toBeVisible({ timeout: 15_000 });

    await page.testSubj.click('rulePageFooterCancelButton');
    await page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click({ timeout: 2_000 })
      .catch(() => {});
  });

  test('should show KEEP command warning when creating a ES query rule with ESQL', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await page.testSubj.click('createRuleButton');
    await page.testSubj.click('.es-query-SelectOption');
    await page.testSubj.click('queryFormType_esqlQuery');

    await setEditorValue(page, 'ESQLEditor', 'FROM *');
    await page.keyboard.press('Escape');

    await expect(page.testSubj.locator('ESQLEditor-footerPopoverButton-warning')).toBeVisible({
      timeout: 15_000,
    });
    await page.testSubj.click('ESQLEditor-footerPopoverButton-warning');
    await expect(page.testSubj.locator('ESQLEditor-errors-warnings-content')).toContainText(
      'KEEP processing command is recommended'
    );

    await setEditorValue(page, 'ESQLEditor', 'FROM * | KEEP @timestamp');
    await page.keyboard.press('Escape');

    await expect(page.testSubj.locator('ESQLEditor-errors-warnings-content')).toBeHidden({
      timeout: 10_000,
    });
  });

  test('should not show KEEP command warning when editing a ES query rule with ESQL', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await page.testSubj.click('rulesTab');
    await searchRules(page, esQueryRuleName);
    await page.testSubj.click('selectActionButton');
    await page.testSubj.click('editRule');

    await page.testSubj.click('queryFormTypeChooserCancel');
    await page.testSubj.click('queryFormType_esqlQuery');

    await setEditorValue(page, 'ESQLEditor', 'FROM *');
    await page.keyboard.press('Escape');

    await expect(page.testSubj.locator('ESQLEditor-errors-warnings-content')).toBeHidden({
      timeout: 5_000,
    });
  });

  test('should successfully show the APM error count rule flyout', async ({ page }) => {
    await page.gotoApp('rules');
    await page.testSubj.click('createRuleButton');
    await page.testSubj.click('apm.error_rate-SelectOption');
    await page.testSubj.locator('ruleDetailsNameInput').fill(`apm-error-${Date.now()}`);

    await expect(page.testSubj.locator('apmServiceField')).toBeVisible({ timeout: 10_000 });
    await expect(page.testSubj.locator('apmEnvironmentField')).toBeVisible();
    await expect(page.testSubj.locator('apmErrorGroupingKeyField')).toBeVisible();
    // afterEach cancelRuleCreation handles cleanup
  });

  test('should successfully test valid es_query alert', async ({ page }) => {
    const alertName = `scout-es-query-${Date.now()}`;
    await defineEsQueryAlert(page, alertName);

    await setEditorValue(page, 'queryJsonEditor', '{"query":{"match_all":{}}}');
    // The button is disabled while the form has validation errors (e.g. the
    // index/time-field still settling); wait for it to enable before clicking.
    await expect(page.testSubj.locator('testQuery')).toBeEnabled({ timeout: 15_000 });
    await page.testSubj.click('testQuery');
    await expect(page.testSubj.locator('testQuerySuccess')).toBeVisible({ timeout: 15_000 });
    await expect(page.testSubj.locator('testQueryError')).toBeHidden();

    await page.testSubj.click('rulePageFooterCancelButton');
    await page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click({ timeout: 2_000 })
      .catch(() => {});
  });

  test('should add filter', async ({ page, kbnUrl }) => {
    // The Stack Alerts page is a management sub-route, not a standalone app, so
    // navigate by URL (mirrors the FTR `triggersActionsAlerts` tab click).
    await page.goto(kbnUrl.get('/app/management/insightsAndAlerting/triggersActionsAlerts'));
    await page.testSubj.locator('addFilter').waitFor({ state: 'visible', timeout: 15_000 });

    const filter = JSON.stringify({
      bool: { filter: [{ term: { 'kibana.alert.status': 'active' } }] },
    });

    await page.testSubj.click('addFilter');
    await page.testSubj.click('editQueryDSL');
    await page.testSubj.locator('addFilterPopover').waitFor({ state: 'visible' });
    // The DSL popover hosts the only Monaco editor on the alerts page; clicking
    // its hidden textarea is intercepted by Monaco's view layer, so set the
    // value through the Monaco model (which fires the React onChange).
    await setEditorValue(page, 'addFilterPopover', filter);
    await expect(page.testSubj.locator('saveFilter')).toBeEnabled({ timeout: 10_000 });
    await page.testSubj.click('saveFilter');

    await expect(page.locator('[data-test-subj="filter-items-group"] > *')).toHaveCount(1, {
      timeout: 5_000,
    });
  });
});
