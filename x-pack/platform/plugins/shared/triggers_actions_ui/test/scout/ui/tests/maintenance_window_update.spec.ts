/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const MW_APP_PATH = '/app/management/insightsAndAlerting/maintenanceWindows';
const MW_INTERNAL_PATH = '/internal/alerting/rules/maintenance_window';
const MW_FIND_PATH = `${MW_INTERNAL_PATH}/_find`;
const MW_DELETE_PATH = (id: string) => `${MW_INTERNAL_PATH}/${id}`;

const SEARCH_INPUT_CSS = '.euiFieldSearch:not(.euiSelectableTemplateSitewide__search)';
const TABLE_LOADED_CSS =
  '.euiBasicTable[data-test-subj="maintenance-windows-table"]:not(.euiBasicTable-loading)';

const TABLE_ACTIONS_POPOVER = 'table-actions-popover';
const TABLE_ACTIONS_EDIT = 'table-actions-edit';
const CREATE_FORM = 'createMaintenanceWindowForm';
const NAME_INPUT = 'createMaintenanceWindowFormNameInput';
const REPEAT_SELECT = 'recurringScheduleRepeatSelect';
const REPEAT_OPTION_DAILY = 'recurringScheduleOptionDaily';
const SUBMIT_BUTTON = 'create-submit';
const CONFIRM_MODAL_BUTTON = 'confirmModalConfirmButton';
const TOAST_TITLE = 'euiToastHeader__title';
const SCOPE_QUERY = 'maintenanceWindowScopeQuery';
const MULTIPLE_SOLUTIONS_WARNING = 'maintenanceWindowMultipleSolutionsRemovedWarning';

// Frequency.DAILY == 3 in rrule. Match what the FTR createMaintenanceWindow
// helper sent — keeping the existing MW on a daily cadence so the only
// dropdown-driven change in test 1 is selecting the Daily option again.
const FREQ_DAILY = 3;

interface MaintenanceWindowResponse {
  id: string;
}

const createMaintenanceWindow = async (
  kbnClient: KbnClient,
  body: Record<string, unknown>
): Promise<MaintenanceWindowResponse> => {
  const res = await kbnClient.request<MaintenanceWindowResponse>({
    method: 'POST',
    path: MW_INTERNAL_PATH,
    headers: { 'kbn-xsrf': 'scout' },
    body,
  });
  return res.data;
};

const buildMwBody = (overrides: Record<string, unknown> = {}) => ({
  title: 'placeholder',
  duration: 60 * 60 * 1000,
  r_rule: {
    dtstart: new Date().toISOString(),
    tzid: 'UTC',
    freq: 2,
  },
  ...overrides,
});

const getNativeOptionValue = async (page: ScoutPage, optionTestSubj: string): Promise<string> => {
  const value = await page
    .locator(`option[data-test-subj="${optionTestSubj}"]`)
    .getAttribute('value');
  if (value === null) {
    throw new Error(`Could not read value attribute on option [${optionTestSubj}]`);
  }
  return value;
};

const openEditFlow = async (
  page: ScoutPage,
  kbnUrl: { get: (p: string) => string },
  name: string
) => {
  await page.goto(kbnUrl.get(MW_APP_PATH));
  await page.locator(TABLE_LOADED_CSS).waitFor();

  // The MW page renders a single search field; the unrelated
  // sitewide-search input is excluded by the CSS selector.
  const searchBox = page.locator(SEARCH_INPUT_CSS);
  await searchBox.fill(name);
  await searchBox.press('Enter');
  await page.locator(TABLE_LOADED_CSS).waitFor();

  await page.testSubj.click(TABLE_ACTIONS_POPOVER);
  await page.testSubj.click(TABLE_ACTIONS_EDIT);
  await expect(page.testSubj.locator(CREATE_FORM)).toBeVisible();
};

test.describe('Maintenance window update form', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    // Find every MW and delete it. Keeping cleanup keyed off "whatever exists"
    // (rather than tracking ids in-memory) means tests that fail mid-flow
    // don't leak windows into the next test.
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

  test('updates a maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const initialName = 'Test Maintenance Window';
    const updatedName = 'Test Maintenance Window updated';

    await createMaintenanceWindow(kbnClient, {
      ...buildMwBody({
        title: initialName,
        r_rule: {
          dtstart: new Date().toISOString(),
          tzid: 'UTC',
          freq: FREQ_DAILY,
          interval: 12,
          count: 5,
        },
        category_ids: ['management', 'observability', 'securitySolution'],
      }),
    });

    await openEditFlow(page, kbnUrl, initialName);

    const nameInput = page.testSubj.locator(NAME_INPUT);
    await nameInput.fill(updatedName);

    // Re-select Daily to exercise the dropdown. The MW was created with the
    // same frequency; the actual mutation under test is the name change.
    const dailyValue = await getNativeOptionValue(page, REPEAT_OPTION_DAILY);
    await page.testSubj.locator(REPEAT_SELECT).selectOption(dailyValue);

    await page.testSubj.click(SUBMIT_BUTTON);
    // Edits to a recurring schedule trigger a confirm modal before save.
    await page.testSubj.click(CONFIRM_MODAL_BUTTON);

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Updated maintenance window '${updatedName}'`
    );
  });

  test('shows the multiple-solutions callout when editing a MW with legacy multi-category state', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    const name = 'Test Maintenance Window 2';

    await createMaintenanceWindow(
      kbnClient,
      buildMwBody({
        title: name,
        r_rule: {
          dtstart: new Date().toISOString(),
          tzid: 'UTC',
          freq: FREQ_DAILY,
          interval: 12,
          count: 5,
        },
        // Two solution categories — the new schema only supports one, so the
        // form surfaces a warning callout when this MW is edited.
        category_ids: ['observability', 'securitySolution'],
      })
    );

    await openEditFlow(page, kbnUrl, name);

    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toContainText(
      'Support for multiple solution categories is removed.'
    );
  });

  test('keeps the callout visible and submits when editing a MW that already has a scope query', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    const name = 'New Maintenance Window';

    await createMaintenanceWindow(
      kbnClient,
      buildMwBody({
        title: name,
        scoped_query: { kql: '_id : * ', filters: [] },
        category_ids: ['management'],
      })
    );

    await openEditFlow(page, kbnUrl, name);

    await expect(page.testSubj.locator(SCOPE_QUERY)).toBeVisible();
    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toContainText(
      'Support for multiple solution categories is removed.'
    );

    await page.testSubj.click(SUBMIT_BUTTON);

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Updated maintenance window '${name}'`
    );
  });
});
