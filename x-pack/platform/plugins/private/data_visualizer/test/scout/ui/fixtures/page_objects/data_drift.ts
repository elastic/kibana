/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { setComboBoxValue } from '../combo_box_helpers';

type SubjectId = 'reference' | 'comparison';

const RANDOM_SAMPLER_OPTION_VALUES: Record<DataDriftRandomSamplerOption, string> = {
  dvRandomSamplerOptionOff: 'off',
  dvRandomSamplerOptionOnManual: 'on_manual',
  dvRandomSamplerOptionOnAutomatic: 'on_automatic',
};

export type DataDriftRandomSamplerOption =
  | 'dvRandomSamplerOptionOnAutomatic'
  | 'dvRandomSamplerOptionOnManual'
  | 'dvRandomSamplerOptionOff';

export class DataDrift {
  private readonly dataSourceSelectorButton: Locator;
  private readonly timeRangeSelectorSection: Locator;
  private readonly useFullDataButton: Locator;
  private readonly applyTimeButton: Locator;
  private readonly queryInput: Locator;
  private readonly dataDriftTable: Locator;
  private readonly runAnalysisButton: Locator;
  private readonly analyzeWithoutSavingButton: Locator;
  private readonly analyzeDataDriftButton: Locator;
  private readonly customIndexPatternsPage: Locator;
  private readonly noWindowParametersEmptyPrompt: Locator;
  private readonly changeDataViewPopover: Locator;
  private readonly createDataViewNameInput: Locator;
  private readonly createDataViewTitleInput: Locator;
  private readonly saveIndexPatternButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.dataSourceSelectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');
    this.timeRangeSelectorSection = this.page.testSubj.locator(
      'dataComparisonTimeRangeSelectorSection'
    );
    this.useFullDataButton = this.page.testSubj.locator('mlDatePickerButtonUseFullData');
    this.applyTimeButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
    this.queryInput = this.page.testSubj.locator('dataVisualizerQueryInput');
    this.dataDriftTable = this.page.testSubj.locator('mlDataDriftTable');
    this.runAnalysisButton = this.page.testSubj.locator('runDataDriftAnalysis');
    this.analyzeWithoutSavingButton = this.page.testSubj.locator(
      'analyzeDataDriftWithoutSavingButton'
    );
    this.analyzeDataDriftButton = this.page.testSubj.locator('analyzeDataDriftButton');
    this.customIndexPatternsPage = this.page.testSubj.locator('mlPageDataDriftCustomIndexPatterns');
    this.noWindowParametersEmptyPrompt = this.page.testSubj.locator(
      'dataDriftNoWindowParametersEmptyPrompt'
    );
    this.changeDataViewPopover = this.page.testSubj.locator('changeDataViewPopover');
    this.createDataViewNameInput = this.page.testSubj.locator('createIndexPatternNameInput');
    this.createDataViewTitleInput = this.page.testSubj.locator('createIndexPatternTitleInput');
    this.saveIndexPatternButton = this.page.testSubj.locator('saveIndexPatternButton');
  }

  getDataTestSubject(testSubject: string, id?: string) {
    return id ? `${testSubject}-${id}` : testSubject;
  }

  async waitForDataViewTitle(expectedTitle: string) {
    await this.dataSourceSelectorButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      ({ expected }) => {
        const element = document.querySelector('[data-test-subj="mlDataSourceSelectorButton"]');
        return element?.getAttribute('title') === expected;
      },
      { expected: expectedTitle },
      { timeout: 5000 }
    );
  }

  async waitForDataViewTitleIfNeeded(dataViewName?: string) {
    if (dataViewName === undefined) {
      return;
    }

    await this.waitForDataViewTitle(dataViewName);
  }

  async waitForTimeRangeSelectorSection() {
    await this.timeRangeSelectorSection.waitFor({ state: 'visible' });
  }

  async waitForTotalDocumentCount(
    id: 'Reference' | 'Comparison',
    expectedFormattedTotalDocCount: string,
    timeout = 30_000
  ) {
    await this.page.waitForFunction(
      ({ testSubj, expected }) => {
        const element = document.querySelector(`[data-test-subj="${testSubj}"]`);
        return element?.textContent?.trim() === expected;
      },
      { testSubj: `dataVisualizerTotalDocCount-${id}`, expected: expectedFormattedTotalDocCount },
      { timeout }
    );
  }

  randomSamplerOptionsButton(id: string) {
    return this.page.testSubj.locator(
      this.getDataTestSubject('aiopsRandomSamplerOptionsButton', id)
    );
  }

  async waitForNoWindowParametersEmptyPrompt() {
    await this.noWindowParametersEmptyPrompt.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForRandomSamplingOption(
    id: string,
    expectedOption: DataDriftRandomSamplerOption,
    expectedProbability?: number,
    timeout = 20_000
  ) {
    await this.page.keyboard.press('Escape');
    await this.randomSamplerOptionsButton(id).click();
    await this.page.testSubj
      .locator(this.getDataTestSubject('aiopsRandomSamplerOptionsPopover', id))
      .waitFor({ state: 'visible' });

    if (expectedOption === 'dvRandomSamplerOptionOff') {
      await this.page.testSubj
        .locator('dvRandomSamplerProbabilityRange')
        .waitFor({ state: 'hidden' });
      await this.page.testSubj
        .locator('dvRandomSamplerProbabilityUsedMsg')
        .waitFor({ state: 'hidden' });
    }

    if (expectedOption === 'dvRandomSamplerOptionOnManual') {
      await this.page.testSubj
        .locator('dvRandomSamplerProbabilityRange')
        .waitFor({ state: 'visible' });

      if (expectedProbability !== undefined) {
        await this.page.waitForFunction(
          ({ expected }) => {
            const element = document.querySelector(
              '[data-test-subj="dvRandomSamplerProbabilityRange"]'
            );
            return element?.getAttribute('value') === `${expected}`;
          },
          { expected: expectedProbability },
          { timeout }
        );
      }
    }

    if (expectedOption === 'dvRandomSamplerOptionOnAutomatic') {
      await this.page.testSubj
        .locator('dvRandomSamplerProbabilityUsedMsg')
        .waitFor({ state: 'visible' });

      if (expectedProbability !== undefined) {
        await this.page.waitForFunction(
          ({ expected }) => {
            const element = document.querySelector(
              '[data-test-subj="dvRandomSamplerProbabilityUsedMsg"]'
            );
            return element?.textContent?.includes(`${expected}`) ?? false;
          },
          { expected: expectedProbability },
          { timeout }
        );
      }
    }
  }

  async setRandomSamplingOption(id: string, option: DataDriftRandomSamplerOption) {
    await this.page.keyboard.press('Escape');
    await this.randomSamplerOptionsButton(id).waitFor({ state: 'visible' });
    await this.randomSamplerOptionsButton(id).click();
    await this.page.testSubj
      .locator(this.getDataTestSubject('aiopsRandomSamplerOptionsPopover', id))
      .waitFor({ state: 'visible', timeout: 1000 });
    await this.page.testSubj
      .locator(this.getDataTestSubject('aiopsRandomSamplerOptionsSelect', id))
      .selectOption(RANDOM_SAMPLER_OPTION_VALUES[option]);
    await this.page.keyboard.press('Escape');
  }

  async clickUseFullDataButton() {
    await expect(this.useFullDataButton).toBeEnabled({ timeout: 30_000 });
    await this.useFullDataButton.click();
    await expect(this.applyTimeButton).toBeVisible({ timeout: 10_000 });
    await this.applyTimeButton.click();
  }

  async waitForPrimarySearchBar() {
    await this.queryInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForDocCountContent(id: string) {
    await this.page.testSubj
      .locator(this.getDataTestSubject('dataDriftTotalDocCountHeader', id))
      .waitFor({ state: 'visible', timeout: 5000 });
    await this.page.testSubj
      .locator(this.getDataTestSubject('dataDriftDocCountChart', id))
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForReferenceDocCountContent() {
    await this.waitForDocCountContent('Reference');
  }

  async waitForComparisonDocCountContent() {
    await this.waitForDocCountContent('Comparison');
  }

  async waitForHistogramBrushes(id: 'Reference' | 'Comparison' = 'Reference') {
    await this.page.testSubj
      .locator(`dataDriftBrush-${id}`)
      .waitFor({ state: 'attached', timeout: 30_000 });
  }

  async clickDocumentCountChart(
    id: 'Reference' | 'Comparison',
    chartClickCoordinates: [number, number]
  ) {
    const chart = this.page.testSubj.locator(`dataDriftDocCountChart-${id}`);
    await chart.waitFor({ state: 'visible', timeout: 30_000 });
    await chart
      .locator('.echChartStatus[data-ech-render-complete="true"]')
      .waitFor({ state: 'attached', timeout: 30_000 });
    const canvas = chart.locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 30_000 });
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error(`Chart dataDriftDocCountChart-${id} has no bounding box`);
    }

    // FTR WebDriver Actions used canvas-center as origin, so [0, 0] meant center.
    // Playwright positions are top-left relative — treat [0, 0] as "use center".
    const resolvedCoordinates: [number, number] =
      chartClickCoordinates[0] === 0 && chartClickCoordinates[1] === 0
        ? [Math.max(Math.floor(box.width / 2), 1), Math.max(Math.floor(box.height / 2), 1)]
        : chartClickCoordinates;

    const clickPositions: Array<[number, number]> = [
      resolvedCoordinates,
      [Math.max(Math.floor(box.width / 2), 1), Math.max(Math.floor(box.height / 2), 1)],
      [Math.max(Math.floor(box.width / 3), 1), Math.max(Math.floor(box.height / 2), 1)],
      [10, 10],
    ];

    for (const [x, y] of clickPositions) {
      await canvas.click({
        position: { x, y },
        timeout: 10_000,
      });

      if ((await this.page.testSubj.locator(`dataDriftBrush-${id}`).count()) > 0) {
        return;
      }

      await this.page.evaluate(
        ({ testSubj, clickX, clickY }) => {
          const chartElement = document.querySelector(`[data-test-subj="${testSubj}"] canvas`);
          if (!chartElement) {
            return;
          }
          const rect = chartElement.getBoundingClientRect();
          chartElement.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              clientX: rect.left + clickX,
              clientY: rect.top + clickY,
            })
          );
        },
        { testSubj: `dataDriftDocCountChart-${id}`, clickX: x, clickY: y }
      );

      if ((await this.page.testSubj.locator(`dataDriftBrush-${id}`).count()) > 0) {
        return;
      }
    }

    await expect
      .poll(async () => (await this.page.testSubj.locator(`dataDriftBrush-${id}`).count()) > 0, {
        timeout: 10_000,
      })
      .toBe(true);
  }

  async waitForDataDriftTable() {
    await this.dataDriftTable.waitFor({ state: 'visible' });
  }

  isRunAnalysisButtonDisabled() {
    return this.runAnalysisButton.isDisabled();
  }

  async runAnalysis() {
    await this.runAnalysisButton.click();
    await this.waitForDataDriftTable();
  }

  async navigateToCreateNewDataViewPage() {
    await this.page.gotoApp('ml/data_drift_custom');
    await this.customIndexPatternsPage.waitFor({ state: 'visible', timeout: 10_000 });
  }

  indexPatternFormRow(id: SubjectId) {
    return this.page.testSubj.locator(`mlDataDriftIndexPatternFormRow-${id}`);
  }

  async waitForIndexPatternNotEmptyFormError(id: SubjectId) {
    const row = this.indexPatternFormRow(id);
    await row.waitFor({ state: 'visible', timeout: 5000 });
    await row.locator('.euiFormErrorText').waitFor({ state: 'visible' });
  }

  indexPatternInput(id: SubjectId) {
    return this.page.testSubj.locator(`mlDataDriftIndexPatternTitleInput-${id}`);
  }

  async waitForIndexPatternInput(id: SubjectId, expectedText: string) {
    await this.page.waitForFunction(
      ({ testSubj, expected }) => {
        const element = document.querySelector(`[data-test-subj="${testSubj}"]`);
        return (element as HTMLInputElement | null)?.value === expected;
      },
      { testSubj: `mlDataDriftIndexPatternTitleInput-${id}`, expected: expectedText },
      { timeout: 5000 }
    );
  }

  async setIndexPatternInput(id: SubjectId, pattern: string) {
    const hasWildCard = pattern.endsWith('*');
    const trimmedPattern = hasWildCard ? pattern.slice(0, -1) : pattern;
    const inputTestSubj = `mlDataDriftIndexPatternTitleInput-${id}`;

    await this.page.testSubj.clearInput(inputTestSubj);
    await this.page.testSubj.typeWithDelay(inputTestSubj, trimmedPattern);

    if (!hasWildCard) {
      await this.indexPatternInput(id).focus();
      await this.page.keyboard.press('Delete');
    }

    await this.waitForIndexPatternInput(id, pattern);
  }

  async waitForAnalyzeWithoutSavingButtonHidden() {
    await this.analyzeWithoutSavingButton.waitFor({ state: 'hidden', timeout: 5000 });
  }

  isAnalyzeWithoutSavingButtonDisabled() {
    return this.analyzeWithoutSavingButton.isDisabled();
  }

  isAnalyzeDataDriftButtonDisabled() {
    return this.analyzeDataDriftButton.isDisabled();
  }

  async clickAnalyzeWithoutSavingButton() {
    await this.analyzeWithoutSavingButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.analyzeWithoutSavingButton.click();
    await this.customIndexPatternsPage.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickAnalyzeDataDrift() {
    await this.analyzeDataDriftButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.analyzeDataDriftButton.click();
    await this.customIndexPatternsPage.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForDataDriftTimestampField(expectedIdentifier: string) {
    // Combo box uses singleSelection.asPlainText — value is in the input, not a pill.
    const comboBox = this.page.components.comboBox('mlDataDriftTimestampField');
    await expect
      .poll(async () => {
        if (expectedIdentifier === '') {
          return (await comboBox.getSelectedOptions()).length === 0;
        }
        return (await comboBox.getSelectedOptions()).includes(expectedIdentifier);
      })
      .toBe(true);
  }

  async selectTimeField(timeFieldName: string) {
    const timestampFieldWrapper = this.page.testSubj.locator('mlDataDriftTimestampField');
    await expect
      .poll(async () => {
        const className = await timestampFieldWrapper.getAttribute('class');
        return !className?.includes('euiComboBox-isDisabled');
      })
      .toBe(true);
    await setComboBoxValue(this.page, 'mlDataDriftTimestampField', timeFieldName, {
      optionVisibilityTimeoutMs: 30_000,
    });
    await this.waitForDataDriftTimestampField(timeFieldName);
  }

  async openDataViewPicker() {
    await this.dataSourceSelectorButton.click();
    await this.changeDataViewPopover.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async openCreateDataViewFromPicker() {
    await this.openDataViewPicker();
    await this.page.testSubj.locator('dataview-create-new').click();
  }

  async createDataViewViaFlyout({
    name,
    indexPattern,
    timeField,
  }: {
    name: string;
    indexPattern: string;
    timeField?: string;
  }) {
    await this.createDataViewNameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.createDataViewNameInput.fill(name);
    await this.createDataViewTitleInput.fill(indexPattern);

    if (timeField) {
      await this.page.testSubj.locator('toggleAdvancedSetting').click();
      await this.page.testSubj.locator('allowHiddenField').waitFor({ state: 'visible' });

      const timestampFieldWrapper = this.page.testSubj.locator('timestampField');
      await timestampFieldWrapper.waitFor({ state: 'visible' });
      await expect
        .poll(async () => {
          const className = await timestampFieldWrapper.getAttribute('class');
          return !className?.includes('euiComboBox-isDisabled');
        })
        .toBe(true);
      await setComboBoxValue(this.page, 'timestampField', timeField, {
        optionVisibilityTimeoutMs: 10_000,
      });
    }

    await this.saveIndexPatternButton.click();
    await this.createDataViewNameInput.waitFor({ state: 'hidden', timeout: 10_000 });
  }
}
