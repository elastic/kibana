/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Waits until Kibana's chrome reports loading finished (`globalLoadingIndicator-hidden`),
 * matching the FTR `AppsMenuService` pattern.
 */
export async function waitForKibanaChromeLoadingFinished(
  page: ScoutPage,
  { timeoutMs = 60_000 }: { timeoutMs?: number } = {}
): Promise<void> {
  await page.testSubj.locator('globalLoadingIndicator-hidden').waitFor({
    state: 'attached',
    timeout: timeoutMs,
  });
}
