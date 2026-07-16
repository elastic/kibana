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
    await this.resultList.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      () => document.querySelectorAll('[data-is-loading="true"]').length === 0
    );
  }
}
