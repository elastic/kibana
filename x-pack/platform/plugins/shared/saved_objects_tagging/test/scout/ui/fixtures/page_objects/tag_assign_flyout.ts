/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// Owns interactions with the bulk-assign flyout only.
export class TagAssignFlyout {
  readonly resultList: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.resultList = page.testSubj.locator('assignFlyoutResultList');
    this.confirmButton = page.testSubj.locator('assignFlyoutConfirmButton');
    this.cancelButton = page.testSubj.locator('assignFlyoutCancelButton');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');
  }

  async clickResult(type: string, id: string) {
    await this.page.testSubj.click(`assign-result-${type}-${id}`);
  }

  async waitForResultsLoaded() {
    // React.lazy: 'hidden' resolves immediately for missing elements — must confirm DOM presence first.
    await this.resultList.waitFor({ state: 'visible' });
    // isLoading starts false; wait for spinner to appear (useEffect fired) then disappear (API done).
    await this.resultList.locator('.euiLoadingSpinner').waitFor({ state: 'visible' });
    await this.resultList.locator('.euiLoadingSpinner').waitFor({ state: 'hidden' });
    // EUI icons briefly lack alt text while loading their SVGs.
    await this.resultList.locator('[data-is-loading="true"]').waitFor({ state: 'hidden' });
  }
}
