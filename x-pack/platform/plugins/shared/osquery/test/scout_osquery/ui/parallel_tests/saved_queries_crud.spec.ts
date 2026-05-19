/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { getMinimalSavedQuery } from '../../api/fixtures/constants';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';

test.describe('Saved queries CRUD from UI', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  const createdSavedQueryLabels: string[] = [];

  test.afterEach(async ({ apiServices }) => {
    const labels = createdSavedQueryLabels.splice(0);
    if (labels.length === 0) return;

    const list = await apiServices.osquery.savedQueries.list();
    const items =
      (list.data as { data?: Array<{ id: string; saved_object_id: string }> }).data ?? [];

    for (const label of labels) {
      const match = items.find((item) => item.id === label);
      if (match) {
        await apiServices.osquery.savedQueries.delete(match.saved_object_id);
      }
    }
  });

  test('creates a saved query with ECS mapping from the UI', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 3 min: create form + ECS mapping combobox.
    test.setTimeout(180_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoSavedQueries();
    await pageObjects.osquerySavedQuery.clickCreateQuery();

    const savedQueryId = `scout-sq-create-${Date.now()}`;
    await pageObjects.osquerySavedQuery.fillIdField(savedQueryId);
    await pageObjects.osquerySavedQuery.fillDescriptionField('scout created from UI');
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery(
      'select name, version from os_version;'
    );

    // Saved query /new page has sections expanded — no clickAdvanced().
    await pageObjects.osqueryEcsMappingEditor.typeEcsField('host.name{downArrow}{enter}');
    await pageObjects.osqueryEcsMappingEditor.typeColumnValue('name{downArrow}{enter}');

    // Bottom bar "Save query" has no test-subj — role + name.
    await page.getByRole('button', { name: 'Save query' }).click();
    await expect(page.getByText(/Successfully saved/)).toBeVisible({ timeout: 30_000 });

    createdSavedQueryLabels.push(savedQueryId);

    await pageObjects.osquerySavedQuery.navigateToList();
    await expect(page.getByText(savedQueryId)).toBeVisible({ timeout: 30_000 });
  });

  test('edits an existing saved query description from the UI', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // 3 min: edit flow.
    test.setTimeout(180_000);

    const created = await apiServices.osquery.savedQueries.create(
      getMinimalSavedQuery({
        id: `scout-sq-edit-${Date.now()}`,
        description: 'original description',
      })
    );
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    createdSavedQueryLabels.push(inner.id);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osquerySavedQuery.navigateToList();
    await pageObjects.osquerySavedQuery.openRowActionsMenu(inner.id);
    await pageObjects.osquerySavedQuery.chooseEditQuery();

    await pageObjects.osquerySavedQuery.fillDescriptionField('edited from scout');
    await pageObjects.osquerySavedQuery.clickUpdateButton();
    await expect(page.getByText('edited from scout')).toBeVisible({ timeout: 30_000 });
  });

  test('blocks deletion of prebuilt saved queries but allows deleting custom ones', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // 3 min: prebuilt vs custom delete contract.
    test.setTimeout(180_000);

    const created = await apiServices.osquery.savedQueries.create(
      getMinimalSavedQuery({ id: `scout-sq-delete-${Date.now()}` })
    );
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    createdSavedQueryLabels.push(inner.id);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osquerySavedQuery.navigateToList();

    // users_elastic is on page 2 at size 50; page instead of flaky search filter.
    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();
    await page.testSubj.locator('pagination-button-1').click();
    await expect(page.getByRole('button', { name: 'Run users_elastic' })).toBeVisible({
      timeout: 30_000,
    });

    await pageObjects.osquerySavedQuery.openRowActionsMenu('users_elastic');
    await pageObjects.osquerySavedQuery.chooseEditQuery();
    // Prebuilt edit view: Delete hidden. Navigate by SO id to custom query for delete.
    await expect(page.getByRole('button', { name: 'Delete query' })).toBeHidden();

    await page.gotoApp(`osquery/saved_queries/${inner.saved_object_id}`);
    await page.getByRole('button', { name: 'Delete query' }).click();
    await pageObjects.osquerySavedQuery.confirmDeleteModal();
    await pageObjects.osquerySavedQuery.navigateToList();
    await expect(page.getByText(inner.id)).toBeHidden({ timeout: 30_000 });
  });

  test('paginates the saved queries list and renders 50 rows at the selected size', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(120_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osquerySavedQuery.navigateToList();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();

    // ~80 prebuilts: at page size 50, first page shows exactly 50 rows.
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('50');
    await expect(pageObjects.osquerySavedQuery.savedQueriesTable.locator('tbody tr')).toHaveCount(
      50,
      { timeout: 30_000 }
    );
  });
});
