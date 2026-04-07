/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class FeatureSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  public async goto() {
    await this.page.gotoApp('management/modelManagement/model_settings');
    await this.page.testSubj.waitForSelector('modelSettingsPage');
  }

  public get pageHeader(): Locator {
    return this.page.testSubj.locator('modelSettingsPageHeader');
  }
}
