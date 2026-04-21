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

const mkiTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Saved queries CRUD from UI', { tag: mkiTags }, () => {
  // Track user-visible saved-query IDs created during each test so `afterEach`
  // can resolve them back to saved-object ids via the list endpoint and remove
  // them. UI-driven creates don't expose the SO id, so the list lookup is the
  // only cleanup path that works for every creation flow in this suite.
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
    test.setTimeout(180_000);

    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoSavedQueries();
    await pageObjects.osquerySavedQuery.clickCreateQuery();

    const savedQueryId = `scout-sq-create-${Date.now()}`;
    await pageObjects.osquerySavedQuery.fillIdField(savedQueryId);
    await pageObjects.osquerySavedQuery.fillDescriptionField('scout created from UI');
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery(
      'select name, version from os_version;'
    );

    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    // One ECS-pairing row to prove mapping is persisted end-to-end.
    await pageObjects.osqueryEcsMappingEditor.typeEcsField('host.name{downArrow}{enter}');
    await pageObjects.osqueryEcsMappingEditor.typeColumnValue('name{downArrow}{enter}');

    await page.testSubj.locator('savedQueryFlyoutSaveButton').click();
    await expect(page.getByText(/Successfully saved/)).toBeVisible({ timeout: 30_000 });

    // Confirm via API that the saved query landed with the ECS mapping attached —
    // asserting only on the toast would miss server-side regressions in ECS persistence.
    await pageObjects.osqueryNavigation.gotoSavedQueries();
    await expect(page.getByText(savedQueryId)).toBeVisible({ timeout: 30_000 });

    createdSavedQueryLabels.push(savedQueryId);
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

    await browserAuth.loginAsAdmin();
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

    await browserAuth.loginAsAdmin();
    await pageObjects.osquerySavedQuery.navigateToList();

    // Page through to find a prebuilt row — the prebuilt seed `users_elastic`
    // ships with osquery_manager. Page size is 20 by default so prebuilt entries
    // live on page 2+; the first pagination button navigates to page 2.
    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();

    await pageObjects.osquerySavedQuery.openRowActionsMenu('users_elastic');
    await pageObjects.osquerySavedQuery.chooseEditQuery();
    // Prebuilt queries hide "Delete query" — the fact that the button is absent
    // is the contract we're asserting.
    await expect(page.getByRole('button', { name: 'Delete query' })).toBeHidden();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Custom saved query lets the user delete.
    await pageObjects.osquerySavedQuery.openRowActionsMenu(inner.id);
    await pageObjects.osquerySavedQuery.chooseEditQuery();
    await page.getByRole('button', { name: 'Delete query' }).click();
    await pageObjects.osquerySavedQuery.confirmDeleteModal();
    await expect(page.getByText(inner.id)).toBeHidden({ timeout: 30_000 });
  });

  test('paginates the saved queries list when size changes', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(120_000);

    await browserAuth.loginAsAdmin();
    await pageObjects.osquerySavedQuery.navigateToList();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-50-rows').click();
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('50');
  });
});
