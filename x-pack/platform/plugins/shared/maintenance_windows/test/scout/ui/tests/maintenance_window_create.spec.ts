/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';
import { test, MAINTENANCE_WINDOWS_APP_PATH } from '../fixtures';

// Native HTML <select> options carry the option's runtime `value` attribute
// (e.g. rrule's Frequency.DAILY === 3). Rather than hard-coding enum values
// that can drift, read the value off the option's DOM by its data-test-subj.
const getNativeOptionValue = async (page: ScoutPage, optionTestSubj: string) => {
  const value = await page
    .locator(`option[data-test-subj="${optionTestSubj}"]`)
    .getAttribute('value');
  if (value === null) {
    throw new Error(`Could not read value attribute on option [${optionTestSubj}]`);
  }
  return value;
};

const selectNativeOptionByTestSubj = async (
  page: ScoutPage,
  selectSubj: string,
  optionSubj: string
) => {
  const value = await getNativeOptionValue(page, optionSubj);
  await page.testSubj.locator(selectSubj).selectOption(value);
};

const CREATE_BUTTON = 'mw-create-button';
const CREATE_FORM = 'createMaintenanceWindowForm';
const NAME_INPUT = 'createMaintenanceWindowFormNameInput';
const REPEAT_SELECT = 'recurringScheduleRepeatSelect';
const FREQUENCY_SELECT = 'customRecurringScheduleFrequencySelect';
const SUBMIT_BUTTON = 'create-submit';
const TOAST_TITLE = 'euiToastHeader__title';
const MULTIPLE_SOLUTIONS_WARNING = 'maintenanceWindowMultipleSolutionsRemovedWarning';
const TABLE_LOADED_CSS =
  '.euiBasicTable[data-test-subj="maintenance-windows-table"]:not(.euiBasicTable-loading)';

interface MaintenanceWindowFindResponse {
  data: Array<{ id: string; title: string }>;
}

const getUniqueMaintenanceWindowName = (prefix: string) => `${prefix} ${Date.now()}`;

const findMaintenanceWindowIdsByTitles = async (
  kbnClient: KbnClient,
  titles: string[]
): Promise<string[]> => {
  const idsByTitle = await Promise.all(
    titles.map(async (title) => {
      const response = await kbnClient.request<MaintenanceWindowFindResponse>({
        method: 'GET',
        path: `/internal/alerting/rules/maintenance_window/_find?search=${encodeURIComponent(
          title
        )}`,
        headers: { 'kbn-xsrf': 'scout' },
      });

      return response.data.data
        .filter((maintenanceWindow) => maintenanceWindow.title === title)
        .map((maintenanceWindow) => maintenanceWindow.id);
    })
  );

  return idsByTitle.flat();
};

const deleteMaintenanceWindows = async (kbnClient: KbnClient, ids: string[]) => {
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
};

const openEditFlowByTitle = async (
  page: ScoutPage,
  kbnUrl: { get: (p: string) => string },
  name: string
) => {
  await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
  await page.locator(TABLE_LOADED_CSS).waitFor();
  const searchBox = page.locator('.euiFieldSearch:not(.euiSelectableTemplateSitewide__search)');
  await searchBox.fill(name);
  // The pre-search table is already loaded, so wait for the search request itself: acting on the
  // stale table lets the re-render close the actions popover.
  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/maintenance_window/_find') &&
      new URL(response.url()).searchParams.get('search') === name
  );
  await searchBox.press('Enter');
  await searchResponse;
  await page.locator(TABLE_LOADED_CSS).waitFor();

  const row = page.testSubj
    .locator('maintenance-windows-table')
    .locator('tbody tr', { hasText: name });
  await expect(row).toHaveCount(1);
  await row.locator('[data-test-subj="table-actions-popover"]').click();
  await page.testSubj.click('table-actions-edit');
  await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();
};

test.describe('Maintenance window create form', { tag: tags.stateful.classic }, () => {
  const createdMaintenanceWindowTitles: string[] = [];

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await page.testSubj.locator(CREATE_BUTTON).waitFor({ state: 'visible' });
  });

  test.afterEach(async ({ kbnClient }) => {
    const ids = await findMaintenanceWindowIdsByTitles(kbnClient, createdMaintenanceWindowTitles);
    createdMaintenanceWindowTitles.length = 0;
    await deleteMaintenanceWindows(kbnClient, ids);
  });

  test('creates a maintenance window with a custom recurring schedule', async ({ page }) => {
    const name = getUniqueMaintenanceWindowName('Test Maintenance Window');
    createdMaintenanceWindowTitles.push(name);

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
    // Alerts defaults ON so the MW is created immediately without the confirmation modal.

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Created maintenance window '${name}'`
    );
  });

  test('shows confirmation modal when Alerts is toggled off before submitting', async ({
    page,
  }) => {
    const name = getUniqueMaintenanceWindowName('No Scope Maintenance Window');
    createdMaintenanceWindowTitles.push(name);

    await page.testSubj.click(CREATE_BUTTON);
    await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();

    await page.testSubj.locator(NAME_INPUT).fill(name);

    // Turn Alerts off so there is no scope selected.
    await page.testSubj.click('maintenanceWindowScopedQuerySwitch');

    await page.testSubj.click(SUBMIT_BUTTON);
    // No scope is selected, so the "save without scope" confirmation modal appears.
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Created maintenance window '${name}'`
    );
  });

  test('shows a callout when filters toggle is on and scope query is set', async ({ page }) => {
    const name = getUniqueMaintenanceWindowName('New Maintenance Window');
    createdMaintenanceWindowTitles.push(name);

    await page.testSubj.click(CREATE_BUTTON);
    await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();

    await page.testSubj.locator(NAME_INPUT).fill(name);

    // Alerts toggle is ON by default — the filter panel is already expanded.
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

  test('creates with Episodes scope and verifies the filter is restored on edit', async ({
    page,
    kbnUrl,
  }) => {
    const name = getUniqueMaintenanceWindowName('Episodes Scope Maintenance Window');
    createdMaintenanceWindowTitles.push(name);

    await page.testSubj.click(CREATE_BUTTON);
    await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();

    await page.testSubj.locator(NAME_INPUT).fill(name);

    // Enable the Episodes card — it is OFF by default.
    await page.testSubj.click('alertingV2ScopedQuerySwitch');
    await expect(page.testSubj.locator('maintenanceWindowAlertingV2FilterInput')).toBeVisible();

    // Enter a KQL episode filter. The QueryStringInput renders with the supplied dataTestSubj
    // directly on the text input element (it replaces the default 'queryInput' test-subj).
    const episodeInput = page.testSubj.locator('maintenanceWindowAlertingV2FilterInput');
    await episodeInput.fill('episode_id: "test-episode"');
    await episodeInput.press('Enter');

    await page.testSubj.click(SUBMIT_BUTTON);

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Created maintenance window '${name}'`
    );

    // Navigate to the edit form and verify the Episodes scope is hydrated correctly.
    await openEditFlowByTitle(page, kbnUrl, name);

    // Episodes toggle must be ON.
    await expect(page.testSubj.locator('alertingV2ScopedQuerySwitch')).toBeChecked();

    // Episodes KQL must be restored.
    await expect(page.testSubj.locator('maintenanceWindowAlertingV2FilterInput')).toHaveValue(
      'episode_id: "test-episode"'
    );
  });
});
