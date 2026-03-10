/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class SpacesPage {
  constructor(private readonly page: ScoutPage) {}

  async isProjectHeaderVisible() {
    return await this.page.testSubj.isVisible('kibanaProjectHeader');
  }

  async navigateToHome() {
    await this.page.gotoApp('home');
    await this.dismissWelcomeScreen();
    await this.page.testSubj.locator('homeApp').waitFor({
      state: 'visible',
    });
  }

  async dismissWelcomeScreen() {
    await this.page.evaluate(() => {
      localStorage.setItem('home:welcome:show', 'false');
    });
  }

  async isSpacesSelectorVisible() {
    return await this.page.testSubj.isVisible('spacesNavSelector');
  }

  async openSpacesSelector() {
    await this.page.testSubj.click('spacesNavSelector');
  }

  async isManageButtonVisible() {
    return await this.page.testSubj.isVisible('manageSpaces');
  }

  async waitForManageButton() {
    await this.page.testSubj.locator('manageSpaces').waitFor({ state: 'visible' });
  }
}
