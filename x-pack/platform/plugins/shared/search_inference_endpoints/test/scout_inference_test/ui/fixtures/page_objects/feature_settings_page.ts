/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class FeatureSettingsPage {
  // Header
  readonly pageHeader: Locator;
  readonly saveButton: Locator;
  readonly apiDocumentationLink: Locator;

  // Content
  readonly content: Locator;

  // Default Model Section
  readonly defaultModelSection: Locator;
  readonly defaultModelComboBox: Locator;
  readonly disallowOtherModelsCheckbox: Locator;

  // Feature Sections
  readonly allFeatureSections: Locator;

  // Sub-Feature Cards
  readonly allSubFeatureCards: Locator;
  readonly allEndpointRows: Locator;

  // Add Model Popover
  readonly addModelSearch: Locator;
  readonly addModelOptions: Locator;

  // Copy To Modal
  readonly copyToModalApply: Locator;
  readonly copyToModalCancel: Locator;

  // Reset Defaults Modal
  readonly resetDefaultsModal: Locator;
  readonly resetDefaultsCancelButton: Locator;

  // Empty State
  readonly noModelsEmptyPrompt: Locator;
  readonly addModelsButton: Locator;

  constructor(private readonly page: ScoutPage) {
    // Header
    this.pageHeader = this.page.testSubj.locator('modelSettingsPageHeader');
    this.saveButton = this.page.testSubj.locator('save-settings-button');
    this.apiDocumentationLink = this.page.testSubj.locator('settings-api-documentation');

    // Content
    this.content = this.page.testSubj.locator('modelSettingsContent');

    // Default Model Section
    this.defaultModelSection = this.page.testSubj.locator('defaultModelSection');
    this.defaultModelComboBox = this.page.testSubj.locator('defaultModelComboBox');
    this.disallowOtherModelsCheckbox = this.page.testSubj.locator('disallowOtherModelsCheckbox');

    // Feature Sections
    this.allFeatureSections = this.content.locator('[data-test-subj^="featureSection-"]');

    // Sub-Feature Cards
    this.allSubFeatureCards = this.content.locator('[data-test-subj^="subFeatureCard-"]');
    this.allEndpointRows = this.content.locator('[data-test-subj^="endpoint-row-"]');

    // Add Model Popover
    this.addModelSearch = this.page.testSubj.locator('add-model-search');
    this.addModelOptions = this.page.testSubj.locator('add-model-selectable').getByRole('option');

    // Copy To Modal
    this.copyToModalApply = this.page.testSubj.locator('copy-to-modal-apply');
    this.copyToModalCancel = this.page.testSubj.locator('copy-to-modal-cancel');

    // Reset Defaults Modal
    this.resetDefaultsModal = this.page.testSubj.locator('resetDefaultsModal');
    this.resetDefaultsCancelButton = this.resetDefaultsModal.locator(
      '[data-test-subj="confirmModalCancelButton"]'
    );

    // Empty State
    this.noModelsEmptyPrompt = this.page.testSubj.locator('settings-no-models');
    this.addModelsButton = this.page.testSubj.locator('settings-no-models-add-models');
  }

  // --- Navigation ---

  public async goto() {
    await this.page.gotoApp('management/modelManagement/model_settings');
    await this.page.testSubj.waitForSelector('modelSettingsPageHeader', { state: 'visible' });
  }

  public async gotoEmptyState() {
    await this.page.gotoApp('management/modelManagement/model_settings');
    await this.page.testSubj.waitForSelector('settings-no-models', { state: 'visible' });
  }

  // --- Parameterized Locators ---

  public subFeatureCard(featureId: string): Locator {
    return this.page.testSubj.locator(`subFeatureCard-${featureId}`);
  }

  public endpointRowsFor(featureId: string): Locator {
    return this.subFeatureCard(featureId).locator('[data-test-subj^="endpoint-row-"]');
  }

  public endpointRow(endpointId: string): Locator {
    return this.page.testSubj.locator(`endpoint-row-${endpointId}`);
  }

  public addModelButton(featureId: string): Locator {
    return this.subFeatureCard(featureId).locator('[data-test-subj="add-model-button"]');
  }

  public addModelOption(name: string): Locator {
    return this.page.testSubj.locator('add-model-selectable').getByRole('option', { name });
  }

  public copyToButton(featureId: string): Locator {
    return this.page.testSubj.locator(`copy-to-${featureId}`);
  }

  public copyToModalCheckbox(featureId: string): Locator {
    return this.page.locator(`#copy-target-${featureId}`);
  }

  public resetLink(parentName: string): Locator {
    return this.page.testSubj.locator(`reset-${parentName}`);
  }
}
