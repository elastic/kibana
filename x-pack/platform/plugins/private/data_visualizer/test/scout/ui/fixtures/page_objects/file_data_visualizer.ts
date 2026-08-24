/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const FIXED_FOOTER_HEIGHT = 72;

export class FileDataVisualizer {
  private readonly fileLoadingIndicator: Locator;
  private readonly fileUploadErrorCallout: Locator;
  private readonly fileInput: Locator;
  private readonly importButton: Locator;
  private readonly createDataViewSwitch: Locator;
  private readonly advancedSettingsAccordion: Locator;
  private readonly dataViewNameInput: Locator;
  private readonly filebeatConfigLink: Locator;
  private readonly filebeatConfigPanel: Locator;
  private readonly filebeatConfigCloseButton: Locator;
  private readonly importSettingsPanel: Locator;
  private readonly resultsLinks: Locator;

  constructor(private readonly page: ScoutPage) {
    this.fileLoadingIndicator = this.page.testSubj.locator('dataVisualizerPageFileLoading');
    // Scope to `.euiCallOut` so the locator does not also match EUI's
    // `…__content` child that reuses the same data-test-subj token.
    this.fileUploadErrorCallout = this.page.locator(
      '.euiCallOut[data-test-subj~="dataVisualizerFileUploadErrorCallout"]'
    );
    this.fileInput = this.page.locator('input[type="file"]');
    this.importButton = this.page.testSubj.locator('fileUploadImportButton');
    this.createDataViewSwitch = this.page.testSubj.locator('dataVisualizerCreateDataViewSwitch');
    this.advancedSettingsAccordion = this.page.testSubj.locator(
      'dataVisualizerAdvancedSettingsAccordion'
    );
    this.dataViewNameInput = this.page.testSubj.locator('dataVisualizerDataViewNameInput');
    this.filebeatConfigLink = this.page.testSubj.locator('fileDataVisFilebeatConfigLink');
    this.filebeatConfigPanel = this.page.testSubj.locator('fileDataVisFilebeatConfigPanel');
    this.filebeatConfigCloseButton = this.page.testSubj.locator('fileBeatConfigFlyoutCloseButton');
    this.importSettingsPanel = this.page.testSubj.locator('dataVisualizerFileImportSettingsPanel');
    this.resultsLinks = this.page.testSubj.locator('dataVisualizerFileResultsLinks');
  }

  async selectFile(path: string, expectError = false) {
    await this.fileInput.setInputFiles(path);
    await this.fileLoadingIndicator.waitFor({ state: 'hidden' });

    if (expectError) {
      await this.fileUploadErrorCallout.waitFor({ state: 'visible' });
    } else {
      await this.fileUploadErrorCallout.waitFor({ state: 'hidden' });
    }
  }

  fileTitleLocator(index: number) {
    return this.page.testSubj.locator(`dataVisualizerFileResultsTitle-${index}`);
  }

  async getFileTitle(index: number) {
    return this.fileTitleLocator(index).innerText();
  }

  async waitForFilePreviewPanel(index: number) {
    await this.page.testSubj
      .locator(`dataVisualizerFilePreviewPanel-${index}`)
      .waitFor({ state: 'visible' });
  }

  async waitForFileContentsPanel(index: number) {
    await this.page.testSubj
      .locator(`dataVisualizerFileContentsPanel-${index}`)
      .waitFor({ state: 'visible' });
  }

  async getFileContentHighlightingSwitchCount() {
    return this.page.testSubj.locator('dataVisualizerFileContentsHighlightingSwitch').count();
  }

  async getHighlightedLineCount() {
    return this.page.testSubj.locator('dataVisualizerHighlightedLine').count();
  }

  async getHighlightedFieldBadgeCount() {
    const lines = this.page.testSubj.locator('dataVisualizerHighlightedLine');
    if ((await lines.count()) === 0) {
      return 0;
    }

    return lines.locator('[data-test-subj="dataVisualizerFieldBadge"]').count();
  }

  async selectAnalysisExplanationButton(index: number) {
    await this.page.testSubj.locator(`mlFileUploadAnalysisExplanationButton-${index}`).click();
    await this.page.testSubj.locator('mlFileUploadAnalysisExplanationModal').waitFor({
      state: 'visible',
    });
  }

  async waitForSummaryPanel() {
    await this.page.testSubj.locator('mlFileUploadFileSummaryPanel').waitFor({ state: 'visible' });
  }

  async waitForAnalysisExplanationPanel() {
    await this.page.testSubj
      .locator('mlFileUploadAnalysisExplanationText')
      .waitFor({ state: 'visible' });
  }

  async closeAnalysisExplanationPanel() {
    await this.page.locator('.euiButtonIcon.euiModal__closeIcon').click();
  }

  async waitForFileStatsPanel(index: number) {
    await this.page.testSubj
      .locator(`dataVisualizerFileStatsPanel-${index}`)
      .waitFor({ state: 'visible' });
  }

  async getFieldCardCount() {
    return this.page.testSubj.locator('mlPageFileDataVisFieldDataCard').count();
  }

  isImportButtonEnabled() {
    return this.importButton.isEnabled();
  }

  async selectFieldStatsTab(index: number) {
    await this.page.testSubj.locator(`mlFileUploadFileStatusStatsTab-${index}`).click();
    await this.waitForFileStatsPanel(index);
  }

  async waitForImportSettingsPanel() {
    await this.importSettingsPanel.waitFor({ state: 'visible' });
  }

  async getIndexNameValue() {
    return this.page.testSubj.locator('dataVisualizerFileIndexNameInput').inputValue();
  }

  async setIndexName(indexName: string) {
    const input = this.page.testSubj.locator('dataVisualizerFileIndexNameInput');
    await input.scrollIntoViewIfNeeded();
    await input.fill(indexName);
    await expect.poll(async () => input.inputValue()).toBe(indexName);
  }

  async getCreateIndexPatternCheckboxValue() {
    const checked = await this.createDataViewSwitch.getAttribute('aria-checked');
    return checked === 'true';
  }

  async setCreateIndexPatternCheckboxState(newState: boolean) {
    if ((await this.getCreateIndexPatternCheckboxValue()) !== newState) {
      await this.createDataViewSwitch.click();
    }

    await expect.poll(async () => this.getCreateIndexPatternCheckboxValue()).toBe(newState);
  }

  async startImportAndWaitForProcessing() {
    await expect(this.importButton).toBeEnabled({ timeout: 30_000 });
    await this.importButton.click();
    await this.resultsLinks.waitFor({ state: 'visible', timeout: 120_000 });
  }

  async openAdvancedSettings() {
    await this.advancedSettingsAccordion.click();
    await this.dataViewNameInput.waitFor({ state: 'visible' });
  }

  async selectCreateFilebeatConfig() {
    await this.filebeatConfigLink.scrollIntoViewIfNeeded();
    await this.page.evaluate((bottomOffset) => {
      const element = document.querySelector('[data-test-subj="fileDataVisFilebeatConfigLink"]');
      element?.scrollIntoView({ block: 'end' });
      window.scrollBy(0, bottomOffset);
    }, FIXED_FOOTER_HEIGHT);
    await this.filebeatConfigLink.click();
    await this.filebeatConfigPanel.waitFor({ state: 'visible' });
  }

  async closeCreateFilebeatConfig() {
    await this.filebeatConfigCloseButton.click();
    await this.filebeatConfigPanel.waitFor({ state: 'hidden' });
  }
}
