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
          .catch(() => { });
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
      await sortButton.scrollIntoViewIfNeeded();
      await sortButton.dispatchEvent('click');
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
      await page.testSubj.locator('savedQueryFlyoutSaveButton').waitFor({ state: 'visible' });
      await page.locator('input[name="id"]').fill(savedQueryIdLocal);
      await page.locator('input[name="description"]').fill(savedQueryDescription);
      await page.testSubj.locator('savedQueryFlyoutSaveButton').click();
      await expect(
        page.testSubj.locator('globalToastList').getByText('Successfully saved')
      ).toBeVisible({ timeout: 15_000 });
      await dismissAllToasts(page);

      // Play saved query
      await page.gotoApp('osquery/saved_queries');
      await expect(page.getByText(savedQueryIdLocal)).toBeVisible();
      await page.locator(`[aria-label="Run ${savedQueryIdLocal}"]`).click();
      await pageObjects.liveQuery.selectAllAgents();

      // Verify timeout (expand Advanced to reveal timeout input)
      await pageObjects.liveQuery.clickAdvanced();
      await expect(page.testSubj.locator('timeout-input')).toHaveValue(timeout);
      await pageObjects.liveQuery.submitQuery();

      // Edit saved query
      await page.gotoApp('osquery/saved_queries');
      await expect(page.getByText(savedQueryIdLocal)).toBeVisible();
      await page.locator(`[aria-label="Edit ${savedQueryIdLocal}"]`).click();
      await waitForPageReady(page);
      await page.locator('input[name="description"]').fill(`${savedQueryDescription} Edited`);

      // Run in test configuration
      await page.getByRole('button', { name: 'Test configuration' }).click();
      const playgroundFlyout = page.testSubj.locator('osquery-save-query-flyout');
      await playgroundFlyout.waitFor({ state: 'visible', timeout: 15_000 });

      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.clickAdvanced();
      await expect(
        playgroundFlyout
          .locator('[data-test-subj="advanced-accordion-content"]')
          .locator('[data-test-subj="timeout-input"]')
      ).toHaveValue(timeout);

      // The EuiBottomBar ("Update query") overlays the flyout's submit button.
      // Scroll the flyout body to bring the submit button into view, then click directly.
      const flyoutSubmitButton = playgroundFlyout.locator(
        '[data-test-subj="liveQuerySubmitButton"]'
      );
      await flyoutSubmitButton.waitFor({ state: 'visible', timeout: 15_000 });
      await flyoutSubmitButton.evaluate((el) => el.scrollIntoView({ block: 'center' }));

      const [submitResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/osquery/live_queries') && resp.request().method() === 'POST',
          { timeout: 30_000 }
        ),
        flyoutSubmitButton.dispatchEvent('click'),
      ]);
      const submitStatus = submitResponse.status();
      if (submitStatus !== 200) {
        const body = await submitResponse.text().catch(() => 'Unable to read body');
        throw new Error(`Live query submission failed with status ${submitStatus}: ${body}`);
      }

      await pageObjects.liveQuery.checkResults();

      // Verify submit button is still functional
      await expect(
        playgroundFlyout.locator('[data-test-subj="liveQuerySubmitButton"]')
      ).not.toBeDisabled();

      // Save edited — close the playground flyout first
      await playgroundFlyout.locator('[data-test-subj="euiFlyoutCloseButton"]').click();
      await playgroundFlyout.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => { });
      await page.testSubj.locator('update-query-button').click();
      await expect(page.getByText(`${savedQueryDescription} Edited`)).toBeVisible();
      await dismissAllToasts(page);

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
      await page.getByRole('link', { name: 'Add saved query' }).click();
      await waitForPageReady(page);
      await page.locator('input[name="id"]').fill('users_elastic');

      await pageObjects.liveQuery.inputQuery('test');
      await page.getByRole('button', { name: 'Save query' }).click();
      await expect(page.getByText('ID must be unique')).toBeVisible({ timeout: 15_000 });
    });

    test('checks default values on new saved query', async ({ page, pageObjects }) => {
      await pageObjects.savedQueries.navigate();
      await page.getByRole('link', { name: 'Add saved query' }).click();
      await waitForPageReady(page);
      await expect(page.testSubj.locator('resultsTypeField').getByText('Snapshot')).toBeVisible({
        timeout: 15_000,
      });
    });

    test('checks result type on prebuilt saved query', async ({ page, pageObjects }) => {
      await page.gotoApp('osquery/saved_queries');
      await pageObjects.packs.ensureAllPacksVisible();
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.testSubj.locator('resultsTypeField').getByText('Snapshot')).toBeVisible();
    });

    test('user can run prebuilt saved query and add to case', async ({ page, pageObjects }) => {
      await page.gotoApp('osquery/saved_queries');
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

      const caseToast = page.testSubj.locator('globalToastList').getByText(/Case .+ updated/);
      await expect(caseToast).toBeVisible({ timeout: 15_000 });

      // Navigate to the case directly since the toast link may auto-dismiss
      await page.gotoApp(`security/cases/${caseId}`);
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
      await pageObjects.packs.ensureAllPacksVisible();
      await page.locator(`[aria-label="Edit users_elastic"]`).click();
      await expect(page.getByText('Delete query')).not.toBeVisible();
      await page.goto(kbnUrl.get(`/app/osquery/saved_queries/${savedQueryId}`));
      await pageObjects.savedQueries.deleteAndConfirm('query');
    });

    test('user can edit prebuilt saved query under pack', async ({ page, pageObjects }) => {
      test.setTimeout(120_000);
      await page.gotoApp('osquery/saved_queries');
      await pageObjects.packs.ensureAllPacksVisible();
      await pageObjects.packs.navigateToPackDetail(packId);
      await pageObjects.packs.clickEditPack();

      await expect(page.getByText(`Edit ${packName}`)).toBeVisible();
      await pageObjects.packs.clickAddQuery();

      await expect(page.getByText('Attach next query')).toBeVisible();
      await page.testSubj
        .locator('globalLoadingIndicator')
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => { });
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible({ timeout: 15_000 });

      await pageObjects.packs.selectSavedQuery('users_elastic');

      // Set the modified query via Monaco editor API
      // The Monaco textarea doesn't respond to keyboard shortcuts reliably
      const flyoutEditor = page
        .locator('[aria-labelledby="flyoutTitle"]')
        .locator('[data-test-subj="kibanaCodeEditor"]');
      await flyoutEditor.waitFor({ state: 'visible', timeout: 15_000 });

      await page.evaluate(() => {
        const monacoEnv = (window as any).MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const models = monacoEnv.monaco.editor.getModels();
        for (const model of models) {
          if (model.getValue().includes('SELECT * FROM users')) {
            model.setValue('SELECT * FROM users;where name=1');
            break;
          }
        }
      });
      // eslint-disable-next-line playwright/no-wait-for-timeout -- allow debounced onChange (500ms) to propagate to form
      await page.waitForTimeout(1000);

      await page.testSubj.locator('resultsTypeField').click();
      await page.getByRole('option', { name: 'Differential (Ignore removals)' }).click();

      const addQueryFlyout = page.locator('[aria-labelledby="flyoutTitle"]');
      const ecsMappingForm = addQueryFlyout
        .locator('[data-test-subj="ECSMappingEditorForm"]')
        // eslint-disable-next-line playwright/no-nth-methods -- multiple ECS mapping forms exist for prebuilt queries
        .first();
      await ecsMappingForm.waitFor({ state: 'visible', timeout: 60_000 });
      await addQueryFlyout
        .locator('[aria-label="Delete ECS mapping row"]')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting first ECS mapping delete row
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
      await expect(addQueryFlyout.getByText('User ID')).toBeVisible({ timeout: 60_000 });

      await addQueryFlyout
        .locator('[aria-label="Delete ECS mapping row"]')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting the first delete ECS mapping row
        .first()
        .click();
      await expect(addQueryFlyout.getByText('User ID')).not.toBeVisible({
        timeout: 10_000,
      });

      await addQueryFlyout.getByRole('button', { name: 'Save' }).click();
      await addQueryFlyout.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => { });

      const editButton = page.locator(`[aria-label="Edit users_elastic"]`);
      await editButton.waitFor({ state: 'visible', timeout: 15_000 });
      await editButton.click();
      const editFlyout = page.locator('[aria-labelledby="flyoutTitle"]');
      await editFlyout.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(editFlyout.getByText('SELECT * FROM users;where name=1')).toBeVisible({
        timeout: 15_000,
      });
      await expect(editFlyout.getByText('User ID')).not.toBeVisible({ timeout: 10_000 });
      await expect(editFlyout.getByText('Differential (Ignore removals)')).toBeVisible();

      await editFlyout.getByRole('button', { name: 'Cancel' }).click();
    });
  }
);
