/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { Page } from '@playwright/test';
import { REPO_ROOT } from '@kbn/repo-info';
import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// Run against `--serverConfigSet nightshift_investigations`, after
// `seed_nightshift_investigations.ts`. The seed derives conversation ids from the scenario.
const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp/agent-builder-flyouts/nightshift');
const SNAPSHOT = 'agentBuilderConversationDetailsFlyout-snapshot';
const LIVE = 'agentBuilderConversationDetailsFlyout-live';
const TREE = 'investigationHypothesisTreeFlyout';
const AGENT_ID = 'nightshift.investigation';

const INVESTIGATIONS = {
  critical: 'c61176fb-0907-53f3-b892-51daa4892959',
  high: 'b2811a62-6639-53ad-b314-2bde98576cb6',
  medium: 'c45e315f-85a3-5956-bdd5-eff4688e8d0b',
  low: 'bc3335ff-edf6-5bb1-bdbe-8d24d267036f',
  closedLow: '582e474e-1165-57e9-9cc0-3fe6b58611fe',
  unrated: 'ac2a3122-12b7-58a7-a72a-59182654bf70',
  closedUnrated: '5712ffcd-9afc-5271-bac1-c97762b1fe29',
} as const;

const shoot = async (page: Page, name: string) => {
  await page.mouse.move(760, 108);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
};

const settle = async (page: Page, testId: string) => {
  const flyout = page.getByTestId(testId);
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
};

test.describe('Nightshift — conversation details flyout', { tag: tags.stateful.classic }, () => {
  // Captured in an Observability solution space, as Nightshift is used.
  const setDefaultSpaceSolution = (
    kbnClient: { request: (o: Record<string, unknown>) => Promise<unknown> },
    solution: 'oblt' | 'classic'
  ) =>
    kbnClient.request({
      method: 'PUT',
      path: '/api/spaces/space/default',
      body: { id: 'default', name: 'Default', color: '#00bfb3', solution },
    });

  test.beforeAll(async ({ kbnClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'oblt');
  });

  test.afterAll(async ({ kbnClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'classic');
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
  });

  const openSnapshot = async (page: Page, kbnUrl: { get: (p: string) => string }, id: string) => {
    await page.goto(kbnUrl.get(`/app/nightshift?investigationId=${id}`));
    await settle(page, SNAPSHOT);
    return page.getByTestId(SNAPSHOT);
  };

  const openLive = async (page: Page, kbnUrl: { get: (p: string) => string }, id: string) => {
    await page.goto(kbnUrl.get(`/app/agent_builder/agents/${AGENT_ID}/conversations/${id}`));
    await page.getByTestId('agentBuilderChatInfoButton').click({ timeout: 30_000 });
    await settle(page, LIVE);
    return page.getByTestId(LIVE);
  };

  // Without an automation the home screen shows onboarding; dismissal is stored in the browser.
  const dismissOnboarding = (page: Page) =>
    page.addInitScript(() => {
      window.localStorage.setItem('nightshift.onboarding.dismissed:default', 'true');
    });

  test('home screen: onboarding', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/nightshift'));
    await expect(page.getByTestId('nightshiftPage')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3000);
    await shoot(page, '01-home-onboarding');
  });

  test('home screen: investigation list', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(180_000);
    await browserAuth.loginAsAdmin();
    await dismissOnboarding(page);
    await page.goto(kbnUrl.get('/app/nightshift'));
    await expect(page.getByTestId('nightshiftInvestigationListItem').first()).toBeVisible({
      timeout: 60_000,
    });
    await page.waitForTimeout(1500);
    await shoot(page, '02-home-list');

    await page.getByTestId('nightshiftInvestigationCardActions').first().click();
    await page.waitForTimeout(500);
    await shoot(page, '03-home-list-card-actions-menu');
    await page.keyboard.press('Escape');

    await page.getByTestId('nightshiftInvestigationListItem').first().click();
    await settle(page, SNAPSHOT);
    await shoot(page, '04-home-list-click-opens-flyout');

    await page.getByRole('button', { name: /copy link/i }).first().click();
    await page.waitForTimeout(800);
    await shoot(page, '05-home-list-copy-link-toast');
  });

  test('snapshot flyout by severity and status', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await browserAuth.loginAsAdmin();
    let n = 10;
    for (const [name, id] of Object.entries(INVESTIGATIONS)) {
      await openSnapshot(page, kbnUrl, id);
      await shoot(page, `${String(n).padStart(2, '0')}-snapshot-${name}`);
      n++;
    }
  });

  test('snapshot flyout as viewer', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await openSnapshot(page, kbnUrl, INVESTIGATIONS.critical);
    await shoot(page, '17-snapshot-critical-viewer');
  });

  test('snapshot flyout unknown investigation', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/nightshift?investigationId=does-not-exist'));
    await page.waitForTimeout(4000);
    await shoot(page, '18-snapshot-unknown-id');
  });

  test('snapshot flyout interactive states', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await browserAuth.loginAsAdmin();
    const id = INVESTIGATIONS.critical;
    const flyout = await openSnapshot(page, kbnUrl, id);

    await flyout.getByTestId('connectedStatusToggle').click();
    await expect(page.getByTestId('statusToggleClosed')).toBeVisible();
    await page.waitForTimeout(500);
    await shoot(page, '20-snapshot-status-popover');

    await page.getByTestId('statusToggleClosed').click();
    await expect(page.locator('.euiModal')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.euiModal .euiLoadingSpinner')).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.waitForTimeout(800);
    await shoot(page, '21-snapshot-close-modal');
    await page.keyboard.press('Escape');
    await expect(page.locator('.euiModal')).toHaveCount(0);

    await flyout.getByTestId('connectedSeverityPicker').click();
    await expect(page.getByTestId('severityPickerOption-low')).toBeVisible();
    await page.waitForTimeout(500);
    await shoot(page, '22-snapshot-severity-popover');
    await page.keyboard.press('Escape');

    await flyout.getByTestId(`assignToUsersAdd-${id}`).click();
    await expect(page.getByTestId(`assignToUsersSelectable-${id}`)).toBeVisible();
    await page.waitForTimeout(1500);
    await shoot(page, '23-snapshot-assignees-popover');
    await page.keyboard.press('Escape');

    await flyout.getByRole('button', { name: 'Open an escalation' }).click();
    await expect(page.getByTestId('escalationModal')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await shoot(page, '24-snapshot-escalation-modal');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /copy link/i }).first().click();
    await page.waitForTimeout(800);
    await shoot(page, '25-snapshot-copy-link-toast');
  });

  test('snapshot flyout collapsed header', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1600, height: 560 });
    await browserAuth.loginAsAdmin();
    const flyout = await openSnapshot(page, kbnUrl, INVESTIGATIONS.critical);
    await flyout.getByText('Proposed actions').scrollIntoViewIfNeeded();
    await flyout.hover();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1500);
    await shoot(page, '26-snapshot-proposed-actions-collapsed');
  });

  test('snapshot flyout proposed actions and stack', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await browserAuth.loginAsAdmin();
    const flyout = await openSnapshot(page, kbnUrl, INVESTIGATIONS.critical);
    await flyout.getByText('Proposed actions').scrollIntoViewIfNeeded();
    await shoot(page, '26-snapshot-proposed-actions');

    const treeButton = page.getByTestId('investigationHypothesisTreeButton');
    await expect(treeButton).toBeVisible({ timeout: 30_000 });
    await treeButton.click();
    const tree = page.getByTestId(TREE);
    await expect(tree).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await shoot(page, '27-snapshot-stack-hypothesis-tree-with-back');

    await tree.getByTestId('euiFlyoutMenuBackButton').click();
    await expect(page.getByTestId(SNAPSHOT)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await shoot(page, '28-snapshot-stack-after-back');
  });

  test('snapshot Open chat leads to the live view', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    const flyout = await openSnapshot(page, kbnUrl, INVESTIGATIONS.critical);
    await flyout.getByTestId('investigationFlyoutOpenChat').click();
    await settle(page, LIVE);
    await shoot(page, '29-open-chat-lands-on-live');
  });

  test('live flyout by severity and status', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await browserAuth.loginAsAdmin();
    let n = 32;
    for (const name of ['critical', 'closedLow', 'unrated'] as const) {
      await openLive(page, kbnUrl, INVESTIGATIONS[name]);
      await shoot(page, `${String(n).padStart(2, '0')}-live-${name}`);
      n++;
    }
  });

  test('live flyout interactive states and stack', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await browserAuth.loginAsAdmin();
    const id = INVESTIGATIONS.critical;
    const flyout = await openLive(page, kbnUrl, id);

    await flyout.getByTestId('connectedStatusToggle').click();
    await expect(page.getByTestId('statusToggleClosed')).toBeVisible();
    await page.waitForTimeout(500);
    await shoot(page, '35-live-status-popover');
    await page.keyboard.press('Escape');

    await flyout.getByTestId('connectedSeverityPicker').click();
    await expect(page.getByTestId('severityPickerOption-low')).toBeVisible();
    await page.waitForTimeout(500);
    await shoot(page, '36-live-severity-popover');
    await page.keyboard.press('Escape');

    await flyout.getByTestId(`assignToUsersAdd-${id}`).click();
    await expect(page.getByTestId(`assignToUsersSelectable-${id}`)).toBeVisible();
    await page.waitForTimeout(1500);
    await shoot(page, '37-live-assignees-popover');
    await page.keyboard.press('Escape');

    await flyout.getByRole('button', { name: 'Open an escalation' }).click();
    await expect(page.getByTestId('escalationModal')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await shoot(page, '38-live-escalation-modal');
    await page.keyboard.press('Escape');

    await page.getByTestId('investigationHypothesisTreeButton').click();
    await expect(page.getByTestId(TREE)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await shoot(page, '39-live-stack-hypothesis-tree-with-back');
  });
});
