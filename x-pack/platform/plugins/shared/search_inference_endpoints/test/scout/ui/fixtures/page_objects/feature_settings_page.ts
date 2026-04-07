/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */
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

  public get firstEndpointRow(): Locator {
    return this.allEndpointRows.first();
  }

  // --- Add Model Popover ---

  public get firstAddModelButton(): Locator {
    return this.content.locator('[data-test-subj="add-model-button"]').first();
  }

  public get addModelSearch(): Locator {
    return this.page.testSubj.locator('add-model-search');
  }

  // --- Copy To Modal ---

  public get firstCopyToButton(): Locator {
    return this.content.locator('[data-test-subj^="copy-to-"]').first();
  }

  public get copyToModalApply(): Locator {
    return this.page.testSubj.locator('copy-to-modal-apply');
  }

  public get copyToModalCancel(): Locator {
    return this.page.testSubj.locator('copy-to-modal-cancel');
  }

  // --- Reset Defaults Modal ---

  public get firstResetLink(): Locator {
    return this.content.locator('[data-test-subj^="reset-"]').first();
  }

  public get resetDefaultsModal(): Locator {
    return this.page.testSubj.locator('resetDefaultsModal');
  }

  public get resetDefaultsConfirmButton(): Locator {
    return this.resetDefaultsModal.locator('[data-test-subj="confirmModalConfirmButton"]');
  }

  public get resetDefaultsCancelButton(): Locator {
    return this.resetDefaultsModal.locator('[data-test-subj="confirmModalCancelButton"]');
  }

  /**
   * Removes endpoints from the first sub-feature card until only one remains.
   * Returns the initial count of endpoints before removal.
   */
  public async removeEndpointsUntilOneRemains(): Promise<number> {
    const firstCard = this.allSubFeatureCards.first();
    const endpointRows = firstCard.locator('[data-test-subj^="endpoint-row-"]');
    const initialCount = await endpointRows.count();

    for (let remaining = initialCount; remaining > 1; remaining--) {
      const lastRemoveBtn = firstCard.locator('[data-test-subj^="remove-endpoint-"]').last();
      await lastRemoveBtn.click();
      await lastRemoveBtn.waitFor({ state: 'detached' });
    }

    return initialCount;
  }

  public get firstCardLastRemoveButton(): Locator {
    return this.allSubFeatureCards.first().locator('[data-test-subj^="remove-endpoint-"]').last();
  }
}
