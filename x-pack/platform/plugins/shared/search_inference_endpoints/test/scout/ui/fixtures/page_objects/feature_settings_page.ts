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

  // --- Header ---

  public get pageHeader(): Locator {
    return this.page.testSubj.locator('modelSettingsPageHeader');
  }

  public get saveButton(): Locator {
    return this.page.testSubj.locator('save-settings-button');
  }

  public get apiDocumentationLink(): Locator {
    return this.page.testSubj.locator('settings-api-documentation');
  }

  // --- Content ---

  public get content(): Locator {
    return this.page.testSubj.locator('modelSettingsContent');
  }

  public get noFeaturesEmptyPrompt(): Locator {
    return this.page.testSubj.locator('settings-no-features');
  }

  // --- Default Model Section ---

  public get defaultModelSection(): Locator {
    return this.page.testSubj.locator('defaultModelSection');
  }

  public get defaultModelComboBox(): Locator {
    return this.page.testSubj.locator('defaultModelComboBox');
  }

  public get disallowOtherModelsCheckbox(): Locator {
    return this.page.testSubj.locator('disallowOtherModelsCheckbox');
  }

  // --- Dynamic Section Locators ---

  public getFeatureSection(parentName: string): Locator {
    return this.page.testSubj.locator(`featureSection-${parentName}`);
  }
}
