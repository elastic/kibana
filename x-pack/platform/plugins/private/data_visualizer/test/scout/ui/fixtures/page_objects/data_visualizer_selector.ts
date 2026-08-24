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
  private readonly esqlEditor: Locator;
  private readonly refreshPageButton: Locator;
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
    this.esqlEditor = this.page.testSubj.locator('DataVisualizerESQLEditor');
    this.refreshPageButton = this.page.testSubj.locator('~mlDatePickerRefreshPageButton');
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
    await this.esqlEditor.waitFor({ state: 'visible' });
    await this.codeEditor.waitCodeEditorReady('DataVisualizerESQLEditor');
    await this.refreshPageButton.waitFor({ state: 'visible' });

    // Programmatically set the Monaco model (Discover/Streams Scout pattern). fill() and
    // insertText() can update the hidden textarea without firing onChange, so localQuery
    // never updates and the date picker stays on Refresh.
    await expect(async () => {
      await this.codeEditor.setCodeEditorValue(query);
      await expect(this.refreshPageButton.filter({ hasText: 'Update' })).toBeVisible();
    }).toPass({ timeout: 30_000 });

    await this.refreshPageButton.click();
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
