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

  public get allFeatureSections(): Locator {
    return this.content.locator('[data-test-subj^="featureSection-"]');
  }

  // --- Sub-Feature Cards ---

  public get allSubFeatureCards(): Locator {
    return this.content.locator('[data-test-subj^="subFeatureCard-"]');
  }

  public get allEndpointRows(): Locator {
    return this.content.locator('[data-test-subj^="endpoint-row-"]');
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

  // --- Copy To Modal ---

  public get firstCopyToButton(): Locator {
    return this.content.locator('[data-test-subj^="copy-to-"]').locator('nth=0');
  }

  public get copyToModalApply(): Locator {
    return this.page.testSubj.locator('copy-to-modal-apply');
  }

  public get copyToModalCancel(): Locator {
    return this.page.testSubj.locator('copy-to-modal-cancel');
  }

  // --- Reset Defaults Modal ---

  public get firstResetLink(): Locator {
    return this.content.locator('[data-test-subj^="reset-"]').locator('nth=0');
  }

  public get resetDefaultsModal(): Locator {
    return this.page.testSubj.locator('resetDefaultsModal');
  }

  public get resetDefaultsCancelButton(): Locator {
    return this.resetDefaultsModal.locator('[data-test-subj="confirmModalCancelButton"]');
  }
}
