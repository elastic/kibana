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

  // --- Feature Sections ---

  public getFeatureSection(parentName: string): Locator {
    return this.page.testSubj.locator(`featureSection-${parentName}`);
  }

  public get allFeatureSections(): Locator {
    return this.content.locator('[data-test-subj^="featureSection-"]');
  }

  public getResetLink(parentName: string): Locator {
    return this.page.testSubj.locator(`reset-${parentName}`);
  }

  // --- Sub-Feature Cards ---

  public getSubFeatureCard(featureId: string): Locator {
    return this.page.testSubj.locator(`subFeatureCard-${featureId}`);
  }

  public get allSubFeatureCards(): Locator {
    return this.content.locator('[data-test-subj^="subFeatureCard-"]');
  }

  public get allEndpointRows(): Locator {
    return this.content.locator('[data-test-subj^="endpoint-row-"]');
  }

  public getEndpointRow(endpointId: string): Locator {
    return this.page.testSubj.locator(`endpoint-row-${endpointId}`);
  }

  public getRemoveEndpointButton(endpointId: string): Locator {
    return this.page.testSubj.locator(`remove-endpoint-${endpointId}`);
  }

  public get disabledRemoveButtons(): Locator {
    return this.content.locator('[data-test-subj^="remove-endpoint-"]:disabled');
  }

  // --- Add Model Popover ---

  public get firstAddModelButton(): Locator {
    return this.content.locator('[data-test-subj="add-model-button"]').locator('nth=0');
  }

  public get addModelSearch(): Locator {
    return this.page.testSubj.locator('add-model-search');
  }
}
