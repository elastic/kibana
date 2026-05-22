/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, MAINTENANCE_WINDOWS_APP_PATH } from '../fixtures';

// Native HTML <select> options carry the option's runtime `value` attribute
// (e.g. rrule's Frequency.DAILY === 3). Rather than hard-coding enum values
// that can drift, read the value off the option's DOM by its data-test-subj.
const getNativeOptionValue = async (page: ScoutPage, optionTestSubj: string): Promise<string> => {
  const value = await page
    .locator(`option[data-test-subj="${optionTestSubj}"]`)
    .getAttribute('value');
  if (value === null) {
    throw new Error(`Could not read value attribute on option [${optionTestSubj}]`);
  }
  return value;
};

const TABLE_LOADED_CSS =
  '.euiBasicTable[data-test-subj="maintenance-windows-table"]:not(.euiBasicTable-loading)';
const SUBMIT_BUTTON = 'create-submit';
const TOAST_TITLE = 'euiToastHeader__title';
const MULTIPLE_SOLUTIONS_WARNING = 'maintenanceWindowMultipleSolutionsRemovedWarning';
const FREQ_DAILY = 3;

interface MaintenanceWindowResponse {
  id: string;
}

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

const createMaintenanceWindow = async (
  kbnClient: KbnClient,
  body: Record<string, unknown>
): Promise<MaintenanceWindowResponse> => {
  const res = await kbnClient.request<MaintenanceWindowResponse>({
    method: 'POST',
    path: '/internal/alerting/rules/maintenance_window',
    headers: { 'kbn-xsrf': 'scout' },
    body,
  });
  return res.data;
};

const getUniqueMaintenanceWindowName = (prefix: string) => `${prefix} ${Date.now()}`;

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

const openEditFlow = async (
  page: ScoutPage,
  kbnUrl: { get: (p: string) => string },
  name: string
) => {
  await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
  await page.locator(TABLE_LOADED_CSS).waitFor();

  // The MW page renders a single search field; the unrelated
  // sitewide-search input is excluded by the CSS selector.
  const searchBox = page.locator('.euiFieldSearch:not(.euiSelectableTemplateSitewide__search)');
  await searchBox.fill(name);
  await searchBox.press('Enter');
  await page.locator(TABLE_LOADED_CSS).waitFor();

  await page.testSubj.click('table-actions-popover');
  await page.testSubj.click('table-actions-edit');
  await expect(page.testSubj.locator('createMaintenanceWindowForm')).toBeVisible();
};

test.describe('Maintenance window update form', { tag: tags.stateful.classic }, () => {
  const createdMaintenanceWindowIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    const idsToDelete = [...createdMaintenanceWindowIds];
    createdMaintenanceWindowIds.length = 0;
    await deleteMaintenanceWindows(kbnClient, idsToDelete);
  });

  test('updates a maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const initialName = getUniqueMaintenanceWindowName('Test Maintenance Window');
    const updatedName = `${initialName} updated`;

    const { id } = await createMaintenanceWindow(kbnClient, {
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
    createdMaintenanceWindowIds.push(id);

    await openEditFlow(page, kbnUrl, initialName);

    await page.testSubj.locator('createMaintenanceWindowFormNameInput').fill(updatedName);

    // Re-select Daily to exercise the dropdown. The MW was created with the
    // same frequency; the actual mutation under test is the name change.
    const dailyValue = await getNativeOptionValue(page, 'recurringScheduleOptionDaily');
    await page.testSubj.locator('recurringScheduleRepeatSelect').selectOption(dailyValue);

    await page.testSubj.click(SUBMIT_BUTTON);
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Updated maintenance window '${updatedName}'`
    );
  });

  test('shows the multiple-solutions callout when editing a MW with legacy multi-category state', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    const name = getUniqueMaintenanceWindowName('Test Maintenance Window');

    const { id } = await createMaintenanceWindow(
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
    createdMaintenanceWindowIds.push(id);

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
    const name = getUniqueMaintenanceWindowName('New Maintenance Window');

    const { id } = await createMaintenanceWindow(
      kbnClient,
      buildMwBody({
        title: name,
        scoped_query: { kql: '_id : * ', filters: [] },
        category_ids: ['management'],
      })
    );
    createdMaintenanceWindowIds.push(id);

    await openEditFlow(page, kbnUrl, name);

    await expect(page.testSubj.locator('maintenanceWindowScopeQuery')).toBeVisible();
    await expect(page.testSubj.locator(MULTIPLE_SOLUTIONS_WARNING)).toContainText(
      'Support for multiple solution categories is removed.'
    );

    await page.testSubj.click(SUBMIT_BUTTON);

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Updated maintenance window '${name}'`
    );
  });
});
