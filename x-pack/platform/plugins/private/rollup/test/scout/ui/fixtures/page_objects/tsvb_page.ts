/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// Configures a TSVB (Visual Builder) Metric panel to read a rollup index by name. Open a new TSVB
// visualization first via `pageObjects.visualize.createTSVBVisualization()`.
export class TsvbPage {
  readonly editor: Locator;
  readonly metricValue: Locator;

  constructor(private readonly page: ScoutPage) {
    this.editor = page.testSubj.locator('tvbVisEditor');
    this.metricValue = page.locator('.tvbVisMetric__value--primary');
  }

  // The combo `data-test-subj` sits on a wrapper (not the `.euiComboBox`), so drive the inner
  // search input directly: type the value and select it with Enter.
  private async setComboBox(subj: string, value: string): Promise<void> {
    const input = this.page.testSubj
      .locator(subj)
      .locator('input[data-test-subj="comboBoxSearchInput"]');
    await input.click();
    await input.fill(value);
    await input.press('Enter');
  }

  async selectMetricPanelType(): Promise<void> {
    await this.page.testSubj.locator('metricTsvbTypeBtn').click();
  }

  async openPanelOptions(): Promise<void> {
    await this.page.testSubj.locator('metricEditorPanelOptionsBtn').click();
  }

  // Switch the panel-options source off "Use only Kibana indices" so a raw rollup index name can be
  // typed (requires the `metrics:allowStringIndices` advanced setting). The toggle lives inside a
  // popover, so open it, flip the switch, close it, then type the index name.
  async useStringIndex(indexName: string): Promise<void> {
    const popoverButton = this.page.testSubj.locator(
      'switchIndexPatternSelectionModePopoverButton'
    );
    const popoverContent = this.page.testSubj.locator(
      'switchIndexPatternSelectionModePopoverContent'
    );

    await popoverButton.click();
    await popoverContent.waitFor({ state: 'visible' });
    // The EuiSwitch button inside the animating popover never settles for Playwright's
    // actionability checks, so force the click; on success the editor re-renders in string mode
    // (the plain index input appears), which is the reliable signal to wait on.
    await this.page.testSubj.locator('switchIndexPatternSelectionMode').click({ force: true });
    const input = this.page.testSubj.locator('metricsIndexPatternInput');
    await input.waitFor({ state: 'visible' });
    await this.page.keyboard.press('Escape');
    await popoverContent.waitFor({ state: 'hidden' });

    await input.click();
    await input.clear();
    await input.pressSequentially(indexName);
    // Typing alone never commits: FieldTextSelect only calls onIndexChange from its appended
    // "play" button ("Update visualization with entered data view") — click it.
    await this.page
      .getByRole('button', { name: 'Update visualization with entered data view' })
      .click();
  }

  async setTimeField(field: string): Promise<void> {
    await this.setComboBox('metricsIndexPatternFieldsSelect', field);
  }

  async setTimerangeMode(mode: string): Promise<void> {
    await this.setComboBox('dataTimeRangeMode', mode);
  }

  async setInterval(interval: string): Promise<void> {
    const input = this.page.testSubj.locator('metricsIndexPatternInterval');
    await input.fill(interval);
    // Commit the value so TSVB recomputes with the new interval (fill alone leaves the model stale).
    await input.blur();
  }

  // "Drop last bucket?" is a Yes/No radio pair (`metricsDropLastBucket-yes` / `-no`); click the label.
  async setDropLastBucket(on: boolean): Promise<void> {
    await this.page.testSubj
      .locator(`metricsDropLastBucket-${on ? 'yes' : 'no'}`)
      .locator('label')
      .click();
  }

  async getMetricValue(): Promise<string> {
    await this.metricValue.waitFor({ state: 'visible' });
    return (await this.metricValue.innerText()).trim();
  }
}
