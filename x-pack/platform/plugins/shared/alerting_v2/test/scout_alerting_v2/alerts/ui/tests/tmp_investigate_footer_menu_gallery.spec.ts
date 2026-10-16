/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMP — delete before merge. Capture harness for the classic alert flyout's "Investigate"
// custom menu item, before/after the footer menu migration. Not a test suite.

import Path from 'path';
import { randomUUID } from 'crypto';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
// Run from the repo root so this lands in the repo's gitignored .playwright-mcp/.
const OUT_DIR = Path.resolve('.playwright-mcp/flyout-migration', RUN);

const suffix = randomUUID();
const alertId = `gallery-classic-alert-${suffix}`;
const ruleId = `gallery-classic-rule-${suffix}`;
const ruleName = `Gallery classic rule ${suffix}`;
const alertIndex = '.alerts-observability.apm.alerts-default';

// Investigate only renders when nightshift reports availability, which needs an LLM setup.
// Mock the investigation APIs, as observability_alerting's nightshift suite does.
const mockNightshiftApis = async (page: ScoutPage) => {
  await page.route(
    (url: URL) => url.pathname.endsWith('/internal/nightshift/investigations/availability'),
    (route) => route.fulfill({ status: 200, json: { available: true } })
  );
  await page.route(
    (url: URL) =>
      url.pathname.endsWith('/internal/investigations/investigations') && url.searchParams.size > 0,
    (route) => route.fulfill({ status: 200, json: { results: [], page: 1, size: 2, total: 0 } })
  );
};

// The old and new classic menus render the same DOM, so tell the builds apart by source: only
// the migrated EpisodeFooterActionMenu adapts custom items with `renderItem({ closeMenu: onClose`.
const servesMigratedClassicMenu = (page: ScoutPage) =>
  page.evaluate(async () => {
    const scripts = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.endsWith('.js'));
    const pattern = /renderItem\(\{\s*closeMenu:\s*onClose/;
    for (const src of scripts) {
      const text = await (await fetch(src)).text();
      if (pattern.test(text)) return true;
    }
    return false;
  });

test.describe('TEMP investigate footer menu gallery', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esClient }) => {
    const timestamp = new Date().toISOString();
    await esClient.create({
      index: alertIndex,
      id: alertId,
      refresh: 'wait_for',
      document: {
        '@timestamp': timestamp,
        'event.kind': 'signal',
        'kibana.alert.uuid': alertId,
        'kibana.alert.flapping': false,
        'kibana.alert.reason': 'Transaction error rate high',
        'kibana.alert.status': 'active',
        'kibana.alert.start': timestamp,
        'kibana.alert.time_range': { gte: timestamp },
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.rule.category': 'Error rate',
        'kibana.alert.rule.consumer': 'alerts',
        'kibana.alert.rule.name': ruleName,
        'kibana.alert.rule.producer': 'apm',
        'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
        'kibana.alert.rule.uuid': ruleId,
        'kibana.space_ids': ['default'],
        'kibana.version': '8.0.0',
      },
    });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.deleteByQuery({
      index: alertIndex,
      query: { ids: { values: [alertId] } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
  });

  test('captures the classic alert flyout menu with Investigate', async ({
    browserAuth,
    kbnUrl,
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await mockNightshiftApis(page);
    // Kibana loads ~250 scripts before the flyout's lazy chunk, which is the default size of the
    // resource timing buffer; without more room the build check never sees that chunk.
    await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
    await browserAuth.loginAsAdmin();

    const shot = (name: string) =>
      page.screenshot({ path: Path.join(OUT_DIR, `${name}.png`), animations: 'disabled' });
    const takeActionButton = page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton');
    const investigateItem = page.testSubj.locator('investigateAlert');

    const openClassicFlyout = async () => {
      const search = new URLSearchParams({ _a: `(alertsList:(ruleId:'${ruleId}'))` });
      await page.goto(kbnUrl.get(`/app/observability/alerting/alerts?${search.toString()}`), {
        waitUntil: 'domcontentloaded',
      });
      const expandRow = page.testSubj.locator('docTableExpandToggleColumn');
      await expect(expandRow).toHaveCount(1, { timeout: 60_000 });
      await expandRow.click();
      await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
        timeout: 30_000,
      });
    };

    await test.step('classic flyout from the expected build, menu closed', async () => {
      // Waits out the dev server's rebuild after the files are swapped between runs.
      await expect(async () => {
        await openClassicFlyout();
        expect(await servesMigratedClassicMenu(page)).toBe(RUN === 'after');
      }).toPass({ timeout: 180_000, intervals: [5_000] });
      await page.waitForTimeout(1000);
      await shot('21-classic-flyout');
    });

    await test.step('classic flyout, menu open with Investigate', async () => {
      await takeActionButton.click();
      await expect(investigateItem).toBeVisible();
      await page.waitForTimeout(500);
      await shot('22-classic-menu-open-investigate');
    });
  });
});
