/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { buildCreateRuleData, test } from '../fixtures';

// Importing @kbn/alerting-v2-rule-form transitively pulls in monaco-editor CSS,
// which Playwright's test-listing phase cannot handle. Mirror the value here.
// Source: x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/form/constants.ts
const DEFAULT_RULE_NAME = 'Untitled rule';

const TEST_INDEX = 'test-compose-discover';
const TEST_QUERY = `FROM ${TEST_INDEX} | LIMIT 10`;
const BASE_QUERY = `FROM ${TEST_INDEX} | STATS count = COUNT(*)`;
const ALERT_SEGMENT = '| WHERE count > 0';
// Create uses a single unified editor; the heuristic split separates base + alert
// condition on Apply. Tests type the whole pipeline as one query.
const UNIFIED_QUERY = `${BASE_QUERY} ${ALERT_SEGMENT}`;
const RULE_NAME = 'scout-compose-discover-create';
const EDIT_RULE_NAME = 'scout-compose-discover-edit';
const EDITED_RULE_NAME = 'scout-compose-discover-edited';
const NO_TIME_FIELD_RULE_NAME = 'scout-compose-discover-no-time-field';
// `logs-*` is never ingested, so no date field resolves — the sad path.
const NO_TIME_FIELD_QUERY = 'FROM logs-* | LIMIT 10';
/**
 * Index whose only date field is `timestamp` (no `@timestamp`) — mirrors
 * kibana_sample_data_flights for standalone time-field resolution.
 */
const TIMESTAMP_ONLY_INDEX = 'test-compose-discover-timestamp-only';
const TIMESTAMP_ONLY_QUERY = `FROM ${TIMESTAMP_ONLY_INDEX} | STATS count = COUNT(*) BY Carrier | WHERE count > 100`;
/**
 * STATS with no WHERE — heuristic cannot isolate an alert condition, so Apply
 * commits alert + standalone (no_alert_condition).
 */
const NO_ALERT_CONDITION_TIMESTAMP_QUERY = `FROM ${TIMESTAMP_ONLY_INDEX} | STATS count = COUNT(*) BY Carrier`;
const CREATE_SIGNAL_TIMESTAMP_QUERY = `FROM ${TIMESTAMP_ONLY_INDEX} | WHERE Carrier == "ES-Air" | LIMIT 10`;
const BROKEN_TIME_FIELD_RULE_NAME = 'scout-compose-discover-broken-time-field';
const CREATE_SIGNAL_TIMESTAMP_RULE_NAME = 'scout-compose-discover-standalone-time-field';
const RUNBOOK_TEXT = 'Investigate failed transactions';

test.describe(
  'ComposeDiscoverFlyout — create and edit flows',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
      await esClient.indices.create(
        {
          index: TEST_INDEX,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              message: { type: 'text' },
            },
          },
        },
        { ignore: [400] }
      );
      await esClient.index({
        index: TEST_INDEX,
        document: { '@timestamp': new Date().toISOString(), message: 'hello' },
        refresh: 'wait_for',
      });
      await esClient.indices.create(
        {
          index: TIMESTAMP_ONLY_INDEX,
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              Carrier: { type: 'keyword' },
            },
          },
        },
        { ignore: [400] }
      );
      await esClient.index({
        index: TIMESTAMP_ONLY_INDEX,
        document: {
          timestamp: new Date().toISOString(),
          Carrier: 'ES-Air',
        },
        refresh: 'wait_for',
      });
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAlertingV2Editor();
      await pageObjects.rulesList.goto();
      await expect(page.testSubj.locator('rulesListLoading')).toBeHidden({ timeout: 60_000 });
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
      await esClient.indices.delete({ index: TIMESTAMP_ONLY_INDEX }, { ignore: [404] });
    });

    test('create flow: open flyout, define query, step through, and submit', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      await test.step('open ComposeDiscoverFlyout via empty-state card', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('sandbox opens automatically in create mode', async () => {
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('type a unified query and apply', async () => {
        await pageObjects.composeDiscover.setSandboxQuery(UNIFIED_QUERY);
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('alert is the default mode (heuristic split succeeds)', async () => {
        await expect(pageObjects.composeDiscover.summarySection('success')).toBeVisible();
        await expect(pageObjects.composeDiscover.alertSummaryEditorButton).toBeVisible();
      });

      await test.step('time field resolves to the index date field', async () => {
        // Happy path: TEST_INDEX exposes `@timestamp`.
        await expect(pageObjects.composeDiscover.timeFieldSelector).toHaveValue('@timestamp');
        await expect(pageObjects.composeDiscover.timeFieldSelector).not.toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expect(pageObjects.composeDiscover.timeFieldError).toBeHidden();
      });

      await test.step('Next is enabled after query is committed', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });

      await test.step('advance through Recovery Condition to the Details step', async () => {
        await pageObjects.composeDiscover.clickNext(); // Recovery Condition
        await pageObjects.composeDiscover.clickNext(); // Details
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });

      await test.step('fill rule name', async () => {
        await pageObjects.composeDiscover.setRuleName(RULE_NAME);
      });

      await test.step('add runbook and verify related dashboards field', async () => {
        await expect(pageObjects.composeDiscover.addRunbookButton).toBeVisible();
        await expect(pageObjects.composeDiscover.relatedDashboardsSelector).toBeVisible();
        await expect(pageObjects.composeDiscover.relatedDashboardsInput).toBeVisible();

        await pageObjects.composeDiscover.addRunbook(RUNBOOK_TEXT);
        await expect(pageObjects.composeDiscover.addRunbookButton).toBeHidden();
        await expect(pageObjects.composeDiscover.flyout.getByText(RUNBOOK_TEXT)).toBeVisible();
      });

      await test.step('advance to the Actions step (final step shows Submit)', async () => {
        await pageObjects.composeDiscover.clickNext(); // Actions
        await expect(pageObjects.composeDiscover.submitButton).toBeVisible();
      });

      await test.step('submit and verify rule created', async () => {
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });

        await expect
          .poll(
            async () => {
              const { items } = await apiServices.alertingV2.rules.find({
                search: RULE_NAME,
              });
              return items[0]?.artifacts?.some(
                (artifact) =>
                  artifact.type === RUNBOOK_ARTIFACT_TYPE && artifact.value === RUNBOOK_TEXT
              );
            },
            { timeout: 30_000 }
          )
          .toBe(true);
      });
    });

    test('edit flow: pencil icon opens flyout with pre-populated name, save updates rule', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a rule via API', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            kind: 'signal',
            state_transition: undefined,
            recovery_strategy: undefined,
            query: {
              format: 'standalone',
              breach: { query: TEST_QUERY },
            },
            metadata: { name: EDIT_RULE_NAME },
            artifacts: [
              {
                id: 'runbook-id',
                type: RUNBOOK_ARTIFACT_TYPE,
                value: RUNBOOK_TEXT,
              },
            ],
          })
        );
        ruleId = rule.id;
      });

      await test.step('refresh the rules list', async () => {
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('click pencil icon to open edit flyout', async () => {
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('rule name is pre-populated', async () => {
        // In edit mode, step 0 shows the alert condition with queryCommitted: true.
        // Navigate to Details step to see the name input.
        await pageObjects.composeDiscover.clickNext();
        await expect(pageObjects.composeDiscover.ruleNameInput).toHaveValue(EDIT_RULE_NAME);
        await expect(pageObjects.composeDiscover.flyout.getByText(RUNBOOK_TEXT)).toBeVisible();
        await expect(pageObjects.composeDiscover.relatedDashboardsSelector).toBeVisible();
        await expect(pageObjects.composeDiscover.relatedDashboardsInput).toBeVisible();
      });

      await test.step('modify name and save', async () => {
        await pageObjects.composeDiscover.ruleNameInput.clear();
        await pageObjects.composeDiscover.setRuleName(EDITED_RULE_NAME);
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      await test.step('verify rule updated via API', async () => {
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).metadata.name, {
            timeout: 30_000,
          })
          .toBe(EDITED_RULE_NAME);
      });
    });

    test('edit flow (sad path): a rule with no resolvable time field triggers validation and blocks Next', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a rule whose query targets an index with no date field', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            kind: 'signal',
            state_transition: undefined,
            recovery_strategy: undefined,
            query: {
              format: 'standalone',
              breach: { query: NO_TIME_FIELD_QUERY },
            },
            metadata: { name: NO_TIME_FIELD_RULE_NAME },
          })
        );
        ruleId = rule.id;
      });

      await test.step('refresh the rules list', async () => {
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('open the edit flyout', async () => {
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('time field is flagged invalid and Next is blocked', async () => {
        await expect(pageObjects.composeDiscover.timeFieldSelector).toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expect(pageObjects.composeDiscover.timeFieldError).toBeVisible();
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('editing the query to target data with a date field clears the error', async () => {
        await pageObjects.composeDiscover.editQueryButton.click();
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();

        // EUI omits `aria-invalid` when valid rather than setting it to "false".
        await expect(pageObjects.composeDiscover.timeFieldSelector).toHaveValue('@timestamp');
        await expect(pageObjects.composeDiscover.timeFieldSelector).not.toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expect(pageObjects.composeDiscover.timeFieldError).toBeHidden();
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });
    });

    test('edit flow (sad path): broken standalone alert can select timestamp and save', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a standalone alert with an invalid stored time field', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            kind: 'alert',
            query: {
              format: 'standalone',
              breach: { query: TIMESTAMP_ONLY_QUERY },
            },
            // Intentionally wrong — index only has `timestamp`.
            time_field: '@timestamp',
            grouping: { fields: ['Carrier'] },
            metadata: { name: BROKEN_TIME_FIELD_RULE_NAME },
          })
        );
        ruleId = rule.id;
      });

      await test.step('refresh the rules list and open the edit flyout', async () => {
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('sandbox opens in YAML mode and offers the real timestamp field', async () => {
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
        await expect(pageObjects.composeDiscover.yamlSubmitButton).toBeVisible();
        await pageObjects.composeDiscover.selectSandboxTimeField('timestamp');
        await expect(pageObjects.composeDiscover.sandboxTimeFieldSelector).toHaveValue('timestamp');
      });

      await test.step('apply and save persists timestamp', async () => {
        await pageObjects.composeDiscover.clickApply();
        // Apply updates YAML via React state — wait until the editor reflects it
        // before Save, or YamlSubmit can persist the stale `@timestamp` value.
        await expect(pageObjects.composeDiscover.flyout).toContainText('time_field: timestamp');
        await expect(pageObjects.composeDiscover.flyout).not.toContainText(
          "time_field: '@timestamp'"
        );
        await pageObjects.composeDiscover.clickYamlSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });

        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).time_field, {
            timeout: 30_000,
          })
          .toBe('timestamp');
      });
    });

    test('create flow (sad path): time field populates when base and alert condition cannot be determined', async ({
      pageObjects,
    }) => {
      await test.step('open create flyout in alert mode and apply a no-alert-condition query', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();

        // Create starts as composed + empty base. Typing fills base until Apply;
        // a STATS-only pipeline then commits as alert + standalone.
        await pageObjects.composeDiscover.setSandboxQuery(NO_ALERT_CONDITION_TIMESTAMP_QUERY);
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('summary shows no alert condition (standalone breach query)', async () => {
        await expect(
          pageObjects.composeDiscover.summarySection('no_alert_condition')
        ).toBeVisible();
        await expect(pageObjects.composeDiscover.noAlertConditionCallout).toBeVisible();
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('form Time field still resolves from the standalone breach query', async () => {
        // Regression: alert mode used to resolve only from composed `base`, so
        // options stayed empty after Apply left format: standalone.
        await pageObjects.composeDiscover.waitForTimeFieldOption(
          pageObjects.composeDiscover.timeFieldSelector,
          'timestamp'
        );
        await expect(pageObjects.composeDiscover.timeFieldSelector).toHaveValue('timestamp');
        await expect(pageObjects.composeDiscover.timeFieldSelector).not.toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expect(pageObjects.composeDiscover.timeFieldError).toBeHidden();
      });
    });

    test('create flow: signal (standalone) mode can select timestamp and create', async ({
      pageObjects,
      apiServices,
    }) => {
      await test.step('open create flyout, commit a query, then switch to signal mode', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();

        // Signal mode always resolves time fields from breach.query (not the
        // alert-standalone bug). Kept as coverage for timestamp-only create +
        // mode switch. ModeSelect stays disabled until a query is committed.
        await pageObjects.composeDiscover.setSandboxQuery(CREATE_SIGNAL_TIMESTAMP_QUERY);
        await pageObjects.composeDiscover.selectSandboxTimeField('timestamp');
        await expect(pageObjects.composeDiscover.sandboxTimeFieldSelector).toHaveValue('timestamp');
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
        await pageObjects.composeDiscover.selectMode('signal');
      });

      await test.step('name the rule and submit', async () => {
        await expect(pageObjects.composeDiscover.timeFieldSelector).toHaveValue('timestamp');
        await pageObjects.composeDiscover.clickNext(); // Details
        await pageObjects.composeDiscover.setRuleName(CREATE_SIGNAL_TIMESTAMP_RULE_NAME);
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      await test.step('created rule persists the selected timestamp field', async () => {
        await expect
          .poll(
            async () => {
              const { items } = await apiServices.alertingV2.rules.find({
                search: CREATE_SIGNAL_TIMESTAMP_RULE_NAME,
              });
              return items[0]?.time_field;
            },
            { timeout: 30_000 }
          )
          .toBe('timestamp');
      });
    });

    test('step validation: Next disabled without query, name validation blocks advancement', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open create flyout', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('close sandbox without applying', async () => {
        await pageObjects.composeDiscover.sandboxCloseButton.click();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('Next is disabled with tooltip when no query is committed', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('open sandbox, type a unified query, and apply', async () => {
        await pageObjects.composeDiscover.alertSummaryEditorButton.click();
        await pageObjects.composeDiscover.setSandboxQuery(
          `FROM ${TEST_INDEX} | WHERE message != ""`
        );
        await pageObjects.composeDiscover.clickApply();
      });

      await test.step('Next is now enabled; advance through Recovery to the Details step', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
        await pageObjects.composeDiscover.clickNext(); // Recovery Condition
        await pageObjects.composeDiscover.clickNext(); // Details
      });

      // Details is no longer the final step in the default (alert) flow, so name
      // validation gates Next rather than Submit — but the effect is the same:
      // you can't leave the Details step until a valid name is provided.
      await test.step('an empty name blocks advancing past Details', async () => {
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
        await pageObjects.composeDiscover.clickNext();
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });

      await test.step('clearing a name after typing it blocks advancement', async () => {
        await pageObjects.composeDiscover.setRuleName('Temporary name');
        await pageObjects.composeDiscover.ruleNameInput.clear();
        await pageObjects.composeDiscover.clickNext();
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });

      await test.step('"Untitled rule" placeholder text is rejected as a name', async () => {
        await pageObjects.composeDiscover.setRuleName(DEFAULT_RULE_NAME);
        await pageObjects.composeDiscover.clickNext();
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });

      await test.step('Back returns through Recovery to the Alert Condition step', async () => {
        await pageObjects.composeDiscover.backButton.click(); // Recovery Condition
        await pageObjects.composeDiscover.backButton.click(); // Alert Condition
        // Query was committed in alert mode (default) and split successfully, so the
        // read-only base + alert condition summary is shown.
        await expect(pageObjects.composeDiscover.summarySection('success')).toBeVisible();
        await expect(page.testSubj.locator('ruleNameInput')).toBeHidden();
      });
    });

    test('sandbox: Apply commits query, closing without Apply discards changes', async ({
      pageObjects,
    }) => {
      await test.step('open create flyout (sandbox opens automatically)', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('type query and close sandbox without applying', async () => {
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        await pageObjects.composeDiscover.sandboxCloseButton.click();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('query is not committed — Next stays disabled', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('reopen sandbox, type a unified query, and click Apply', async () => {
        await pageObjects.composeDiscover.alertSummaryEditorButton.click();
        await pageObjects.composeDiscover.setSandboxQuery(UNIFIED_QUERY);
        await pageObjects.composeDiscover.clickApply();
      });

      await test.step('Apply closes sandbox and commits query', async () => {
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });
    });

    test('alert condition validation: Apply without typing anything shows the empty callout and disables Next', async ({
      pageObjects,
    }) => {
      await test.step('open create flyout (sandbox opens automatically)', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('click Apply without typing anything', async () => {
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('empty callout is visible and Next button is disabled', async () => {
        await expect(pageObjects.composeDiscover.summarySection('empty')).toBeVisible();
        await expect(pageObjects.composeDiscover.emptyQueryCallout).toBeVisible();
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });
    });

    test('alert condition validation: base-only query shows the no-alert-condition callout and disables Next', async ({
      pageObjects,
    }) => {
      await test.step('open create flyout', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('apply only a base query (no alert condition)', async () => {
        await pageObjects.composeDiscover.applySandboxBaseQueryOnly(BASE_QUERY);
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('no-alert-condition callout is visible', async () => {
        await expect(
          pageObjects.composeDiscover.summarySection('no_alert_condition')
        ).toBeVisible();
        await expect(pageObjects.composeDiscover.noAlertConditionCallout).toBeVisible();
        await expect(pageObjects.composeDiscover.noAlertConditionCallout).toContainText(
          'No alert condition'
        );
      });

      await test.step('Next button is disabled', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });
    });

    test('alert condition validation: no callout when the query splits into base + alert condition', async ({
      pageObjects,
    }) => {
      await test.step('open create flyout', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('apply a unified query with a base and alert condition', async () => {
        await pageObjects.composeDiscover.setSandboxQuery(UNIFIED_QUERY);
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('split succeeds, no callout is shown and Next is enabled', async () => {
        await expect(pageObjects.composeDiscover.summarySection('success')).toBeVisible();
        await expect(pageObjects.composeDiscover.noAlertConditionCallout).toBeHidden();
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });
    });

    test('alert condition validation: a base-only query keeps the user on the Alert Condition step', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open create flyout and apply only a base query', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.applySandboxBaseQueryOnly(BASE_QUERY);
      });

      await test.step('Next is disabled — verify we stay on Alert Condition step', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
        await expect(pageObjects.composeDiscover.noAlertConditionCallout).toBeVisible();
        await expect(page.testSubj.locator('ruleNameInput')).toBeHidden();
      });
    });
  }
);
