/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { getMinimalSavedQuery } from '../../api/fixtures/constants';
import { cleanOsquerySavedQueriesByPrefix } from '../helpers/defensive_cleanup';

const mkiTags = [...tags.stateful.classic, ...tags.serverless.security.complete];
const SAVED_QUERY_PREFIXES = ['scout-sq-create-', 'scout-sq-edit-', 'scout-sq-delete-'];

test.describe('Saved queries CRUD from UI', { tag: mkiTags }, () => {
  // Track user-visible saved-query IDs created during each test so `afterEach`
  // can resolve them back to saved-object ids via the list endpoint and remove
  // them. UI-driven creates don't expose the SO id, so the list lookup is the
  // only cleanup path that works for every creation flow in this suite.
  const createdSavedQueryLabels: string[] = [];

  test.beforeAll(async ({ apiServices }) => {
    // Defensive: a prior crashed run can leave `scout-sq-*` custom queries
    // behind. The list endpoint includes prebuilts (~80) so prefix-matching
    // only touches the handful of test-specific labels.
    await cleanOsquerySavedQueriesByPrefix(apiServices, SAVED_QUERY_PREFIXES);
  });

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

    // NOTE: the dedicated create page (`/app/osquery/saved_queries/new`) does
    // NOT render the "Advanced" accordion the live-query form uses — timeout,
    // ECS mapping, and pack-config sections are always expanded. Do not call
    // `clickAdvanced()` here.
    await pageObjects.osqueryEcsMappingEditor.typeEcsField('host.name{downArrow}{enter}');
    await pageObjects.osqueryEcsMappingEditor.typeColumnValue('name{downArrow}{enter}');

    // The create page renders the save button in an `EuiBottomBar` with only a
    // visible "Save query" label; there is no `data-test-subj` on it. Target
    // via role + name, scoped into the form's bottom bar.
    // (source: `public/routes/saved_queries/new/form.tsx:72-85`)
    await page.getByRole('button', { name: 'Save query' }).click();
    await expect(page.getByText(/Successfully saved/)).toBeVisible({ timeout: 30_000 });

    createdSavedQueryLabels.push(savedQueryId);

    // Confirm the saved query landed in the list view.
    await pageObjects.osquerySavedQuery.navigateToList();
    await expect(page.getByText(savedQueryId)).toBeVisible({ timeout: 30_000 });
  });

  test('edits an existing saved query description from the UI', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
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
    test.setTimeout(180_000);

    const created = await apiServices.osquery.savedQueries.create(
      getMinimalSavedQuery({ id: `scout-sq-delete-${Date.now()}` })
    );
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    // UI test deletes this one via the form; list-based cleanup in afterEach
    // handles it idempotently if the UI delete races with teardown.
    createdSavedQueryLabels.push(inner.id);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osquerySavedQuery.navigateToList();

    // osquery_manager ships ~80 prebuilt saved queries. With page size 50, the
    // alphabetically-late `users_elastic` lives on page 2. The Cypress version
    // navigated directly via the pagination button — same approach here. The
    // search box is unreliable as a filter (typing into it doesn't always
    // narrow the EUI table on the first run), so we page-through instead.
    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();
    await page.testSubj.locator('pagination-button-1').click();
    await expect(page.getByRole('button', { name: 'Run users_elastic' })).toBeVisible({
      timeout: 30_000,
    });

    await pageObjects.osquerySavedQuery.openRowActionsMenu('users_elastic');
    await pageObjects.osquerySavedQuery.chooseEditQuery();
    // Prebuilt queries hide "Delete query" — the fact that the button is absent
    // is the contract we're asserting. The edit view is a dedicated route
    // (`/app/osquery/saved_queries/{id}/edit`), not a flyout with Cancel — so
    // we navigate directly to the custom query's edit page instead of hunting
    // for a Cancel button. This matches the Cypress reference which does
    // `navigateTo('/app/osquery/saved_queries/{savedObjectId}')` at the same
    // point in the flow.
    await expect(page.getByRole('button', { name: 'Delete query' })).toBeHidden();

    await page.gotoApp(`osquery/saved_queries/${inner.saved_object_id}`);
    await page.getByRole('button', { name: 'Delete query' }).click();
    await pageObjects.osquerySavedQuery.confirmDeleteModal();
    await pageObjects.osquerySavedQuery.navigateToList();
    await expect(page.getByText(inner.id)).toBeHidden({ timeout: 30_000 });
  });

  test('paginates the saved queries list when size changes', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(120_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osquerySavedQuery.navigateToList();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('50');
  });
});
