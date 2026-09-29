/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { RANDOM_SAMPLER_OPTION_VALUES, type RandomSamplerOption } from '../random_sampler';

export type { RandomSamplerOption };

export class IndexDataVisualizer {
  readonly randomSamplerOptionsButton: Locator;
  readonly randomSamplerOptionsSelect: Locator;
  private readonly timeRangeSelectorSection: Locator;
  private readonly useFullDataButton: Locator;
  private readonly applyTimeButton: Locator;
  private readonly totalDocCount: Locator;

  constructor(private readonly page: ScoutPage) {
    this.randomSamplerOptionsButton = this.page.testSubj.locator('dvRandomSamplerOptionsButton');
    // Select is only mounted while the panel is open. The popover wrapper's
    // data-test-subj stays in the DOM even when closed, so it is not a ready signal.
    this.randomSamplerOptionsSelect = this.page.testSubj.locator('dvRandomSamplerOptionsSelect');
    this.timeRangeSelectorSection = this.page.testSubj.locator(
      'dataVisualizerTimeRangeSelectorSection'
    );
    this.useFullDataButton = this.page.testSubj.locator('mlDatePickerButtonUseFullData');
    this.applyTimeButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
    this.totalDocCount = this.page.testSubj.locator('dataVisualizerTotalDocCount');
  }

  private async openRandomSamplerPopoverOnce() {
    // Escape can race with the toggle click (closes instead of opens). Callers retry.
    await this.page.keyboard.press('Escape');
    await this.randomSamplerOptionsSelect.waitFor({ state: 'hidden', timeout: 2_000 });
    await expect(this.randomSamplerOptionsButton).toBeEnabled({ timeout: 10_000 });
    await this.randomSamplerOptionsButton.click();
    await this.randomSamplerOptionsSelect.waitFor({ state: 'visible' });
  }

  async openRandomSamplerPopover() {
    await expect(async () => {
      await this.openRandomSamplerPopoverOnce();
    }).toPass({ timeout: 20_000 });
  }

  async setRandomSamplingOption(option: RandomSamplerOption) {
    await expect(async () => {
      await this.openRandomSamplerPopoverOnce();
      await this.randomSamplerOptionsSelect.selectOption(RANDOM_SAMPLER_OPTION_VALUES[option]);
      await this.page.keyboard.press('Escape');
      await this.randomSamplerOptionsSelect.waitFor({ state: 'hidden' });
    }).toPass({ timeout: 20_000 });
  }

  async waitForTimeRangeSelectorSection() {
    await this.timeRangeSelectorSection.waitFor({ state: 'visible' });
  }

  async waitForTotalDocumentCount(expectedFormattedTotalDocCount: string) {
    await expect(this.totalDocCount).toHaveText(expectedFormattedTotalDocCount, {
      timeout: 30_000,
    });
  }

  async clickUseFullDataButton(
    expectedFormattedTotalDocCount: string,
    randomSamplerOption: RandomSamplerOption | 'none' = 'dvRandomSamplerOptionOff'
  ) {
    // Match FTR: retry the full use-full-data flow. Saved-search filters can race with the
    // initial load so the first apply may leave total docs at 0; re-applying recovers.
    await expect(async () => {
      await expect(this.useFullDataButton).toBeEnabled({ timeout: 10_000 });
      await this.useFullDataButton.click();
      await expect(this.applyTimeButton).toBeEnabled({ timeout: 10_000 });
      await this.applyTimeButton.click();

      if (randomSamplerOption !== 'none') {
        await this.setRandomSamplingOption(randomSamplerOption);
      }

      await expect(this.totalDocCount).toHaveText(expectedFormattedTotalDocCount, {
        timeout: 10_000,
      });
    }).toPass({ timeout: 60_000 });
  }

  async waitForTotalDocCountHeader() {
    await this.page.testSubj
      .locator('dataVisualizerTotalDocCountHeader')
      .waitFor({ state: 'visible' });
  }

  async waitForTotalDocCountChart() {
    await this.page.testSubj
      .locator('dataVisualizerDocumentCountChart')
      .waitFor({ state: 'visible' });
  }

  async waitForTotalDocCountChartIfNeeded(shouldWait: boolean) {
    if (!shouldWait) {
      return;
    }

    await this.waitForTotalDocCountChart();
  }

  async waitForDataVisualizerTable() {
    await this.page.testSubj.locator('~dataVisualizerTable-loaded').waitFor({ state: 'visible' });
  }

  async waitForFieldCountPanel() {
    await this.page.testSubj.locator('dataVisualizerFieldCountPanel').waitFor({ state: 'visible' });
  }

  async waitForMetricFieldsSummary() {
    await this.page.testSubj
      .locator('dataVisualizerMetricFieldsSummary')
      .waitFor({ state: 'visible' });
  }

  async waitForFieldsSummary() {
    await this.page.testSubj.locator('dataVisualizerFieldsSummary').waitFor({ state: 'visible' });
  }

  async waitForVisibleMetricFieldsCount(count: number) {
    await expect(this.page.testSubj.locator('dataVisualizerVisibleMetricFieldsCount')).toHaveText(
      count.toString()
    );
  }

  async waitForTotalMetricFieldsCount(count: number) {
    await expect(this.page.testSubj.locator('dataVisualizerMetricFieldsCount')).toContainText(
      count.toString()
    );
  }

  async waitForVisibleFieldsCount(count: number) {
    await expect(this.page.testSubj.locator('dataVisualizerVisibleFieldsCount')).toHaveText(
      count.toString()
    );
  }

  async waitForTotalFieldsCount(count: number) {
    await expect(this.page.testSubj.locator('dataVisualizerTotalFieldsCount')).toContainText(
      count.toString()
    );
  }
}
