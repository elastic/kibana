/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY, TRIAL_TRIGGER_DEF_ID } from '../constants';

export class TrialInterceptPageObject {
  public readonly intercept: Locator;
  public readonly dismissButton: Locator;

  constructor(private readonly page: ScoutPage) {
    // The prompter appends the Kibana build version to the trigger ID
    // (e.g. `productTrialInterceptTrigger:9.0.0`), so match by prefix.
    this.intercept = this.page.locator(`[data-test-subj^="intercept-${TRIAL_TRIGGER_DEF_ID}"]`);
    this.dismissButton = this.page.testSubj.locator('productInterceptDismissButton');
  }

  /**
   * Writes to localStorage to make the intercept prompter believe the timer
   * has already elapsed, causing the intercept to appear on the next page load.
   *
   * The prompter registers the trial trigger with a versioned key
   * (`productTrialInterceptTrigger:${kibanaVersion}`), so callers must pass
   * the fully-qualified versioned ID obtained via `kbnClient.version.get()`.
   */
  async triggerInterceptTimer(triggerId: string, intervalMs: number) {
    const timerStart = new Date(Date.now() - intervalMs - 1000);
    await this.page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      {
        key: INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
        value: JSON.stringify({ [triggerId]: { timerStart } }),
      }
    );
  }
}
