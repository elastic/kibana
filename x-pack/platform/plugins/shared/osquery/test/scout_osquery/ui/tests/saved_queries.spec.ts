/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
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
import { waitForPageReady } from '../common/constants';

const BIG_QUERY =
  'select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !="0" limit 1000;';

// FLAKY: https://github.com/elastic/kibana/issues/249946
test.describe.skip('ALL - Saved queries', { tag: ['@ess', '@svlSecurity'] }, () => {
  let caseId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const caseData = await loadCase(kbnClient, 'securitySolution');
    caseId = caseData.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test.afterAll(async ({ kbnClient }) => {
    if (caseId) {
      await cleanupCase(kbnClient, caseId);
    }
  });

  test('should create a new query and verify hidden columns, full screen, sorting, pagination, and CRUD', async ({
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    const suffix = `${Date.now()}`;
    const savedQueryId = `Saved-Query-Id-${suffix}`;
    const savedQueryDescription = `Test saved query description ${suffix}`;
    const timeout = '601';

    await page.gotoApp('osquery');
    await waitForPageReady(page);
    await page.getByText('New live query').first().click();
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
    await expect(page.getByText(/Enter fullscreen/).first()).toBeVisible();
    await resultsTableButton.click();

    await resultsTableButton.hover();
    await expect(page.getByText('Exit fullscreen').first()).toBeVisible();

    // Hidden columns — check that column selector is present
    const columnsButton = page.testSubj.locator('dataGridColumnSelectorButton');
    await columnsButton.click();
    await expect(page.locator('[data-popover-open="true"]')).toBeVisible();
    await page.testSubj.locator('dataGridColumnSelectorColumnItem-osquery.cmdline').click();
    await page.testSubj.locator('dataGridColumnSelectorColumnItem-osquery.cwd').click();
    await columnsButton.click();
    await expect(page.locator('[data-popover-open="true"]')).not.toBeVisible();

    // Pagination
    const nextPageButton = page.testSubj.locator('pagination-button-next');
    await nextPageButton.click();
    await page.testSubj
      .locator('globalLoadingIndicator')
      .waitFor({ state: 'hidden' })
      .catch(() => {});
    await nextPageButton.click();

    // Exit fullscreen
    await resultsTableButton.hover();
    await expect(page.getByText('Exit fullscreen').first()).toBeVisible();
    await resultsTableButton.click();

    // Sorting
    await page.testSubj.locator('dataGridHeaderCellActionButton-osquery.egid').click({ force: true });
    await page.getByText(/Sort A-Z/).first().click();

    // Visit Status results
    await page.testSubj.locator('osquery-status-tab').click();
    const statusRows = page.locator('tbody > tr.euiTableRow');
    await expect(statusRows).toHaveCount(2, { timeout: 30_000 });

    // Save new query
    await page.getByText('Save for later').first().click();
    await page.getByText('Save query').first().waitFor({ state: 'visible' });
    await page.locator('input[name="id"]').fill(savedQueryId);
    await page.locator('input[name="description"]').fill(savedQueryDescription);
    await page.testSubj.locator('savedQueryFlyoutSaveButton').click();
    await expect(page.getByText('Successfully saved').first()).toBeVisible({ timeout: 15_000 });

    // Play saved query
    await page.gotoApp('osquery/saved_queries');
    await waitForPageReady(page);
    await expect(page.getByText(savedQueryId).first()).toBeVisible();
    await page.locator(`[aria-label="Run ${savedQueryId}"]`).click();
    await pageObjects.liveQuery.selectAllAgents();

    // Verify timeout
    await expect(page.testSubj.locator('timeout-input')).toHaveValue(timeout);
    await pageObjects.liveQuery.submitQuery();

    // Edit saved query
    await page.getByText('Saved queries').first().click();
    await expect(page.getByText(savedQueryId).first()).toBeVisible();
    await page.locator(`[aria-label="Edit ${savedQueryId}"]`).click();
    await page.locator('input[name="description"]').fill(`${savedQueryDescription} Edited`);

    // Run in test configuration
    await page.getByText('Test configuration').first().click();
    await pageObjects.liveQuery.selectAllAgents();
    await expect(page.testSubj.locator('timeout-input')).toHaveValue(timeout);
    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();

    // Verify submit button behavior
    await expect(page.getByText('Submit').first()).not.toBeDisabled();
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
    await expect(page.getByText(`${savedQueryDescription} Edited`).first()).toBeVisible();

    // Delete saved query
    await expect(page.getByText(savedQueryId).first()).toBeVisible();
    await page.locator(`[aria-label="Edit ${savedQueryId}"]`).click();
    await pageObjects.savedQueries.deleteAndConfirm('query');
    await expect(page.getByText(savedQueryId).first()).not.toBeVisible({ timeout: 15_000 });
  });

  // Failing: See https://github.com/elastic/kibana/issues/187388
  test.skip('checks that user cant add a saved query with an ID that already exists', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.savedQueries.navigate();
    await page.getByText('Add saved query').first().click();
    await page.locator('input[name="id"]').fill('users_elastic');

    await expect(page.getByText('ID must be unique').first()).not.toBeVisible();
    await pageObjects.liveQuery.inputQuery('test');
    await page.getByText('Save query').first().click();
    await expect(page.getByText('ID must be unique').first()).toBeVisible();
  });

  test('checks default values on new saved query', async ({ page, pageObjects }) => {
    await pageObjects.savedQueries.navigate();
    await page.getByText('Add saved query').first().click();
    await expect(
      page.testSubj.locator('resultsTypeField').getByText('Snapshot')
    ).toBeVisible();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/169787
  // eslint-disable-next-line playwright/max-nested-describe
  test.describe.skip('prebuilt', () => {
    let packName: string;
    let packId: string;
    let savedQueryId: string;

    test.beforeAll(async ({ kbnClient }) => {
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

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      // Increase table page size to see all queries
      const paginationButton = page.testSubj.locator('tablePaginationPopoverButton');
      if (await paginationButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await paginationButton.click();
        await page.testSubj.locator('tablePagination-50-rows').click();
      }
    });

    test.afterAll(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
      if (savedQueryId) {
        await cleanupSavedQuery(kbnClient, savedQueryId);
      }
    });

    test('checks result type on prebuilt saved query', async ({ page }) => {
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(
        page.testSubj.locator('resultsTypeField').getByText('Snapshot')
      ).toBeVisible();
    });

    test('user can run prebuilt saved query and add to case', async ({ page, pageObjects }) => {
      await page.locator(`[aria-label="Run users_elastic"]`).click();
      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // Add to case
      const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
      await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
      await addToCaseButton.click();

      await expect(page.getByText('Select case').first()).toBeVisible();
      await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

      await expect(page.getByText(/Case .+ updated/).first()).toBeVisible({ timeout: 15_000 });
      await page.getByText('View case').first().click();
      await expect(page.getByText('SELECT * FROM users;').first()).toBeVisible();
    });

    test('user can not delete prebuilt saved query but can delete normal saved query', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.getByText('Delete query')).not.toBeVisible();
      await page.goto(kbnUrl.get(`/app/osquery/saved_queries/${savedQueryId}`));
      await waitForPageReady(page);
      await pageObjects.savedQueries.deleteAndConfirm('query');
    });

    test('user can edit prebuilt saved query under pack', async ({ page, pageObjects }) => {
      // Navigate to the pack
      await page.gotoApp(`osquery/packs`);
      await waitForPageReady(page);
      const paginationButton = page.testSubj.locator('tablePaginationPopoverButton');
      if (await paginationButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await paginationButton.click();
        await page.testSubj.locator('tablePagination-50-rows').click();
      }
      await pageObjects.packs.clickPackByName(packName);
      await pageObjects.packs.clickEditPack();

      await expect(page.getByText(`Edit ${packName}`).first()).toBeVisible();
      await pageObjects.packs.clickAddQuery();

      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();

      // Select the prebuilt saved query
      await pageObjects.packs.selectSavedQuery('users_elastic');
      await pageObjects.liveQuery.inputQuery('where name=1');

      // Change results type
      await page.testSubj.locator('resultsTypeField').click();
      await page.getByText('Differential (Ignore removals)').first().click();

      await expect(page.getByText('Unique identifier of the us').first()).toBeVisible();
      await expect(page.getByText('User ID').first()).toBeVisible();

      // Delete first ECS mapping row
      const flyout = page.locator('[aria-labelledby="flyoutTitle"]');
      const ecsMappingForm = flyout.locator('[data-test-subj="ECSMappingEditorForm"]').first();
      await ecsMappingForm.locator('[aria-label="Delete ECS mapping row"]').first().click();

      await expect(page.getByText('Unique identifier of the us').first()).not.toBeVisible();
      await expect(page.getByText('User ID').first()).not.toBeVisible();

      await flyout.getByText('Save').first().click();

      // Verify changes
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.getByText('SELECT * FROM users;where name=1').first()).toBeVisible();
      await expect(page.getByText('Unique identifier of the us.').first()).not.toBeVisible();
      await expect(page.getByText('User ID').first()).not.toBeVisible();
      await expect(page.getByText('Differential (Ignore removals)').first()).toBeVisible();

      await flyout.getByText('Cancel').first().click();
    });
  });
});
