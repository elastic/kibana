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

const CREATE_BUTTON = 'mw-create-button';
const CREATE_FORM = 'createMaintenanceWindowForm';
const NAME_INPUT = 'createMaintenanceWindowFormNameInput';
const REPEAT_SELECT = 'recurringScheduleRepeatSelect';
const FREQUENCY_SELECT = 'customRecurringScheduleFrequencySelect';
const SUBMIT_BUTTON = 'create-submit';
const TOAST_TITLE = 'euiToastHeader__title';
const MULTIPLE_SOLUTIONS_WARNING = 'maintenanceWindowMultipleSolutionsRemovedWarning';

// Native HTML <select> options carry the option's runtime `value` attribute
// (e.g. rrule's Frequency.DAILY === 3). Rather than hard-coding numeric or
// string enum values that can drift, read the value off the option's DOM by
// its data-test-subj and feed it back into selectOption.
const selectNativeOptionByTestSubj = async (
  page: ScoutPage,
  selectSubj: string,
  optionSubj: string
) => {
  const optionValue = await page
    .locator(`option[data-test-subj="${optionSubj}"]`)
    .getAttribute('value');
  if (optionValue === null) {
    throw new Error(`Could not read value attribute on option [${optionSubj}]`);
  }
  await page.testSubj.locator(selectSubj).selectOption(optionValue);
};

test.describe('Maintenance window create form', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/management/insightsAndAlerting/maintenanceWindows'));
    await page.testSubj.locator(CREATE_BUTTON).waitFor({ state: 'visible' });
  });

  test.afterEach(async ({ kbnClient }) => {
    const findRes = await kbnClient.request<{ data: Array<{ id: string }> }>({
      method: 'GET',
      path: '/internal/alerting/rules/maintenance_window/_find',
      headers: { 'kbn-xsrf': 'scout' },
    });
    const ids = findRes.data?.data?.map((mw) => mw.id) ?? [];
    await Promise.allSettled(
      ids.map((id) =>
        kbnClient.request({
          method: 'DELETE',
          path: `/internal/alerting/rules/maintenance_window/${id}`,
          headers: { 'kbn-xsrf': 'scout' },
          ignoreErrors: [404],
        })
      )
    );
  });

  test('creates a maintenance window with a custom recurring schedule', async ({ page }) => {
    const name = 'Test Maintenance Window';

    await page.testSubj.click(CREATE_BUTTON);
    await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();

    await page.testSubj.locator(NAME_INPUT).fill(name);

    // Turn on repeat → reveals the recurring schedule subform.
    await page.testSubj.click('createMaintenanceWindowRepeatSwitch');
    await expect(page.testSubj.locator(REPEAT_SELECT)).toBeVisible();

    // Switch the repeat frequency to Custom — surfaces the interval +
    // custom-frequency selects.
    await selectNativeOptionByTestSubj(page, REPEAT_SELECT, 'recurringScheduleOptionCustom');
    await expect(page.testSubj.locator(FREQUENCY_SELECT)).toBeVisible();

    // Every 2 days
    await page.testSubj.locator('customRecurringScheduleIntervalInput').fill('2');
    await selectNativeOptionByTestSubj(page, FREQUENCY_SELECT, 'customFrequencyDaily');

    // Choose the "End after X occurrences" radio and set X = 5.
    await page.testSubj.click('recurrenceEndOptionAfterX');
    await expect(page.testSubj.locator('count-field')).toBeVisible();
    await page.testSubj.locator('recurringScheduleAfterXOccurenceInput').fill('5');

    await page.testSubj.click(SUBMIT_BUTTON);
    // Custom recurring schedules trigger a confirm modal before save.
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Created maintenance window '${name}'`
    );
  });

  test('shows a callout when filters toggle is on and scope query is set', async ({ page }) => {
    const name = 'New Maintenance Window';

    await page.testSubj.click(CREATE_BUTTON);
    await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();

    await page.testSubj.locator(NAME_INPUT).fill(name);

    // The "Filter alerts" switch is rendered as an EuiSwitch nested inside
    // a panel that carries the data-test-subj. The clickable element is the
    // inner button.
    await page.testSubj.locator('maintenanceWindowScopedQuerySwitch').locator('button').click();
    await expect(page.testSubj.locator('maintenanceWindowScopeQuery')).toBeVisible();

    // Without a scope query, the multi-solution warning callout is not shown.
    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toBeHidden();

    const queryField = page.testSubj.locator('queryInput');
    await queryField.fill('_id: "*"');
    await queryField.press('Enter');

    // Setting a scope query reduces the affected rules to a single solution,
    // so the "other solutions removed" warning becomes visible.
    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toBeVisible();

    await page.testSubj.click(SUBMIT_BUTTON);

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Created maintenance window '${name}'`
    );
  });
});
