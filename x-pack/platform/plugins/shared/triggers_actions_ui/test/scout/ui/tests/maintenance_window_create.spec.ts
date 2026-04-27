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

// Maintenance Windows is registered under Stack Management's
// `insightsAndAlerting` section, not as a standalone app — `gotoApp` resolves
// to /app/<id>, which doesn't exist for this page. Navigate to the management
// URL directly.
const MW_APP_PATH = '/app/management/insightsAndAlerting/maintenanceWindows';

const CREATE_BUTTON = 'mw-create-button';
const CREATE_FORM = 'createMaintenanceWindowForm';
const NAME_INPUT = 'createMaintenanceWindowFormNameInput';
const REPEAT_SWITCH = 'createMaintenanceWindowRepeatSwitch';
const REPEAT_SELECT = 'recurringScheduleRepeatSelect';
const REPEAT_OPTION_CUSTOM = 'recurringScheduleOptionCustom';
const FREQUENCY_SELECT = 'customRecurringScheduleFrequencySelect';
const FREQUENCY_OPTION_DAILY = 'customFrequencyDaily';
const INTERVAL_INPUT = 'customRecurringScheduleIntervalInput';
const END_AFTER_X = 'recurrenceEndOptionAfterX';
const COUNT_FIELD = 'count-field';
const AFTER_X_INPUT = 'recurringScheduleAfterXOccurenceInput';
const SUBMIT_BUTTON = 'create-submit';
const CONFIRM_MODAL_BUTTON = 'confirmModalConfirmButton';
const TOAST_TITLE = 'euiToastHeader__title';

const SCOPED_QUERY_SWITCH = 'maintenanceWindowScopedQuerySwitch';
const SCOPE_QUERY = 'maintenanceWindowScopeQuery';
const SCOPE_QUERY_INPUT = 'queryInput';
const MULTIPLE_SOLUTIONS_WARNING = 'maintenanceWindowMultipleSolutionsRemovedWarning';

const MW_FIND_PATH = '/internal/alerting/rules/maintenance_window/_find';
const MW_DELETE_PATH = (id: string) => `/internal/alerting/rules/maintenance_window/${id}`;

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
    await page.goto(kbnUrl.get(MW_APP_PATH));
    await page.testSubj.locator(CREATE_BUTTON).waitFor({ state: 'visible' });
  });

  test.afterEach(async ({ kbnClient }) => {
    // Find every maintenance window and delete it. We do not track ids
    // in-memory because a half-completed test may have created a MW that
    // never made it back to the test code (e.g. failure during the confirm
    // modal). Find-and-delete is idempotent.
    const findRes = await kbnClient.request<{ data: Array<{ id: string }> }>({
      method: 'GET',
      path: MW_FIND_PATH,
      headers: { 'kbn-xsrf': 'scout' },
    });
    const ids = findRes.data?.data?.map((mw) => mw.id) ?? [];
    await Promise.allSettled(
      ids.map((id) =>
        kbnClient.request({
          method: 'DELETE',
          path: MW_DELETE_PATH(id),
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
    await page.testSubj.click(REPEAT_SWITCH);
    await expect(page.testSubj.locator(REPEAT_SELECT)).toBeVisible();

    // Switch the repeat frequency to Custom — surfaces the interval +
    // custom-frequency selects.
    await selectNativeOptionByTestSubj(page, REPEAT_SELECT, REPEAT_OPTION_CUSTOM);
    await expect(page.testSubj.locator(FREQUENCY_SELECT)).toBeVisible();

    // Every 2 days
    await page.testSubj.locator(INTERVAL_INPUT).fill('2');
    await selectNativeOptionByTestSubj(page, FREQUENCY_SELECT, FREQUENCY_OPTION_DAILY);

    // Choose the "End after X occurrences" radio and set X = 5.
    await page.testSubj.click(END_AFTER_X);
    await expect(page.testSubj.locator(COUNT_FIELD)).toBeVisible();
    await page.testSubj.locator(AFTER_X_INPUT).fill('5');

    await page.testSubj.click(SUBMIT_BUTTON);
    // Custom recurring schedules trigger a confirm modal before save.
    await page.testSubj.click(CONFIRM_MODAL_BUTTON);

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
    await page.testSubj.locator(SCOPED_QUERY_SWITCH).locator('button').click();
    await expect(page.testSubj.locator(SCOPE_QUERY)).toBeVisible();

    // Without a scope query, the multi-solution warning callout is not shown.
    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toBeHidden();

    const queryField = page.testSubj.locator(SCOPE_QUERY_INPUT);
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
