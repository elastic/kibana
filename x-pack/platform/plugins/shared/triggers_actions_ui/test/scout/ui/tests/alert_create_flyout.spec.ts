/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, defineIndexThresholdRule, THRESHOLD_TEST_INDEX } from '../fixtures';

const TEST_RUN_ID = Date.now();
const STATEFUL_ALERTS_INDEX = '.internal.alerts-stack.alerts-default-000001';

const INDEX_THRESHOLD_DEFAULT_MESSAGE = `Rule {{rule.name}} is active for group {{context.group}}:

- Value: {{context.value}}
- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}
- Timestamp: {{context.date}}`;

const searchRules = async (page: ScoutPage, query: string) => {
  const field = page.testSubj.locator('ruleSearchField');
  await field.fill(query);
  await field.press('Enter');
  await expect(page.testSubj.locator('rulesList')).toBeVisible();
  await expect(page.testSubj.locator('rulesList')).not.toHaveClass(/euiBasicTable-loading/);
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
  await expect(timeFieldSelect.locator('option[value="@timestamp"]')).toBeAttached();
  await timeFieldSelect.selectOption('@timestamp');
  await expect(timeFieldSelect).toHaveValue('@timestamp');
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
  await cancelBtn.click({ timeout: 2_000 }).catch((e: Error) => {
    if (!e.message.includes('Timeout')) {
      throw e;
    }
  });

  const confirmBtn = page.testSubj
    .locator('confirmRuleCloseModal')
    .locator('[data-test-subj="confirmModalConfirmButton"]');
  await confirmBtn.click({ timeout: 1_000 }).catch((e: Error) => {
    if (!e.message.includes('Timeout')) {
      throw e;
    }
  });
};

// Navigate to rules page then use the shared fixture to fill the form.
const defineIndexThresholdAlert = async (page: ScoutPage, alertName: string) => {
  await page.gotoApp('rules');
  await defineIndexThresholdRule(page, alertName);
};

const selectComboBoxOption = async (page: ScoutPage, testSubj: string, value: string) => {
  await page.testSubj.click(`${testSubj} > comboBoxInput`);
  // fill() fires a single input event; pressSequentially() fires one per character,
  // causing cascading async field-fetch requests that can cancel each other on CI.
  await page.testSubj.locator(`${testSubj} > comboBoxSearchInput`).fill(value);
  await page.locator(`.euiComboBoxOption[title="${value}"]`).click();
};

const selectComboBoxOptionIn = async (
  page: ScoutPage,
  containerTestSubj: string,
  testSubj: string,
  value: string
) => {
  const container = page.testSubj.locator(containerTestSubj);
  const combo = container.locator(`[data-test-subj="${testSubj}"]`);
  await combo.locator('[data-test-subj="comboBoxInput"]').click();
  await combo.locator('[data-test-subj="comboBoxSearchInput"]').fill(value);
  await page.locator(`.euiComboBoxOption[title="${value}"]`).click();
};

const addStructuredFilterCondition = async (
  page: ScoutPage,
  {
    field,
    operator,
    value,
    containerTestSubj,
  }: {
    field: string;
    operator: 'is not' | 'exists';
    value?: string;
    containerTestSubj?: string;
  }
) => {
  if (containerTestSubj) {
    await selectComboBoxOptionIn(page, containerTestSubj, 'filterFieldSuggestionList', field);
    await selectComboBoxOptionIn(page, containerTestSubj, 'filterOperatorList', operator);
    if (value) {
      const paramsInput = page.testSubj
        .locator(containerTestSubj)
        .locator('[data-test-subj="filterParams"] input');
      await expect(paramsInput).toBeEditable();
      await paramsInput.fill(value);
    }
    return;
  }

  await selectComboBoxOption(page, 'filterFieldSuggestionList', field);
  await selectComboBoxOption(page, 'filterOperatorList', operator);
  if (value) {
    const paramsInput = page.locator('[data-test-subj="filterParams"] input');
    await expect(paramsInput).toBeEditable();
    await paramsInput.fill(value);
  }
};

const expectDslFilter = async (page: ScoutPage, filter: string) => {
  const compactJson = filter.replace(/\s/g, '');
  // Query DSL filter badges render the compact JSON as their visible badge text.
  await expect(
    page.locator('[data-test-subj^="filter-badge"]').filter({ hasText: compactJson })
  ).toBeVisible({ timeout: 15_000 });
};

const deleteRuleByName = async (apiServices: ApiServicesFixture, name: string) => {
  const resp = await apiServices.alerting.rules.find({ search: name, search_fields: 'name' });
  for (const rule of (resp.data as any).data ?? []) {
    if (rule.name === name) {
      await apiServices.alerting.rules.delete(rule.id);
    }
  }
};

// Click the Slack connector card in the actions connector modal
const selectConnectorInModal = async (page: ScoutPage, connectorName: string) => {
  await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
  await page.testSubj
    .locator('ruleActionsConnectorsModalCard')
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

    await esClient.index({
      index: STATEFUL_ALERTS_INDEX,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date().toISOString(),
        'kibana.alert.uuid': `scout-alert-create-flyout-${TEST_RUN_ID}`,
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.rule.uuid': `scout-rule-${TEST_RUN_ID}`,
        'kibana.alert.action_group': 'threshold met',
        'kibana.space_ids': ['default'],
        'event.kind': 'signal',
        'event.action': 'open',
      },
    });

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
    await esClient.deleteByQuery(
      {
        index: STATEFUL_ALERTS_INDEX,
        refresh: true,
        conflicts: 'proceed',
        query: {
          term: { 'kibana.alert.uuid': `scout-alert-create-flyout-${TEST_RUN_ID}` },
        },
      },
      { ignore: [404] }
    );
  });

  test('should delete the right action when the same action has been added twice', async ({
    page,
    apiServices,
  }) => {
    const ruleName = `scout-flyout-del-${Date.now()}`;
    await defineIndexThresholdAlert(page, ruleName);

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
      const ruleRow = page.testSubj
        .locator('rulesList')
        .locator('tr')
        .filter({ hasText: ruleName });
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
      await deleteRuleByName(apiServices, ruleName);
    }
  });

  test('should create an alert', async ({ page, apiServices }) => {
    // Field-capability API calls on loaded CI agents can exceed 30 s each;
    // allow 120 s so the two combobox waits don't exhaust the test budget.
    test.setTimeout(120_000);
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

    await expect(page.testSubj.locator('messageTextArea')).toHaveValue(
      INDEX_THRESHOLD_DEFAULT_MESSAGE
    );

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

    // Conditional action filter: use the structured filter builder, matching
    // the FTR coverage for field/operator/value interactions.
    await page.testSubj.click('alertsFilterQueryToggle');
    await page.testSubj.click('addFilter');
    await page.testSubj.locator('addFilterPopover').waitFor({ state: 'visible' });
    await addStructuredFilterCondition(page, {
      field: 'kibana.alert.rule.uuid',
      operator: 'is not',
      value: 'fake-rule-id',
    });
    await page.testSubj.locator('saveFilter').scrollIntoViewIfNeeded();
    await page.testSubj.click('saveFilter');
    await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
    await expect(page.testSubj.locator('^filter-badge')).toBeVisible();
    await page.testSubj.locator('queryInput').fill('kibana.alert.rule.uuid: *');

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
      const row = page.testSubj.locator('rulesList').locator('tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Index threshold');
      await expect(row).toContainText('1 min');
      await expect(row).toContainText(/\d{2,}:\d{2}/);
    } finally {
      await deleteRuleByName(apiServices, alertName);
    }
  });

  test('should create an alert with composite query in filter for conditional action', async ({
    page,
    apiServices,
  }) => {
    test.setTimeout(120_000);
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
    await expect(page.testSubj.locator('messageTextArea')).toHaveValue(
      INDEX_THRESHOLD_DEFAULT_MESSAGE
    );
    await page.testSubj.locator('messageTextArea').fill('test message ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.click('variableMenuButton-alert.actionGroup');
    await page.testSubj.locator('messageTextArea').press('End');
    await page.keyboard.type(' some additional text ');
    await page.testSubj.click('messageAddVariableButton');
    await page.testSubj.locator('messageVariablesSelectableSearch').fill('rule.id');
    await page.testSubj.click('variableMenuButton-rule.id');
    await expect(page.testSubj.locator('messageTextArea')).toHaveValue(
      'test message {{alert.actionGroup}} some additional text {{rule.id}}'
    );

    // Action settings: throttle (Settings section auto-expands in the new accordion UI)
    await page.testSubj.click('notifyWhenSelect');
    await page.testSubj.click('onThrottleInterval');
    await page.testSubj.locator('throttleInput').fill('10');

    // Conditional action filter: use the structured filter builder and add the
    // second condition through the AND control, matching the old FTR flow.
    await page.testSubj.click('alertsFilterQueryToggle');
    await page.testSubj.click('addFilter');
    await page.testSubj.locator('addFilterPopover').waitFor({ state: 'visible' });
    await addStructuredFilterCondition(page, {
      field: 'kibana.alert.rule.uuid',
      operator: 'is not',
      value: 'fake-rule-id',
    });
    await page.testSubj.click('add-and-filter');
    await addStructuredFilterCondition(page, {
      field: 'kibana.alert.action_group',
      operator: 'exists',
      containerTestSubj: 'filter-0.1',
    });
    await page.testSubj.locator('saveFilter').scrollIntoViewIfNeeded();
    await page.testSubj.click('saveFilter');
    await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
    await expect(page.testSubj.locator('^filter-badge')).toBeVisible();
    await page.testSubj.locator('queryInput').fill('kibana.alert.rule.uuid: *');

    try {
      await page.testSubj.click('rulePageFooterSaveButton');
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        `Created rule "${alertName}"`,
        { timeout: 15_000 }
      );

      await page.gotoApp('rules');
      await page.testSubj.click('rulesTab');
      await searchRules(page, alertName);
      const row = page.testSubj.locator('rulesList').locator('tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Index threshold');
      await expect(row).toContainText('1 min');
      await expect(row).toContainText(/\d{2,}:\d{2}/);
    } finally {
      await deleteRuleByName(apiServices, alertName);
    }
  });

  test('should create an alert with DSL filter for conditional action', async ({
    page,
    apiServices,
  }) => {
    test.setTimeout(120_000);
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
    await expectDslFilter(page, dslFilter);

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
      const ruleRow = page.testSubj
        .locator('rulesList')
        .locator('tr')
        .filter({ hasText: alertName });
      await expect(ruleRow).toHaveCount(1);
      await ruleRow.locator('[data-test-subj="selectActionButton"]').click();
      await page.testSubj.click('editRule');
      await page.testSubj.locator('globalQueryBar').scrollIntoViewIfNeeded();
      await expectDslFilter(page, dslFilter);
    } finally {
      await deleteRuleByName(apiServices, alertName);
    }
  });

  test('should create an alert with actions in multiple groups', async ({ page, apiServices }) => {
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
      const row = page.testSubj.locator('rulesList').locator('tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Elasticsearch query');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(apiServices, alertName);
    }
  });

  test('should show save confirmation before creating alert with no actions', async ({
    page,
    apiServices,
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
      const row = page.testSubj.locator('rulesList').locator('tr').filter({ hasText: alertName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Elasticsearch query');
      await expect(row).toContainText('1 min');
    } finally {
      await deleteRuleByName(apiServices, alertName);
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
      .catch((e: Error) => {
        if (!e.message.includes('Timeout')) {
          throw e;
        }
      });
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
    // Scope the action menu to this rule's row so we don't open a different row
    // that may still be visible before the search filter fully applies.
    const ruleRow = page.testSubj
      .locator('rulesList')
      .locator('tr')
      .filter({ hasText: esQueryRuleName });
    await expect(ruleRow).toHaveCount(1);
    await ruleRow.locator('[data-test-subj="selectActionButton"]').click();
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
      .catch((e: Error) => {
        if (!e.message.includes('Timeout')) {
          throw e;
        }
      });
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

    await expectDslFilter(page, filter);
  });
});
