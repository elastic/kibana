/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/alert_create_flyout.ts
//
// 5 of 13 tests migrated. Skipped:
//   - tests 1-4: require Slack#xyztest preconfigured connector
//   - tests 5-6: require test.always-firing rule type (not registered in Scout stateful/classic)
//   - test 11: requires apm.error_rate rule type (APM plugin not available in Scout stateful/classic)
//   - test 13: requires filterBar.addDslFilter (no Scout equivalent)

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

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
  const indexInput = page.testSubj.locator('thresholdIndexesComboBox').locator('input');
  await indexInput.fill('.kibana');
  await page.locator('[role="listbox"]').waitFor();
  await page.locator('[role="listbox"] [role="option"]:first-child').click();
  const timeFieldSelect = page.testSubj.locator('thresholdAlertTimeFieldSelect');
  await timeFieldSelect.locator('option:nth-child(2)').waitFor();
  await timeFieldSelect.selectOption({ index: 1 });
  await page.testSubj.click('closePopover');
  await page.testSubj.locator('ruleDetailsNameInput').click();
};

const setEditorValue = async (page: ScoutPage, testSubj: string, value: string) => {
  const textarea = page.locator(`[data-test-subj="${testSubj}"] textarea`);
  await textarea.waitFor({ state: 'attached' });
  await textarea.click({ force: true });
  await page.keyboard.press('Control+a');
  await page.keyboard.type(value);
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

test.describe('Alert create flyout', { tag: tags.stateful.classic }, () => {
  let esQueryRuleId: string;
  let esQueryRuleName: string;

  test.beforeAll(async ({ apiServices }) => {
    const rule = makeEsQueryRule('scout-alert-flyout');
    const resp = await apiServices.alerting.rules.create(rule);
    esQueryRuleId = resp.data.id;
    esQueryRuleName = resp.data.name;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    await cancelRuleCreation(page);
  });

  test.afterAll(async ({ apiServices }) => {
    if (esQueryRuleId) await apiServices.alerting.rules.delete(esQueryRuleId);
  });

  // Skipped: requires Slack#xyztest preconfigured connector (not available in Scout stateful/classic)
  test.skip('should delete the right action when the same action has been added twice', async () => {});

  test.skip('should create an alert', async () => {});

  test.skip('should create an alert with composite query in filter for conditional action', async () => {});

  test.skip('should create an alert with DSL filter for conditional action', async () => {});

  // Skipped: requires test.always-firing rule type (not registered in Scout stateful/classic)
  test.skip('should create an alert with actions in multiple groups', async () => {});

  test.skip('should show save confirmation before creating alert with no actions', async () => {});

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
    await page.testSubj.locator('ruleDetailsNameInput').fill('alertName');
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
    await page.testSubj.click('testQuery');
    await expect(page.testSubj.locator('testQuerySuccess')).toBeHidden();
    await expect(page.testSubj.locator('testQueryError')).toBeVisible({ timeout: 15_000 });

    await page.testSubj.click('rulePageFooterCancelButton');
    const confirmBtn = page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
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

    await page.waitForTimeout(2_000);

    await expect(page.testSubj.locator('ESQLEditor-errors-warnings-content')).toBeHidden();
  });

  // Skipped: requires apm.error_rate rule type (APM plugin not available in Scout stateful/classic)
  test.skip('should successfully show the APM error count rule flyout', async () => {});

  test('should successfully test valid es_query alert', async ({ page }) => {
    const alertName = `scout-es-query-${Date.now()}`;
    await defineEsQueryAlert(page, alertName);

    await setEditorValue(page, 'queryJsonEditor', '{"query":{"match_all":{}}}');
    await page.testSubj.click('testQuery');
    await expect(page.testSubj.locator('testQuerySuccess')).toBeVisible({ timeout: 15_000 });
    await expect(page.testSubj.locator('testQueryError')).toBeHidden();

    await page.testSubj.click('rulePageFooterCancelButton');
    const confirmBtn = page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  });

  // Skipped: requires filterBar.addDslFilter (no Scout equivalent)
  test.skip('should add filter', async () => {});
});
