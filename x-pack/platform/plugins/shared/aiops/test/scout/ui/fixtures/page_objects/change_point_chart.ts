/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class ChangePointChartPage {
  readonly initializer: Locator;
  readonly confirmButton: Locator;
  readonly embeddable: Locator;
  readonly noDataWarning: Locator;
  readonly noChangePointsCallout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.initializer = this.page.testSubj.locator('aiopsChangePointChartEmbeddableInitializer');
    this.confirmButton = this.page.testSubj.locator(
      'aiopsChangePointChartsInitializerConfirmButton'
    );
    this.embeddable = this.page.testSubj.locator('aiopsEmbeddableChangePointChart');
    this.noDataWarning = this.page.testSubj.locator('aiopsNoDataFoundWarning');
    this.noChangePointsCallout = this.page.testSubj.locator('aiopsNoChangePointsWarningCallout');
  }

  async openInitializer(): Promise<void> {
    await this.page.testSubj.locator('dashboardAddTopNavButton').click();
    await this.page.testSubj.locator('dashboardPanelSelectionFlyout').waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator('dashboardPanelSelectionFlyout__searchInput')
      .fill('Change point detection');
    await this.page.testSubj.click('create-action-Change point detection');
    await this.page.testSubj.locator('dashboardPanelSelectionFlyout').waitFor({ state: 'hidden' });
    await this.page.testSubj
      .locator('aiopsChangePointDetectionControls')
      .waitFor({ state: 'visible' });
  }

  async selectEmbeddableDataView(dataViewTitle: string): Promise<void> {
    await this.page.components
      .comboBox('aiopsChangePointChartEmbeddableDataViewSelector')
      .setSelectedOptions([dataViewTitle]);
  }

  async confirmInitializer(): Promise<void> {
    await this.confirmButton.click();
    await this.initializer.waitFor({ state: 'hidden' });
  }

  async openFromMlApp(): Promise<void> {
    await this.page.gotoApp('ml');
    await this.page.testSubj.click('mlMainTab changePointDetection');
    await this.page.testSubj.locator('mlDataSourceSelectorButton').waitFor({ state: 'visible' });
  }

  async selectAnalysisDataView(dataViewTitle: string): Promise<void> {
    await this.page.testSubj.click('mlDataSourceSelectorButton');
    await this.page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('indexPattern-switcher--input').fill(dataViewTitle);
    await this.page.testSubj.click(`dataView-${dataViewTitle}`);
    await this.page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('aiopsChangePointDetectionPage').waitFor({ state: 'visible' });
  }

  async useFullData(): Promise<void> {
    await this.page.testSubj.click('mlDatePickerButtonUseFullData');
    await this.page.testSubj.click('superDatePickerApplyTimeButton');
    await this.page
      .locator('[data-test-subj~="aiopsChangePointResultsTable"][data-test-subj~="loaded"]')
      .waitFor({ state: 'visible' });
  }

  async selectMetricField(fieldName: string): Promise<void> {
    await this.page.components
      .comboBox('aiopsChangePointMetricField')
      .setSelectedOptions([fieldName]);
  }

  async selectSplitField(fieldName: string): Promise<void> {
    await this.page.components
      .comboBox('aiopsChangePointSplitField')
      .setSelectedOptions([fieldName]);
  }

  async attachToNewDashboard(): Promise<void> {
    const panel = this.page.testSubj.locator('aiopsChangePointPanel_0');
    await panel.waitFor({ state: 'visible' });
    await panel.locator('[data-test-subj="aiopsChangePointDetectionContextMenuButton"]').click();
    await this.page.testSubj.click('aiopsChangePointDetectionAttachButton');
    await this.page.testSubj.click('aiopsChangePointDetectionAttachToDashboardButton');
    await this.page.testSubj
      .locator('aiopsChangePointDetectionDashboardAttachmentForm')
      .waitFor({ state: 'visible' });

    const applyTimeRange = this.page.testSubj.locator(
      'aiopsChangePointDetectionAttachToDashboardApplyTimeRangeSwitch'
    );
    await applyTimeRange.click();
    await applyTimeRange
      .and(this.page.locator('[aria-checked="true"]'))
      .waitFor({ state: 'visible' });

    await this.page.testSubj.locator('aiopsMaxSeriesControlFieldNumber').fill('1');
    await this.page.testSubj.click('aiopsChangePointDetectionSubmitDashboardAttachButton');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    await this.page.locator('label[for="new-dashboard-option"]').click();
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'hidden' });
    await this.embeddable.waitFor({ state: 'visible' });
  }
}
