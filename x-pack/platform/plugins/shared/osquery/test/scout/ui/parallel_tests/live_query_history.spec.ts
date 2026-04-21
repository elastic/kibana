/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { getMinimalLiveQuery, getMinimalSavedQuery } from '../../api/fixtures/constants';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Live query history', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);
    const created = await apiServices.osquery.savedQueries.create(
      getMinimalSavedQuery({
        id: `scout-history-sq-${Date.now()}`,
        query: 'select * from uptime;',
        interval: '3600',
      })
    );
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    savedQueryId = inner.saved_object_id;
    savedQueryLabel = inner.id;

    // Seed two history rows so the "Details" and "Run query" affordances both
    // appear on the first page of history, independent of prior test state.
    // Live-query actions are ephemeral records, not persistent SOs, so no
    // cleanup is required here — they age out of history naturally.
    for (let i = 0; i < 2; i++) {
      await apiServices.osquery.liveQueries.create(
        getMinimalLiveQuery({
          query: `select * from uptime; -- history-seed-${Date.now()}-${i}`,
          agent_all: true,
        })
      );
    }
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.osquery.savedQueries.delete(savedQueryId);
  });

  test('re-runs a customized saved query from history and restores its editor state', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);

    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    await pageObjects.osqueryLiveQueryForm.selectAllAgents();

    // Pick the saved query from the dropdown, then overwrite the body so we can
    // later assert that history re-run restores the overwritten text (not the
    // saved-query default).
    const savedQueryDropdown = page.testSubj.locator('savedQuerySelect');
    await savedQueryDropdown.getByTestId('comboBoxSearchInput').click();
    await savedQueryDropdown.getByTestId('comboBoxSearchInput').pressSequentially(savedQueryLabel);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from users;');
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('601');
    await pageObjects.osqueryLiveQueryForm.submitQuery();
    await pageObjects.osqueryLiveQueryForm.waitForResults();

    await pageObjects.osqueryNavigation.gotoHistory();
    // eslint-disable-next-line playwright/no-nth-methods -- re-run the most recent history entry, which is the one we just submitted
    await page.locator('[aria-label="Run query"]').first().click();

    // Editor should reflect the custom body submitted above, not the saved query's default.
    await expect(pageObjects.osqueryLiveQueryForm.queryEditor).toContainText(
      'select * from users;',
      { timeout: 30_000 }
    );
  });

  test('opens query details from history and surfaces the submitted query body', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(180_000);

    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoHistory();

    // eslint-disable-next-line playwright/no-nth-methods -- open details for the first history row
    await page.locator('[aria-label="Details"]').first().click();
    await expect(page.getByText('View history')).toBeVisible({ timeout: 30_000 });
    // The details pane renders the submitted query inline; the `uptime` literal is
    // unique to the seeded queries so it's a reliable signal without coupling to
    // full SQL text (which differs across re-run tests in the same spec).
    await expect(page.getByText(/from uptime/)).toBeVisible({ timeout: 30_000 });
  });

  test('paginates the query history list', async ({ browserAuth, page, pageObjects }) => {
    test.setTimeout(180_000);

    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoHistory();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-10-rows').click();

    // The history table always renders at least the rows seeded above; pagination
    // controls must be present (even if there's only one page when only 2 rows
    // exist — the pagination popover is always rendered).
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('10');
  });
});
