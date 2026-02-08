/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Page } from '@kbn/scout';

export const OSQUERY_APP = 'osquery';

export const TEST_QUERY = 'select * from uptime;';

export const RESULTS_TIMEOUT = 240_000;

/**
 * Wait for the Kibana loading indicator to disappear, ensuring the page is fully loaded
 * before interacting with it. Uses a .catch() so it doesn't fail when the indicator
 * was never shown (fast navigations).
 */
export async function waitForPageReady(page: ScoutPage | Page): Promise<void> {
  const indicator = (page as ScoutPage).testSubj
    ? (page as ScoutPage).testSubj.locator('globalLoadingIndicator')
    : page.locator('[data-test-subj="globalLoadingIndicator"]');
  await indicator.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
}
