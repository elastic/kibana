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

  // Top settings card rows
  readonly defaultModelSection: Locator;
  readonly aiCapabilitiesRow: Locator;
  readonly enableAiSwitch: Locator;
  readonly globalModelRow: Locator;
  readonly globalModelComboBox: Locator;
  readonly featureSpecificModelsRow: Locator;
  readonly featureSpecificModelsSwitch: Locator;

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

  // Per-sub-feature confirmation modals
  readonly disableRecommendedModelsModal: Locator;
  readonly disableRecommendedModelsConfirm: Locator;
  readonly resetDefaultsModal: Locator;
  readonly resetDefaultsConfirm: Locator;

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

    // Top settings card
    this.defaultModelSection = this.page.testSubj.locator('defaultModelSection');
    this.aiCapabilitiesRow = this.page.testSubj.locator('aiCapabilitiesRow');
    this.enableAiSwitch = this.page.testSubj.locator('enableAiSwitch');
    this.globalModelRow = this.page.testSubj.locator('globalModelRow');
    this.globalModelComboBox = this.page.testSubj.locator('globalModelComboBox');
    this.featureSpecificModelsRow = this.page.testSubj.locator('featureSpecificModelsRow');
    this.featureSpecificModelsSwitch = this.page.testSubj.locator('featureSpecificModelsSwitch');

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

    // Per-sub-feature confirmation modals
    this.disableRecommendedModelsModal = this.page.testSubj.locator(
      'disableRecommendedModelsModal'
    );
    this.disableRecommendedModelsConfirm = this.disableRecommendedModelsModal.getByRole('button', {
      name: /turn off recommended defaults/i,
    });
    this.resetDefaultsModal = this.page.testSubj.locator('resetDefaultsModal');
    this.resetDefaultsConfirm = this.resetDefaultsModal.getByRole('button', {
      name: /reset to default/i,
    });

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

  public useRecommendedDefaultsToggle(featureId: string): Locator {
    return this.page.testSubj.locator(`useRecommendedDefaultsToggle-${featureId}`);
  }

  public copyToButton(featureId: string): Locator {
    return this.page.testSubj.locator(`copy-to-${featureId}`);
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

  public copyToModalCheckbox(featureId: string): Locator {
    return this.page.locator(`#copy-target-${featureId}`);
  }

  // --- Composite actions ---

  /**
   * Switches a sub-feature into custom mode by toggling "Use recommended defaults" off and
   * confirming the disable modal. Waits for the editable list to render before returning.
   */
  public async disableRecommendedDefaults(featureId: string): Promise<void> {
    await this.useRecommendedDefaultsToggle(featureId).click();
    await this.disableRecommendedModelsConfirm.click();
    await this.disableRecommendedModelsModal.waitFor({ state: 'hidden' });
    await this.addModelButton(featureId).waitFor({ state: 'visible' });
  }

  /**
   * Picks a connector by visible name in the Global model combobox.
   * Avoids {@link EuiComboBoxWrapper.selectSingleOption}'s initial `clear()`, which asserts an empty
   * search input — that fails when the current selection is "No default model" (plain-text mode).
   */
  public async selectGlobalModel(name: string): Promise<void> {
    const combo = this.globalModelComboBox;
    await combo.locator('[data-test-subj="comboBoxInput"]').click();
    await combo.locator('[data-test-subj="comboBoxSearchInput"]').fill(name);
    await this.page.getByRole('option', { name, exact: false }).click();
  }
}
