/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class BannersPageObject {
  public mainWrapper: Locator;

  constructor(private readonly page: ScoutPage) {
    this.mainWrapper = this.page.testSubj.locator('bannerInnerWrapper');
  }

  async getTopBannerText(): Promise<string> {
    if (!(await this.mainWrapper.isVisible())) {
      return '';
    }
    return await this.mainWrapper.innerText();
  }

  async isTopBannerVisible(): Promise<boolean> {
    try {
      await this.page.testSubj.waitForSelector('bannerInnerWrapper', {
        state: 'visible',
      });
      return true;
    } catch {
      return false;
    }
  }
}
