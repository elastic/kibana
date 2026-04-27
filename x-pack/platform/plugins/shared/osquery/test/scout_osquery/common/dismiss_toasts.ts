/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Closes visible global toasts; they can sit above the live-query Submit control and
 * cause `force: true` clicks to still miss the handler in some EUI versions.
 */
export async function dismissVisibleToasts(page: ScoutPage): Promise<void> {
  const closeButtons = await page.testSubj
    .locator('globalToastList')
    .locator('[data-test-subj="toastCloseButton"]')
    .all();
  for (const btn of closeButtons) {
    await btn.click().catch(() => {});
  }

  if (closeButtons.length > 0) {
    await page.testSubj
      .locator('globalToastList')
      .locator('[data-test-subj="toastCloseButton"]')
      // eslint-disable-next-line playwright/no-nth-methods -- toast stack cleared
      .first()
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => {});
  }
}
