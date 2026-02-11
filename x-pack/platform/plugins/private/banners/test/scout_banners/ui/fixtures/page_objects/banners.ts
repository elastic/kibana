/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class BannersPageObject {
  constructor(private readonly page: ScoutPage) {}

  async isLoginButtonVisible(): Promise<boolean> {
    try {
      await this.page.testSubj.waitForSelector('loginSubmit', {
        state: 'visible',
      });
      return true;
    } catch {
      return false;
    }
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

  async getTopBannerText(): Promise<string> {
    if (!(await this.isTopBannerVisible())) {
      return '';
    }

    const bannerText = await this.page.testSubj.locator('bannerInnerWrapper').innerText();
    return bannerText;
  }
}
