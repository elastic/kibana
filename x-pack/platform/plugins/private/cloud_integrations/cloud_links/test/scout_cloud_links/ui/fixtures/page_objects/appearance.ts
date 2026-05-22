/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

declare global {
  interface Window {
    __kbnThemeTag__: string;
  }
}

export type ColorMode = 'light' | 'dark' | 'system' | 'space_default';

export class AppearancePageObject {
  constructor(private readonly page: ScoutPage) {}

  async open() {
    // Open user menu if not already open
    const userMenu = this.page.testSubj.locator('userMenu');
    if (!(await userMenu.isVisible())) {
      await this.page.testSubj.click('userMenuButton');
      await userMenu.waitFor({ state: 'visible' });
    }
    await this.page.testSubj.click('appearanceSelector');
    await this.page.testSubj.waitForSelector('appearanceModal', { state: 'visible' });
  }

  async selectColorMode(mode: ColorMode) {
    await this.page.testSubj.click(`colorModeKeyPadItem${mode}`);
  }

  async save() {
    await this.page.testSubj.click('appearanceModalSaveButton');
    await this.page.testSubj.waitForSelector('appearanceModal', { state: 'detached' });
  }

  async discard() {
    await this.page.testSubj.click('appearanceModalDiscardButton');
    await this.page.testSubj.waitForSelector('appearanceModal', { state: 'detached' });
  }

  async isColorModeOptionVisible(mode: ColorMode): Promise<boolean> {
    return this.page.testSubj.isVisible(`colorModeKeyPadItem${mode}`);
  }

  getThemeTag(): Promise<string> {
    return this.page.evaluate(() => window.__kbnThemeTag__);
  }
}
