/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout';
import { EuiComboBoxWrapper, KibanaCodeEditorWrapper } from '@kbn/scout';

/**
 * Page object for the Data Frame Analytics section of Stack Management ML.
 * Only the interactions needed by the current Scout spec files are exposed.
 * Assertions belong in the spec, not here.
 */
export class DataFrameAnalyticsPage {
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl
  ) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async gotoJobList(): Promise<void> {
    await this.page.goto(this.kbnUrl.app('management/ml/analytics'));
    await this.page.testSubj.locator('mlAnalyticsJobList').waitFor({ state: 'visible' });
  }

  // ── Creation wizard ───────────────────────────────────────────────────────

  /** Clicks the appropriate "create" button and waits for the source selection page. */
  async startCreation(): Promise<void> {
    const firstBtn = this.page.testSubj.locator('mlAnalyticsCreateFirstButton');
    if (await firstBtn.isVisible()) {
      await firstBtn.click();
    } else {
      await this.page.testSubj.locator('mlAnalyticsButtonCreate').click();
    }
    await this.page.testSubj.locator('mlDFAPageSourceSelection').waitFor({ state: 'visible' });
  }

  async selectSource(sourceName: string): Promise<void> {
    await this.page.testSubj.locator(`savedObjectTitle${sourceName}`).click();
    await this.page.testSubj.locator('mlAnalyticsCreationContainer').waitFor({ state: 'visible' });
  }

  async selectJobType(jobType: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsCreation-${jobType}-option`).click();
    // Wait for the selected indicator to appear
    await this.page.testSubj
      .locator(`mlAnalyticsCreation-${jobType}-option selectedJobType`)
      .waitFor({ state: 'visible' });
  }

  // ── Configuration step ───────────────────────────────────────────────────

  async enableRuntimeMappings(): Promise<void> {
    await this.page.testSubj.locator('mlDataFrameAnalyticsRuntimeMappingsEditorSwitch').click();
    await this.page.testSubj
      .locator('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor')
      .waitFor({ state: 'visible' });
  }

  async setRuntimeMappings(content: string): Promise<void> {
    await this.codeEditor.waitCodeEditorReady('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor');
    await this.codeEditor.setCodeEditorValue(content);
  }

  async getRuntimeMappingsContent(): Promise<string> {
    return this.codeEditor.getCodeEditorValue();
  }

  async applyRuntimeMappings(): Promise<void> {
    await this.page.testSubj.locator('mlDataFrameAnalyticsRuntimeMappingsApplyButton').click();
  }

  async setScatterplotSampleSize(value: string): Promise<void> {
    await this.page.testSubj.locator('mlScatterplotMatrixSampleSizeSelect').selectOption(value);
  }

  async setScatterplotRandomizeQuery(enable: boolean): Promise<void> {
    const switchEl = this.page.testSubj.locator('mlScatterplotMatrixRandomizeQuerySwitch');
    const isChecked = (await switchEl.getAttribute('aria-checked')) === 'true';
    if (isChecked !== enable) {
      await switchEl.click();
    }
  }

  async continueToAdditionalOptions(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardConfigurationStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedStep active')
      .waitFor({ state: 'visible' });
  }

  // ── Additional options step ───────────────────────────────────────────────

  async continueToDetails(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardAdvancedStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDetailsStep active')
      .waitFor({ state: 'visible' });
  }

  // ── Details step ─────────────────────────────────────────────────────────

  async setJobId(jobId: string): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobFlyoutJobIdInput').fill(jobId);
  }

  async setJobDescription(desc: string): Promise<void> {
    await this.page.testSubj.locator('mlDFAnalyticsJobCreationJobDescription').fill(desc);
  }

  async setDestIndexSameAsJobId(sameAsId: boolean): Promise<void> {
    const switchEl = this.page.testSubj.locator(
      'mlCreationWizardUtilsJobIdAsDestIndexNameSwitch'
    );
    const isChecked = (await switchEl.getAttribute('aria-checked')) === 'true';
    if (isChecked !== sameAsId) {
      await switchEl.click();
    }
  }

  async setDestinationIndex(index: string): Promise<void> {
    const input = this.page.testSubj.locator('mlCreationWizardUtilsDestinationIndexInput');
    await input.clear();
    await input.fill(index);
  }

  async continueToValidation(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardDetailsStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardValidationStepWrapper active')
      .waitFor({ state: 'visible' });
  }

  // ── Advanced editor (JSON) ────────────────────────────────────────────────

  async openAdvancedEditor(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardAdvancedEditorSwitch').click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedEditorCodeEditor')
      .waitFor({ state: 'visible' });
  }

  async getAdvancedEditorContent(): Promise<string> {
    return this.codeEditor.getCodeEditorValue();
  }

  async closeAdvancedEditor(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardAdvancedEditorSwitch').click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedEditorCodeEditor')
      .waitFor({ state: 'hidden' });
  }

  // ── Validation + create step ──────────────────────────────────────────────

  async continueToCreate(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardValidationStepWrapper active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardCreateStep active')
      .waitFor({ state: 'visible' });
  }

  /**
   * Creates and immediately starts the job (assumes the "start job" switch is on by default).
   * Navigates back to the job list after the creation card appears.
   */
  async createAndStartJob(): Promise<void> {
    const startSwitch = this.page.testSubj.locator('mlAnalyticsCreateJobWizardStartJobSwitch');
    if ((await startSwitch.getAttribute('aria-checked')) !== 'true') {
      await startSwitch.click();
    }
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton').click();
    await this.page.testSubj
      .locator('analyticsWizardCardManagement')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('analyticsWizardCardManagement').click();
    await this.page.testSubj.locator('mlAnalyticsJobList').waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── Job table ─────────────────────────────────────────────────────────────

  async waitForTableLoaded(): Promise<void> {
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .waitFor({ state: 'visible', timeout: 60_000 });
    await this.page.testSubj
      .locator('mlAnalyticsTable loaded')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async filterByJobId(jobId: string): Promise<void> {
    await this.waitForTableLoaded();
    const searchInput = this.page.testSubj
      .locator('mlAnalyticsTableContainer')
      .locator('.euiFieldSearch');
    await searchInput.fill('');
    await searchInput.fill(jobId);
    // wait for the matching row to appear
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .waitFor({ state: 'visible' });
  }

  /** Returns key visible column values from the matching table row. */
  async getRowData(jobId: string): Promise<Record<string, string>> {
    const row = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`);

    // Mirror the FTR approach: scope to .euiTableCellContent to avoid picking up
    // whitespace or icon text from the outer <td> wrapper.
    const getText = async (subj: string) =>
      (
        await row.locator(`[data-test-subj="${subj}"]`).locator('.euiTableCellContent').innerText()
      ).trim();

    return {
      id: await getText('mlAnalyticsTableColumnId'),
      description: await getText('mlAnalyticsTableColumnJobDescription'),
      memoryStatus: await getText('mlAnalyticsTableColumnJobMemoryStatus'),
      sourceIndex: await getText('mlAnalyticsTableColumnSourceIndex'),
      destinationIndex: await getText('mlAnalyticsTableColumnDestIndex'),
      type: await getText('mlAnalyticsTableColumnType'),
      status: await getText('mlAnalyticsTableColumnStatus'),
      // Progress is a visual EuiProgress bar; read the value attribute (not innerText)
      progress:
        (await row
          .locator('[data-test-subj="mlAnalyticsTableColumnProgress"]')
          .locator('[data-test-subj="mlAnalyticsTableProgress"]')
          .getAttribute('value')) ?? '',
    };
  }

  private async ensureActionsMenuOpen(jobId: string): Promise<void> {
    if (!(await this.page.testSubj.locator('mlAnalyticsJobDeleteButton').isVisible())) {
      await this.page.testSubj
        .locator('~mlAnalyticsTable')
        .locator(`[data-test-subj~="row-${jobId}"]`)
        .locator('[data-test-subj="euiCollapsedItemActionsButton"]')
        .click();
      await this.page.testSubj
        .locator('mlAnalyticsJobDeleteButton')
        .waitFor({ state: 'visible' });
    }
  }

  async openEditFlyout(jobId: string): Promise<void> {
    // Close any stale open menu first
    if (await this.page.testSubj.locator('mlAnalyticsJobDeleteButton').isVisible()) {
      await this.page.keyboard.press('Escape');
    }
    await this.ensureActionsMenuOpen(jobId);
    await this.page.testSubj.locator('mlAnalyticsJobEditButton').click();
    await this.page.testSubj.locator('mlAnalyticsEditFlyout').waitFor({ state: 'visible' });
  }

  async openResultsView(jobId: string): Promise<void> {
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .locator('[data-test-subj="mlAnalyticsJobViewButton"]')
      .click();
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsExploration')
      .waitFor({ state: 'visible' });
  }

  async openMapView(jobId: string): Promise<void> {
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .locator('[data-test-subj="mlAnalyticsJobMapButton"]')
      .click();
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsMap')
      .waitFor({ state: 'visible' });
  }

  // ── Edit flyout ───────────────────────────────────────────────────────────

  async editDescription(desc: string): Promise<void> {
    const input = this.page.testSubj.locator('mlAnalyticsEditFlyoutDescriptionInput');
    await input.clear();
    await input.fill(desc);
  }

  async editModelMemoryLimit(mml: string): Promise<void> {
    const input = this.page.testSubj.locator('mlAnalyticsEditFlyoutmodelMemoryLimitInput');
    await input.clear();
    await input.fill(mml);
  }

  async submitEdit(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsEditFlyoutUpdateButton').click();
    await this.page.testSubj.locator('mlAnalyticsEditFlyout').waitFor({ state: 'hidden' });
  }

  // ── Custom URLs tab ───────────────────────────────────────────────────────

  async openCustomUrlsTab(): Promise<void> {
    await this.page.testSubj.locator('mlEditAnalyticsJobFlyout-customUrls').click();
    await this.page.testSubj
      .locator('mlJobOpenCustomUrlFormButton')
      .waitFor({ state: 'visible' });
  }

  private async openCustomUrlEditor(): Promise<void> {
    await this.page.testSubj.locator('mlJobOpenCustomUrlFormButton').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'visible' });
  }

  private async selectRadioOption(groupTestSubj: string, value: string): Promise<void> {
    await this.page.testSubj
      .locator(groupTestSubj)
      .locator(`label[for="${value}"]`)
      .click();
  }

  async addDiscoverCustomUrl(config: {
    label: string;
    indexName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DISCOVER');
    // EuiSelect — select by visible label text
    await this.page.testSubj
      .locator('mlJobCustomUrlDiscoverIndexPatternInput')
      .selectOption({ label: config.indexName });
    // Query entities combobox
    if (config.queryEntityFieldNames.length > 0) {
      const entitiesCombo = new EuiComboBoxWrapper(this.page, 'mlJobCustomUrlQueryEntitiesInput');
      await entitiesCombo.selectMultiOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
  }

  async addDashboardCustomUrl(config: {
    label: string;
    dashboardName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DASHBOARD');
    // Dashboard selector is an EuiSelect (native <select>), not a ComboBox
    await this.page.testSubj
      .locator('mlJobCustomUrlDashboardNameInput')
      .selectOption({ label: config.dashboardName });
    // Query entities combobox
    if (config.queryEntityFieldNames.length > 0) {
      const entitiesCombo = new EuiComboBoxWrapper(this.page, 'mlJobCustomUrlQueryEntitiesInput');
      await entitiesCombo.selectMultiOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
  }

  async addOtherTypeCustomUrl(config: { label: string; url: string }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'OTHER');
    await this.page.testSubj.locator('mlJobCustomUrlOtherTypeUrlInput').fill(config.url);
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
  }
}
