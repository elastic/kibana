/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import type { ScoutPage } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';

export const OSQUERY_APP = 'osquery';

export const TEST_QUERY = 'select * from uptime;';

export const RESULTS_TIMEOUT = 240_000;

/**
 * Wait for the Kibana loading indicator to disappear, ensuring the page is fully loaded
 * before interacting with it. Uses a .catch() so it doesn't fail when the indicator
 * was never shown (fast navigations).
 */
export async function waitForPageReady(page: ScoutPage): Promise<void> {
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
}

/**
 * Dismiss all visible toast notifications. Toasts from the `globalToastList` can
 * overlay action buttons (e.g. "Save changes") and intercept clicks. Call this
 * before interacting with elements that may be obscured.
 */
export async function dismissAllToasts(page: ScoutPage): Promise<void> {
  const toastList = page.testSubj.locator('globalToastList');
  const closeButtons = toastList.locator('[data-test-subj="toastCloseButton"]');
  const allButtons = await closeButtons.all();

  for (const button of allButtons) {
    await button.click().catch(() => {});
  }

  // Wait for toasts to fully dismiss
  if (allButtons.length > 0) {
    await toastList
      .locator('[data-test-subj="toastCloseButton"]')
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => {});
  }
}

/**
 * Poll the detection engine API until at least one alert exists for the given
 * rule, then navigate to the rule's alerts tab and wait for the expand-event
 * button to be visible.
 *
 * Two-phase approach: first confirm alerts exist via the API (avoids slow page
 * reloads), then open the UI and wait for the table row to render.
 */
export async function waitForAlerts(
  page: ScoutPage,
  kbnClient: KbnClient,
  ruleId: string,
  { timeout = 300_000 }: { timeout?: number } = {}
): Promise<void> {
  const start = Date.now();
  const pollInterval = 10_000;

  // Phase 1 — wait for at least one alert via API
  while (Date.now() - start < timeout - 30_000) {
    try {
      const { data } = await kbnClient.request<any>({
        method: 'POST',
        path: '/api/detection_engine/signals/search',
        body: {
          query: {
            bool: {
              filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
            },
          },
          size: 0,
        },
      });

      if ((data as any).hits?.total?.value > 0) {
        break;
      }
    } catch {
      // API might not be ready yet; keep polling
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  // Phase 2 — navigate to the alerts tab and wait for the UI row
  const currentUrl = page.url();
  if (currentUrl.includes('/rules/id/') && !currentUrl.includes('/alerts')) {
    const alertsUrl = currentUrl.replace(/\/rules\/id\/([^/?#]+).*/, '/rules/id/$1/alerts');
    await page.goto(alertsUrl);
  } else {
    await page.reload();
  }

  await waitForPageReady(page);

  const expandEvent = page.testSubj.locator('expand-event').first();
  const remaining = Math.max(timeout - (Date.now() - start), 30_000);
  await expandEvent.waitFor({ state: 'visible', timeout: remaining });
}
