/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class SpacesPreferencesPageObject {
  constructor(private readonly page: ScoutPage) {}

  private modalLocator() {
    return this.page.testSubj.locator('spacesPreferencesModal');
  }

  private switchLocator() {
    return this.modalLocator().getByRole('switch');
  }

  async open() {
    const userMenu = this.page.testSubj.locator('userMenu');
    if (!(await userMenu.isVisible())) {
      await this.page.testSubj.click('userMenuButton');
      await userMenu.waitFor({ state: 'visible' });
    }
    await this.page.testSubj.click('spacePreferenceSelector');
    await this.modalLocator().waitFor({ state: 'visible' });
  }

  async enableRememberLastSpacePreference() {
    const switchControl = this.switchLocator();
    if (!(await switchControl.isChecked())) {
      await switchControl.click();
    }
  }

  async save() {
    await this.page.testSubj.click('spacesPreferencesModalSaveButton');
    await this.modalLocator().waitFor({ state: 'detached' });
  }

  async discard() {
    await this.page.testSubj.click('spacesPreferencesModalCancelButton');
    await this.modalLocator().waitFor({ state: 'detached' });
  }
}
