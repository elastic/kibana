/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { getMinimalLiveQuery } from '../../api/fixtures/constants';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Live query history', { tag: localTags }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);

    // Seed two history rows so the "Details" and "Run query" affordances both
    // appear on the first page of history, independent of prior test state.
    // Live-query actions are ephemeral records, not persistent SOs, so no
    // cleanup is required here — they age out of history naturally.
    let lastSeedActionId: string | undefined;
    for (let i = 0; i < 2; i++) {
      const seed = await apiServices.osquery.liveQueries.create(
        getMinimalLiveQuery({
          query: `select * from uptime; -- history-seed-${Date.now()}-${i}`,
          agent_all: true,
        })
      );
      lastSeedActionId = (seed.data as { data?: { action_id?: string } }).data?.action_id;
    }

    // Wait only on the most recent seed — once it completes, the earlier one
    // has necessarily completed too (agent serializes queries, and both seeds
    // share the same agent pool), so a single wait covers both.
    if (lastSeedActionId) {
      await waitForLiveQueryComplete(kbnClient, lastSeedActionId);
    }
  });

  test('re-runs the most recent query from history and restores its editor state', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 5 min: agent-dependent submit + results + history page + re-run flow.
    test.setTimeout(300_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    await pageObjects.osqueryLiveQueryForm.selectAllAgents();

    // Use a query body with a unique marker so we can assert it survived
    // through submit → history → re-run regardless of what's already in
    // history. NOTE: we deliberately avoid the saved-query dropdown here —
    // selecting a saved query fires a React effect that overwrites Monaco
    // AFTER our `clearAndInputQuery`, leaving form state out of sync with
    // the editor and causing the previous "uptime" submission instead of our
    // overwrite. The "re-run from history" contract doesn't depend on the
    // dropdown path; a plain typed-query submission exercises the same code.
    const uniqueMarker = `scout-history-${Date.now()}`;
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery(`select '${uniqueMarker}';`);
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('601');
    const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
    if (actionId) {
      await waitForLiveQueryComplete(kbnClient, actionId);
    }

    await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();

    await pageObjects.osqueryNavigation.gotoHistory();
    // eslint-disable-next-line playwright/no-nth-methods -- re-run the most recent history entry, which is the one we just submitted
    await page.locator('[aria-label="Run query"]').first().click();

    await expect(pageObjects.osqueryLiveQueryForm.queryEditor).toContainText(uniqueMarker, {
      timeout: 30_000,
    });
  });

  test('opens query details from history and surfaces the submitted query body', async ({
    apiServices,
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 3 min: API-seeded history row + UI details-panel open assertions.
    test.setTimeout(180_000);

    // Seed a dedicated history row with a unique marker in THIS test so we
    // don't rely on ordering from test 1's submission or the `beforeAll`
    // seeds — both of which could land on or off the first page depending on
    // sort + prior state.
    const detailsMarker = `scout-details-${Date.now()}`;
    const seed = await apiServices.osquery.liveQueries.create(
      getMinimalLiveQuery({
        query: `select '${detailsMarker}';`,
        agent_all: true,
      })
    );
    const seedActionId = (seed.data as { data?: { action_id?: string } }).data?.action_id;
    if (seedActionId) {
      await waitForLiveQueryComplete(kbnClient, seedActionId);
    }

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoHistory();

    // eslint-disable-next-line playwright/no-nth-methods -- open details for the most-recent history row (our just-seeded entry)
    await page.locator('[aria-label="Details"]').first().click();
    await expect(page.getByText('View history')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(detailsMarker)).toBeVisible({ timeout: 30_000 });
  });

  test('paginates the query history list and renders seeded rows at the selected size', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 3 min: history page load on a list that may include a large seed set.
    test.setTimeout(180_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoHistory();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-10-rows').click();

    // Assert both (a) the page-size control reflects the selection AND (b) the
    // underlying table rendered at the chosen size. Row count is bounded above
    // by 10 (the selected page size) and below by 2 (the seeds in beforeAll).
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('10');
    const historyRowCount = await page.locator('[aria-label="Details"]').count();
    expect(historyRowCount).toBeGreaterThanOrEqual(2);
    expect(historyRowCount).toBeLessThanOrEqual(10);
  });
});
