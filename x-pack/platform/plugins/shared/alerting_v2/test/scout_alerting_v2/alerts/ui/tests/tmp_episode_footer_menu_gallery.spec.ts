/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMP — delete before merge. Capture harness for the episode footer menu migration's
// before/after screenshots, not a test suite.

import Path from 'path';
import { randomUUID } from 'crypto';
import { ALERT_EVENTS_DATA_STREAM, ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { EsClient, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const RULE_API_HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' } as const;

// Self-contained copy of observability_alerting's `seedInboxEpisode`: a disabled rule plus one
// matching `.rule-events` document, so the inbox has a single episode row.
const seedEpisode = async (esClient: EsClient, kbnClient: KbnClient) => {
  const { data: rule } = await kbnClient.request<{ id: string }>({
    description: 'create gallery rule',
    method: 'POST',
    path: ALERTING_V2_RULE_API_PATH,
    headers: RULE_API_HEADERS,
    body: {
      kind: 'alert',
      metadata: { name: `gallery-episode-${randomUUID()}` },
      schedule: { every: '1h' },
      query: { base: 'FROM logs-* | LIMIT 1' },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
    },
  });
  await kbnClient.request({
    description: 'disable gallery rule',
    method: 'POST',
    path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(rule.id)}/_disable`,
    headers: RULE_API_HEADERS,
  });
  const now = new Date().toISOString();
  await esClient.bulk({
    operations: [
      { create: { _index: ALERT_EVENTS_DATA_STREAM } },
      {
        '@timestamp': now,
        scheduled_timestamp: now,
        rule: { id: rule.id, version: 1 },
        group_hash: `${rule.id}-group`,
        data: {},
        status: 'breached',
        source: 'scout-test',
        type: 'alert',
        space_id: 'default',
        alert: { id: `gallery-episode-${randomUUID()}`, status: 'active' },
      },
    ],
    refresh: true,
  });
  return rule.id;
};

const deleteEpisode = async (esClient: EsClient, kbnClient: KbnClient, ruleId: string) => {
  await esClient.deleteByQuery(
    {
      index: ALERT_EVENTS_DATA_STREAM,
      query: { term: { 'rule.id': ruleId } },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
    },
    { ignore: [404] }
  );
  await kbnClient.request({
    description: 'delete gallery rule',
    method: 'DELETE',
    path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`,
    headers: RULE_API_HEADERS,
  });
};

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
// Run from the repo root so this lands in the repo's gitignored .playwright-mcp/.
const OUT_DIR = Path.resolve('.playwright-mcp/flyout-migration', RUN);

test.describe('TEMP episode footer menu gallery', { tag: '@local-stateful-classic' }, () => {
  let ruleId: string;

  test.beforeAll(async ({ esClient, kbnClient }) => {
    ruleId = await seedEpisode(esClient, kbnClient);
  });

  test.afterAll(async ({ esClient, kbnClient }) => {
    await deleteEpisode(esClient, kbnClient, ruleId);
  });

  test('captures the episode flyout footer menu', async ({ browserAuth, kbnUrl, page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();

    const shot = (name: string) =>
      page.screenshot({ path: Path.join(OUT_DIR, `${name}.png`), animations: 'disabled' });
    const takeActionButton = page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton');
    const assigneeItem = page.testSubj.locator('alertingV2EditEpisodeAssigneeMenuItem');

    await test.step('episode flyout, menu closed', async () => {
      const search = new URLSearchParams({ _a: `(alertsList:(ruleId:'${ruleId}'))` });
      await page.goto(kbnUrl.get(`/app/observability/alerting/alerts?${search.toString()}`), {
        waitUntil: 'domcontentloaded',
      });
      const expandRow = page.testSubj.locator('docTableExpandToggleColumn');
      await expect(expandRow).toHaveCount(1, { timeout: 60_000 });
      await expandRow.click();
      await expect(page.testSubj.locator('alertingV2EpisodeFlyout')).toBeVisible();
      // Fails fast if the dev server has not rebuilt yet: only the template menu trigger
      // carries aria-haspopup.
      if (RUN === 'after') {
        await expect(takeActionButton).toHaveAttribute('aria-haspopup', 'dialog', { timeout: 60_000 });
      } else {
        await expect(takeActionButton).not.toHaveAttribute('aria-haspopup');
      }
      await page.waitForTimeout(1500);
      await shot('11-episode-flyout');
    });

    await test.step('episode flyout, menu open', async () => {
      await takeActionButton.click();
      await expect(assigneeItem).toBeVisible();
      await shot('12-episode-menu-open');
    });

    await test.step('Edit assignee nested popover open, typing inside it', async () => {
      await assigneeItem.click();
      // The panel portals to document.body, outside the popover's own test subject.
      const input = page.locator('input[id^="alertingV2AssigneeSearch"]');
      await expect(input).toBeVisible();
      await input.click();
      await page.keyboard.type('ela');
      await page.waitForTimeout(1000);
      await expect(assigneeItem).toBeVisible();
      await shot('13-episode-assignee-popover');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
    });

    await test.step('Timeline tab, menu open', async () => {
      await page.testSubj.click('alertingV2EpisodeFlyoutTabTimeline');
      await page.waitForTimeout(1000);
      await takeActionButton.click();
      await expect(assigneeItem).toBeVisible();
      await shot('14-episode-timeline-tab-menu-open');
    });

    await test.step('Apply in the assignee popover closes the menu', async () => {
      await assigneeItem.click();
      const input = page.locator('input[id^="alertingV2AssigneeSearch"]');
      await expect(input).toBeVisible();
      await input.fill('elastic');
      await page.getByText('elastic', { exact: true }).last().click();
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(assigneeItem).toBeHidden();
      await page.waitForTimeout(1000);
      await shot('15-episode-after-assignee-apply');
    });
  });
});
