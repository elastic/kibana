/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { getMinimalLiveQuery } from '../../api/fixtures/constants';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { mockFleetAgents } from '../helpers/data_loaders';

// Stable synthesized agent id used by all Tier-A API-driven live-query seeds in
// this spec. The osquery route's `parseAgentSelection` skips Fleet's
// `.fleet-agents` lookup whenever `agent_all: false` and explicit `agent_ids`
// are provided (`server/lib/parse_agent_groups.ts`); the id itself is never
// dereferenced because we never wait on real agent responses in these history
// flows.
const TIER_A_SEED_AGENT_ID = 'scout-history-seed-00000000-0000-0000-0000-000000000001';

test.describe('Live query history', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  test.beforeAll(async ({ apiServices }) => {
    // Two completed live queries seed history list (ephemeral — no SO cleanup).
    // Live-query creation via the osquery API does not require any agent picker
    // population; the mocked Fleet helper is only needed for browser-level UI tests below.
    for (let i = 0; i < 2; i++) {
      await apiServices.osquery.liveQueries.create(
        getMinimalLiveQuery({
          query: `select * from uptime; -- history-seed-${Date.now()}-${i}`,
          agent_all: false,
          agent_ids: [TIER_A_SEED_AGENT_ID],
        })
      );
    }
  });

  test('re-runs the most recent query from history and restores its editor state', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 3 min: submit + history + re-run.
    test.setTimeout(180_000);

    const { agents } = await mockFleetAgents(page, { count: 2 });

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    // Tier-A: specific-agent selection (NOT "All agents") avoids `.fleet-agents` lookup.
    await pageObjects.osqueryLiveQueryForm.selectMockedAgents(agents.map((a) => a.hostName));

    // Unique marker in typed query (avoid saved-query dropdown — it can overwrite Monaco after clear).
    const uniqueMarker = `scout-history-${Date.now()}`;
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery(`select '${uniqueMarker}';`);
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('601');
    await pageObjects.osqueryLiveQueryForm.submitQuery();

    await pageObjects.osqueryNavigation.gotoHistory();
    // eslint-disable-next-line playwright/no-nth-methods -- re-run top row (just submitted)
    await page.locator('[aria-label="Run query"]').first().click();

    await expect(pageObjects.osqueryLiveQueryForm.queryEditor).toContainText(uniqueMarker, {
      timeout: 30_000,
    });
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    await expect(pageObjects.osqueryLiveQueryForm.timeoutInput).toHaveValue('601');
  });

  test('opens query details from history and surfaces the submitted query body', async ({
    apiServices,
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 3 min: seed row + details panel.
    test.setTimeout(180_000);

    // Per-test seed with marker (ordering vs beforeAll seeds is unreliable).
    const detailsMarker = `scout-details-${Date.now()}`;
    await apiServices.osquery.liveQueries.create(
      getMinimalLiveQuery({
        query: `select '${detailsMarker}';`,
        agent_all: false,
        agent_ids: [TIER_A_SEED_AGENT_ID],
      })
    );

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoHistory();

    // eslint-disable-next-line playwright/no-nth-methods -- details on top row
    await page.locator('[aria-label="Details"]').first().click();
    await expect(page.getByText('View history')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(detailsMarker)).toBeVisible({ timeout: 30_000 });
  });

  test('paginates the query history list and renders seeded rows at the selected size', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 3 min: history pagination.
    test.setTimeout(180_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoHistory();

    await page.testSubj.locator('tablePaginationPopoverButton').click();
    await page.testSubj.locator('tablePagination-10-rows').click();

    // Page size 10: row count between beforeAll seeds (2) and page cap (10).
    await expect(page.testSubj.locator('tablePaginationPopoverButton')).toContainText('10');
    const historyRowCount = await page.locator('[aria-label="Details"]').count();
    expect(historyRowCount).toBeGreaterThanOrEqual(2);
    expect(historyRowCount).toBeLessThanOrEqual(10);
  });
});
