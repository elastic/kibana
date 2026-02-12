/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

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
 * Wait for alerts to appear on the rule details page. In serverless mode, alert
 * generation can take over a minute. This helper periodically reloads the page
 * to check for new alerts instead of relying on a single long wait.
 */
export async function waitForAlerts(
  page: ScoutPage,
  { timeout = 240_000 }: { timeout?: number } = {}
): Promise<void> {
  const start = Date.now();
  const expandEvent = page.testSubj.locator('expand-event');

  while (Date.now() - start < timeout) {
    try {
      await expandEvent.waitFor({ state: 'visible', timeout: 30_000 });

      return;
    } catch {
      // Alerts not yet generated — reload and try again
      await page.reload();
      await waitForPageReady(page);
    }
  }

  // Final attempt — let it throw with a clear error
  await expandEvent.waitFor({ state: 'visible', timeout: 30_000 });
}
