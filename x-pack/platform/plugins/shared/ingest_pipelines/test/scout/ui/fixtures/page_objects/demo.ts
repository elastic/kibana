/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class DemoPage {
  public someElement: Locator;

  constructor(private readonly page: ScoutPage) {
    this.someElement = this.page.testSubj.locator('some-data-test-subj');
  }

  async goto() {
    await this.page.gotoApp('not_implemented');
  }
}
