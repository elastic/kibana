/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class DataVisualizerSelector {
  private readonly importDataCard: Locator;
  private readonly indexDataCard: Locator;
  private readonly startTrialCard: Locator;
  private readonly selectIndexButton: Locator;
  private readonly uploadFileButton: Locator;
  private readonly startTrialButton: Locator;
  private readonly selectEsqlButton: Locator;
  private readonly indexPage: Locator;
  private readonly dataSourceSelectorButton: Locator;
  private readonly fileUploadPage: Locator;
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.importDataCard = this.page.testSubj.locator('mlDataVisualizerCardImportData');
    this.indexDataCard = this.page.testSubj.locator('mlDataVisualizerCardIndexData');
    this.startTrialCard = this.page.testSubj.locator('mlDataVisualizerCardStartTrial');
    this.selectIndexButton = this.page.testSubj.locator('mlDataVisualizerSelectIndexButton');
    this.uploadFileButton = this.page.testSubj.locator('mlDataVisualizerUploadFileButton');
    this.startTrialButton = this.page.testSubj.locator('mlDataVisualizerStartTrialButton');
    this.selectEsqlButton = this.page.testSubj.locator('mlDataVisualizerSelectESQLButton');
    this.indexPage = this.page.testSubj.locator('dataVisualizerIndexPage');
    this.dataSourceSelectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');
    this.fileUploadPage = this.page.testSubj.locator('dataVisualizerPageFileUpload');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async waitForImportDataCard() {
    await this.importDataCard.waitFor({ state: 'visible' });
  }

  async waitForIndexDataCard() {
    await this.indexDataCard.waitFor({ state: 'visible' });
  }

  async waitForStartTrialCard() {
    await this.startTrialCard.waitFor({ state: 'visible' });
  }

  isSelectIndexButtonEnabled() {
    return this.selectIndexButton.isEnabled();
  }

  isUploadFileButtonEnabled() {
    return this.uploadFileButton.isEnabled();
  }

  isStartTrialButtonEnabled() {
    return this.startTrialButton.isEnabled();
  }

  async navigateToESQLVisualizer() {
    await this.selectEsqlButton.click();
    await this.indexPage.waitFor({ state: 'visible' });
  }

  async navigateToDataViewSelection() {
    await this.selectIndexButton.click();
    await this.dataSourceSelectorButton.waitFor({ state: 'visible' });
  }

  async navigateToFileUpload() {
    await this.uploadFileButton.click();
    await this.fileUploadPage.waitFor({ state: 'visible' });
  }

  async setESQLQuery(query: string) {
    const refreshButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
    const updateButton = this.page.testSubj.locator('mlDatePickerRefreshPageButton loaded');

    await expect
      .poll(async () => {
        const superVisible = await refreshButton.isVisible();
        const updateVisible = await updateButton.isVisible();
        if (!superVisible && !updateVisible) {
          return false;
        }

        const button = superVisible ? refreshButton : updateButton;
        return (await button.innerText()).trim() === 'Refresh';
      })
      .toBe(true);

    await this.page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
    await this.codeEditor.setCodeEditorValue(query);

    const applyButton = (await refreshButton.isVisible()) ? refreshButton : updateButton;
    await expect.poll(async () => (await applyButton.innerText()).trim() === 'Update').toBe(true);
    await applyButton.click();
  }

  async waitForLimitSize(size: 5000 | 10000 | 100000) {
    await this.page.testSubj.locator(`dvESQLLimitSize-${size}`).waitFor({ state: 'visible' });
  }

  async setLimitSize(size: 5000 | 10000) {
    await this.page.keyboard.press('Escape');
    await this.page.testSubj.locator('dvESQLLimitSizeSelect').click();
    await this.page.testSubj.locator('dvESQLLimitSizeSelect').selectOption(`${size}`);
    await expect
      .poll(async () => {
        const selectedValue = await this.page.testSubj
          .locator('dvESQLLimitSizeSelect')
          .inputValue();
        return selectedValue === `${size}`;
      })
      .toBe(true);
  }
}
