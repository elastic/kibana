/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import {
  loadCase,
  cleanupCase,
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
} from '../common/api_helpers';
import { dismissAllToasts, waitForPageReady } from '../common/constants';

const BIG_QUERY =
  'select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !="0" limit 1000;';

test.describe(
  'ALL - Saved queries',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let caseId: string;
    let packName: string;
    let packId: string;
    let savedQueryId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const caseData = await loadCase(kbnClient, 'securitySolution');

      caseId = caseData.id;

      const pack = await loadPack(kbnClient, {
        queries: {
          test: {
            interval: 10,
            query: 'select * from uptime;',
            ecs_mapping: {},
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;

      const sq = await loadSavedQuery(kbnClient);
      savedQueryId = sq.saved_object_id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test.afterAll(async ({ kbnClient }) => {
      if (caseId) {
        await cleanupCase(kbnClient, caseId);
      }

      if (packId) {
        await cleanupPack(kbnClient, packId);
      }

      if (savedQueryId) {
        await cleanupSavedQuery(kbnClient, savedQueryId);
      }
    });

    test('should create a new query and verify hidden columns, full screen, sorting, pagination, and CRUD', async ({
      page,
      pageObjects,
    }) => {
      test.setTimeout(300_000);
      const suffix = `${Date.now()}`;
      const savedQueryIdLocal = `Saved-Query-Id-${suffix}`;
      const savedQueryDescription = `Test saved query description ${suffix}`;
      const timeout = '601';

      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await page.testSubj.locator('newLiveQueryButton').click();
      await waitForPageReady(page);

      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.inputQuery(BIG_QUERY);

      // Set timeout via Advanced
      await pageObjects.liveQuery.clickAdvanced();
      await pageObjects.liveQuery.fillInQueryTimeout(timeout);

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // Enter fullscreen
      const resultsTableButton = page.testSubj.locator('dataGridFullScreenButton');
      await resultsTableButton.hover();
      await expect(page.getByRole('button', { name: /Enter fullscreen/ })).toBeVisible();
      await resultsTableButton.click();

      await resultsTableButton.hover();
      await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();

      // Hidden columns — check that column selector is present
      const columnsButton = page.testSubj.locator('dataGridColumnSelectorButton');
      await columnsButton.click();
      await expect(page.locator('[data-popover-open="true"]')).toBeVisible();
      await page.testSubj.locator('dataGridColumnSelectorColumnItem-osquery.cmdline').click();
      await page.testSubj.locator('dataGridColumnSelectorColumnItem-osquery.path').click();
      await columnsButton.click();
      await expect(page.locator('[data-popover-open="true"]')).not.toBeVisible();

      // Pagination (only if there are multiple pages of results)
      const nextPageButton = page.testSubj.locator('pagination-button-next');
      if (await nextPageButton.isEnabled({ timeout: 5_000 }).catch(() => false)) {
        await nextPageButton.click();
        await page.testSubj
          .locator('globalLoadingIndicator')
          .waitFor({ state: 'hidden' })
          .catch(() => {});
      }

      // Exit fullscreen
      await resultsTableButton.hover();
      await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
      await resultsTableButton.click();

      // Sorting — use first column header action when sortable columns exist
      const sortButton = page
        .locator('[data-test-subj^="dataGridHeaderCellActionButton-"]')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting the first sortable column
        .first();
      await sortButton.waitFor({ state: 'visible', timeout: 5_000 });
      await sortButton.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(sortButton).toBeInViewport();
      await sortButton.click({ force: true });
      const sortAZ = page.getByRole('menuitem', { name: /Sort A-Z/ });
      if (await sortAZ.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sortAZ.click();
      } else {
        await page.keyboard.press('Escape');
      }

      // Visit Status results
      await page.testSubj.locator('osquery-status-tab').click();
      const statusRows = page.locator('tbody > tr.euiTableRow');
      await expect(statusRows).toHaveCount(2, { timeout: 30_000 });

      // Save new query
      await page.getByRole('button', { name: 'Save for later' }).click();
      await page.getByRole('button', { name: 'Save query' }).waitFor({ state: 'visible' });
      await page.locator('input[name="id"]').fill(savedQueryIdLocal);
      await page.locator('input[name="description"]').fill(savedQueryDescription);
      await page.testSubj.locator('savedQueryFlyoutSaveButton').click();
      await expect(
        page.testSubj.locator('globalToastList').getByText('Successfully saved')
      ).toBeVisible({ timeout: 15_000 });
      await dismissAllToasts(page);

      // Play saved query
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      await expect(page.getByText(savedQueryIdLocal)).toBeVisible();
      await page.locator(`[aria-label="Run ${savedQueryIdLocal}"]`).click();
      await pageObjects.liveQuery.selectAllAgents();

      // Verify timeout (expand Advanced to reveal timeout input)
      await pageObjects.liveQuery.clickAdvanced();
      await expect(page.testSubj.locator('timeout-input')).toHaveValue(timeout);
      await pageObjects.liveQuery.submitQuery();

      // Edit saved query
      await page.getByRole('link', { name: 'Saved queries' }).click();
      await expect(page.getByText(savedQueryIdLocal)).toBeVisible();
      await page.locator(`[aria-label="Edit ${savedQueryIdLocal}"]`).click();
      await page.locator('input[name="description"]').fill(`${savedQueryDescription} Edited`);

      // Run in test configuration
      await page.getByRole('button', { name: 'Test configuration' }).click();
      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.clickAdvanced();
      await expect(page.testSubj.locator('timeout-input')).toHaveValue(timeout);
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // Verify submit button behavior
      await expect(page.testSubj.locator('liveQuerySubmitButton')).not.toBeDisabled();
      const flyout = page.testSubj.locator('osquery-save-query-flyout');
      await expect(flyout.getByText('Query is a required field')).not.toBeVisible();

      // Clear the query and verify validation
      await pageObjects.liveQuery.clearAndInputQuery('');
      await expect(flyout.getByText('Query is a required field')).toBeVisible();
      await pageObjects.liveQuery.inputQuery(BIG_QUERY);
      await expect(flyout.getByText('Query is a required field')).not.toBeVisible();

      // Save edited
      await page.testSubj.locator('euiFlyoutCloseButton').click();
      await page.testSubj.locator('update-query-button').click();
      await expect(page.getByText(`${savedQueryDescription} Edited`)).toBeVisible();

      // Delete saved query
      await expect(page.getByText(savedQueryIdLocal)).toBeVisible();
      await page.locator(`[aria-label="Edit ${savedQueryIdLocal}"]`).click();
      await pageObjects.savedQueries.deleteAndConfirm('query');
      await expect(page.getByText(savedQueryIdLocal)).not.toBeVisible({ timeout: 15_000 });
    });

    test('checks that user cant add a saved query with an ID that already exists', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.savedQueries.navigate();
      await page.getByRole('button', { name: 'Add saved query' }).click();
      await page.locator('input[name="id"]').fill('users_elastic');

      await expect(page.getByText('ID must be unique')).not.toBeVisible();
      await pageObjects.liveQuery.inputQuery('test');
      await page.getByRole('button', { name: 'Save query' }).click();
      await expect(page.getByText('ID must be unique')).toBeVisible();
    });

    test('checks default values on new saved query', async ({ page, pageObjects }) => {
      await pageObjects.savedQueries.navigate();
      await page.getByRole('button', { name: 'Add saved query' }).click();
      await expect(page.testSubj.locator('resultsTypeField').getByText('Snapshot')).toBeVisible();
    });

    test('checks result type on prebuilt saved query', async ({ page, pageObjects }) => {
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      await pageObjects.packs.ensureAllPacksVisible();
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.testSubj.locator('resultsTypeField').getByText('Snapshot')).toBeVisible();
    });

    test('user can run prebuilt saved query and add to case', async ({ page, pageObjects }) => {
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      await pageObjects.packs.ensureAllPacksVisible();
      await page.locator(`[aria-label="Run users_elastic"]`).click();
      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // eslint-disable-next-line playwright/no-nth-methods -- first visible result
      const addToCaseButton = page.testSubj.locator('addToCaseButton').first();
      await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
      await addToCaseButton.click();

      await expect(page.getByText('Select case')).toBeVisible({ timeout: 15_000 });
      const caseRowSelect = page.testSubj.locator(`cases-table-row-select-${caseId}`);
      await caseRowSelect.waitFor({ state: 'visible', timeout: 30_000 });
      await caseRowSelect.click();

      await expect(
        page.testSubj.locator('globalToastList').getByText(/Case .+ updated/)
      ).toBeVisible({ timeout: 15_000 });
      await page.getByRole('link', { name: 'View case' }).click();
      await expect(page.getByText('SELECT * FROM users;')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('user can not delete prebuilt saved query but can delete normal saved query', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      await pageObjects.packs.ensureAllPacksVisible();
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.getByText('Delete query')).not.toBeVisible();
      await page.goto(kbnUrl.get(`/app/osquery/saved_queries/${savedQueryId}`));
      await waitForPageReady(page);
      await pageObjects.savedQueries.deleteAndConfirm('query');
    });

    test('user can edit prebuilt saved query under pack', async ({ page, pageObjects }) => {
      test.setTimeout(120_000);
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      await pageObjects.packs.ensureAllPacksVisible();
      await pageObjects.packs.navigateToPackDetail(packId);
      await pageObjects.packs.clickEditPack();

      await expect(page.getByText(`Edit ${packName}`)).toBeVisible();
      await pageObjects.packs.clickAddQuery();

      await expect(page.getByText('Attach next query')).toBeVisible();
      await page.testSubj
        .locator('globalLoadingIndicator')
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {});
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible({ timeout: 15_000 });

      await pageObjects.packs.selectSavedQuery('users_elastic');
      await pageObjects.liveQuery.inputQuery('where name=1');

      await page.testSubj.locator('resultsTypeField').click();
      await page.getByRole('option', { name: 'Differential (Ignore removals)' }).click();

      const addQueryFlyout = page.locator('[aria-labelledby="flyoutTitle"]');
      const ecsMappingForm = addQueryFlyout.locator('[data-test-subj="ECSMappingEditorForm"]');
      await ecsMappingForm.waitFor({ state: 'visible', timeout: 60_000 });
      await ecsMappingForm
        .locator('[aria-label="Delete ECS mapping row"]')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting first ECS mapping delete row
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
      await expect(addQueryFlyout.getByText('User ID')).toBeVisible({ timeout: 60_000 });

      await ecsMappingForm
        .locator('[aria-label="Delete ECS mapping row"]')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting the first delete ECS mapping row
        .first()
        .click();
      await expect(addQueryFlyout.getByText('User ID')).not.toBeVisible({
        timeout: 10_000,
      });

      await addQueryFlyout.getByRole('button', { name: 'Save' }).click();
      await addQueryFlyout.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

      const editButton = page.locator(`[aria-label="Edit users_elastic"]`);
      await editButton.waitFor({ state: 'visible', timeout: 15_000 });
      await editButton.click();
      await expect(page.getByText('SELECT * FROM users;where name=1')).toBeVisible({
        timeout: 15_000,
      });
      const editFlyout = page.locator('[aria-labelledby="flyoutTitle"]');
      await expect(editFlyout.getByText('User ID')).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Differential (Ignore removals)')).toBeVisible();

      await editFlyout.getByRole('button', { name: 'Cancel' }).click();
    });
  }
);
