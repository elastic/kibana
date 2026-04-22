/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Live query submission with enrolled agents', { tag: localTags }, () => {
  // Single submission, multiple orthogonal assertions. Per design decision
  // "no nested describe — use test.step() for internal structure", we group
  // several properties of the same response (custom timeout accepted, per-agent
  // rows landed, Discover link opens a new tab) behind one agent submit. Three
  // separate tests would triple agent cold-start cost for assertions that all
  // read from the same submit response.
  test('submits a live query against all agents and validates results, per-agent rendering, and the Discover link', async ({
    browserAuth,
    context,
    kbnClient,
    page,
    pageObjects,
  }) => {
    test.setTimeout(360_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();

    await test.step('submit against all agents with a custom 120s timeout', async () => {
      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from os_version;');
      await pageObjects.osqueryLiveQueryForm.clickAdvanced();
      await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('120');
      await pageObjects.osqueryLiveQueryForm.submitQuery();
      await pageObjects.osqueryLiveQueryForm.waitForResults();
      await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
        timeout: 180_000,
      });
    });

    await test.step('renders at least one populated result row', async () => {
      // eslint-disable-next-line playwright/no-nth-methods -- any populated cell indicates agent results were rendered
      await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
        timeout: 180_000,
      });
    });

    await test.step('renders per-agent rows via the agent.name column', async () => {
      // The results grid surfaces `agent.name` as a column header only when
      // per-agent rows land — a stronger signal than row count, which can
      // drop to 1 if a single agent transiently drops between the query and
      // the result poll.
      await expect(page.testSubj.locator('dataGridHeaderCell-agent.name')).toBeVisible({
        timeout: 180_000,
      });
    });

    await test.step('opens the Discover link in a new tab', async () => {
      // The Discover affordance renders as either an `EuiButtonEmpty` (link role
      // with visible text "View in Discover") or an `EuiButtonIcon`+tooltip
      // (button role with `aria-label="View in Discover"`) depending on the
      // result-panel variant; both are anchors with `target="_blank"`. Match
      // either by `[href*="/app/discover"][target="_blank"]` so we don't have
      // to branch on which variant the live-query results render today.
      // Source: `public/discover/view_results_in_discover.tsx:130-145`.
      const discoverLink = page.locator('a[href*="/app/discover"][target="_blank"]');
      // eslint-disable-next-line playwright/no-nth-methods -- multiple Discover anchors can render across the panel + per-row toolbar; first-match opens the same Discover URL
      const firstDiscover = discoverLink.first();
      await firstDiscover.waitFor({ state: 'visible', timeout: 60_000 });
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 60_000 }),
        firstDiscover.click(),
      ]);
      await newPage.waitForLoadState('domcontentloaded');
      expect(newPage.url()).toMatch(/\/app\/discover/);
      await newPage.close();
    });
  });
});
