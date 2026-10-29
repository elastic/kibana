/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class ThresholdBuilderPage {
  public readonly timeFieldSelect: Locator;
  public readonly addStatButton: Locator;

  private readonly indexComboBox;

  constructor(private readonly page: ScoutPage) {
    this.timeFieldSelect = this.page.testSubj.locator('ruleBuilderTimeField');
    this.addStatButton = this.page.testSubj.locator('ruleBuilderAddStat');
    this.indexComboBox = page.components.comboBox('ruleBuilderIndexField');
  }

  async setIndex(pattern: string) {
    // Index source list is fetched async (ES|QL sources) and the combo supports onCreateOption;
    // setCustomSelectedOptions types the pattern and commits it via onCreateOption (it won't
    // pre-exist as a selectable option).
    await this.indexComboBox.setCustomSelectedOptions([pattern]);
  }

  statAggSelect(idx: number): Locator {
    return this.page.testSubj.locator(`ruleBuilderStatAgg-${idx}`);
  }

  conditionThresholdInput(idx: number): Locator {
    return this.page.testSubj.locator(`ruleBuilderConditionThreshold-${idx}`);
  }

  async setConditionThreshold(idx: number, value: string) {
    await this.conditionThresholdInput(idx).fill(value);
  }
}
