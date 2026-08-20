/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the Data Frame Analytics section of Stack Management ML.
 * Only the interactions needed by the current Scout spec files are exposed.
 * Assertions belong in the spec, not here.
 */
export class DataFrameAnalyticsPage {
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  private async waitForExplainResponse(requestBodyFragment?: string): Promise<void> {
    await this.page.waitForResponse(
      (response) =>
        response.url().includes('/internal/ml/data_frame/analytics/_explain') &&
        response.ok() &&
        (requestBodyFragment === undefined ||
          response.request().postData()?.includes(requestBodyFragment) === true),
      { timeout: 30_000 }
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async gotoJobList(): Promise<void> {
    await this.page.goto(
      this.kbnUrl.app('management/ml/analytics?_g=(refreshInterval:(pause:!t,value:30000))')
    );
    // List renders null until the first ML API fetch completes; works for empty and
    // non-clean CI lists. 60 s covers cold-start and same-URL remounts.
    await this.page.testSubj
      .locator('mlAnalyticsJobList')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  // ── Creation wizard ───────────────────────────────────────────────────────

  /**
   * Uses the always-rendered header button rather than the empty-state one,
   * so it works in non-clean CI environments that carry leftover DFA jobs.
   */
  async startCreation(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsButtonCreate').click();
    await this.page.testSubj.locator('mlDFAPageSourceSelection').waitFor({ state: 'visible' });
  }

  async selectSource(sourceName: string): Promise<void> {
    // SavedObjectFinder fires an async fetch on mount; mlDFAPageSourceSelection becoming
    // visible does not guarantee the item list is populated yet. Wait for the initial load
    // to settle before typing. EuiBasicTable sets aria-busy="true" on the inner <table>
    // while loading and removes the attribute when done (it is never set to "false").
    await this.page.testSubj
      .locator('savedObjectsFinderTable')
      .locator('table:not([aria-busy="true"])')
      .waitFor({ state: 'visible', timeout: 40_000 });
    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    // The finder's EuiSearchBar (incremental) only fetches filtered results from its onChange
    // handler, which fires on real keyboard events. Playwright's fill() sets the value via
    // insertText without firing those events, so the fetch never runs, the list stays
    // unfiltered and the target row never appears. Drive the search with native type() to
    // fire the keydown/keyup events onChange listens for.
    await searchInput.click();
    await searchInput.clear();
    await searchInput.type(sourceName, { delay: 50 });
    // Wait for the debounced search + fetch to render the matching source row rather than
    // relying on the default action timeout — it can be slow under CI load.
    const resultItem = this.page.testSubj.locator(`savedObjectTitle${sourceName}`);
    await resultItem.waitFor({ state: 'visible', timeout: 40_000 });
    await resultItem.click();
    await this.page.testSubj.locator('mlAnalyticsCreationContainer').waitFor({ state: 'visible' });
  }

  async selectJobType(jobType: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsCreation-${jobType}-option`).click();
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
    const outlierDetectionSelected = await this.page.testSubj
      .locator('mlAnalyticsCreation-outlier_detection-option selectedJobType')
      .isVisible();
    const runtimeMappingsExplainResponse = outlierDetectionSelected
      ? this.waitForExplainResponse('"runtime_mappings"')
      : undefined;
    await this.page.testSubj.locator('mlDataFrameAnalyticsRuntimeMappingsApplyButton').click();
    if (runtimeMappingsExplainResponse !== undefined) {
      await runtimeMappingsExplainResponse;
    }
  }

  async setScatterplotSampleSize(value: string): Promise<void> {
    await this.page.testSubj.locator('mlScatterplotMatrixSampleSizeSelect').selectOption(value);
  }

  // TODO: replace idempotent toggle with explicit click once test state is reliable.
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
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── Additional options step ───────────────────────────────────────────────

  async openHyperParameters(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardHyperParametersSection').click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobFlyoutMaxTreesInput')
      .waitFor({ state: 'visible' });
  }

  async setMaxTrees(value: number): Promise<void> {
    await this.openHyperParameters();
    await this.page.testSubj.locator('mlAnalyticsCreateJobFlyoutMaxTreesInput').fill(`${value}`);
  }

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

  // TODO: replace idempotent toggle with explicit click once test state is reliable.
  async setDestIndexSameAsJobId(sameAsId: boolean): Promise<void> {
    const switchEl = this.page.testSubj.locator('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch');
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

  /** Creates and starts the job, then navigates back to the job list. */
  // TODO: replace idempotent toggle with explicit click once test state is reliable.
  async createAndStartJob(): Promise<void> {
    const startSwitch = this.page.testSubj.locator('mlAnalyticsCreateJobWizardStartJobSwitch');
    if ((await startSwitch.getAttribute('aria-checked')) !== 'true') {
      await startSwitch.click();
    }
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton').click();
    // ML backend may be busy; give the post-creation card 40 s to appear.
    await this.page.testSubj
      .locator('analyticsWizardCardManagement')
      .waitFor({ state: 'visible', timeout: 40_000 });
    await this.page.testSubj.locator('analyticsWizardCardManagement').click();
    // List re-fetches after navigation; a non-clean CI environment can make this slower than
    // initial list navigation while the new job is also being started.
    await this.page.testSubj
      .locator('mlAnalyticsJobList')
      .waitFor({ state: 'visible', timeout: 90_000 });
  }

  // ── Job table ─────────────────────────────────────────────────────────────

  async waitForTableLoaded(): Promise<void> {
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .waitFor({ state: 'visible', timeout: 60_000 });
    // "loaded" suffix is set once data renders; 60 s covers environments with many existing jobs.
    await this.page.testSubj
      .locator('mlAnalyticsTable loaded')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async filterByJobId(jobId: string): Promise<void> {
    await this.waitForTableLoaded();
    const searchInput = this.page.testSubj.locator('mlAnalyticsSearchBox');
    await searchInput.fill('');
    await searchInput.fill(jobId);
    // 30 s covers search + table re-render latency under CI load.
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Returns key visible column values from the matching table row. */
  async getRowData(jobId: string): Promise<Record<string, string>> {
    const row = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`);

    const getText = async (subj: string) =>
      // EuiBasicTable appends a hidden copy-marker <span> that innerText() includes;
      // scope to the direct div child to exclude it without relying on EUI class names.
      (await row.locator(`[data-test-subj="${subj}"] > div`).innerText()).trim();

    return {
      id: await getText('mlAnalyticsTableColumnId'),
      description: await getText('mlAnalyticsTableColumnJobDescription'),
      memoryStatus: await getText('mlAnalyticsTableColumnJobMemoryStatus'),
      sourceIndex: await getText('mlAnalyticsTableColumnSourceIndex'),
      destinationIndex: await getText('mlAnalyticsTableColumnDestIndex'),
      type: await getText('mlAnalyticsTableColumnType'),
      status: await getText('mlAnalyticsTableColumnStatus'),
      // Progress is an EuiProgress bar; read the value attribute, not innerText.
      progress:
        (await row
          .locator('[data-test-subj="mlAnalyticsTableColumnProgress"]')
          .locator('[data-test-subj="mlAnalyticsTableProgress"]')
          .getAttribute('value')) ?? '',
    };
  }

  private async openActionsMenu(jobId: string): Promise<void> {
    await this.waitForTableLoaded();
    const actionsButton = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]');

    // The table can re-render while EUI evaluates collapsed actions. Dispatching the
    // event avoids actionability checks racing that render; the caller waits on its menu item.
    await actionsButton.dispatchEvent('click');
  }

  async openEditFlyout(jobId: string): Promise<void> {
    await this.openActionsMenu(jobId);
    await this.page.testSubj.locator('mlAnalyticsJobEditButton').click();
    await this.page.testSubj.locator('mlAnalyticsEditFlyout').waitFor({ state: 'visible' });
  }

  async openResultsView(jobId: string, analysisType: DataFrameAnalysisConfigType): Promise<void> {
    // Navigate directly rather than clicking the showOnHover table button; the button is
    // CSS-hidden until hover and its cross-app navigation is unreliable in Playwright.
    const rison = `(ml:(analysisType:${analysisType},jobId:${jobId}))`;
    await this.page.goto(this.kbnUrl.app(`ml/data_frame_analytics/exploration?_g=${rison}`));
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsExploration')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openMapView(jobId: string): Promise<void> {
    // mapAction has isPrimary:true — same showOnHover pattern as the view button.
    const row = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`);
    await row.hover();
    await row.locator('[data-test-subj="mlAnalyticsJobMapButton"]').click();
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsMap')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── Configuration step: dependent variable & training percent ─────────────

  async selectDependentVariable(variable: string): Promise<void> {
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      .waitFor({ state: 'visible' });
    // This is an OptionsListPopover (EuiSelectable), not a standard ComboBox:
    // click comboBoxInput to open, type in optionsListFilterInput to filter, click to commit.
    await this.page.testSubj
      .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
      .locator('[data-test-subj="comboBoxInput"]')
      .click();
    const filterInput = this.page.testSubj.locator('optionsListFilterInput');
    await filterInput.waitFor({ state: 'visible' });
    await filterInput.fill(variable);
    const option = this.page.testSubj.locator(`optionsListControlSelection-${variable}`);
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async setTrainingPercent(percent: number): Promise<void> {
    const slider = this.page.testSubj.locator('mlAnalyticsCreateJobWizardTrainingPercentSlider');
    await slider.waitFor({ state: 'visible' });

    // FTR parity (mlCommonUI.setSliderValue): nudge until the controlled value matches.
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const currentValue = Number(await slider.getAttribute('value'));
      if (currentValue === percent) {
        return;
      }

      const diff = currentValue - percent;
      const key =
        diff > 0
          ? Math.abs(diff) >= 10
            ? 'PageDown'
            : 'ArrowLeft'
          : Math.abs(diff) >= 10
          ? 'PageUp'
          : 'ArrowRight';

      await slider.press(key);
      await expect
        .poll(async () => Number(await slider.getAttribute('value')), { timeout: 5_000 })
        .not.toBe(currentValue);
    }

    throw new Error(
      `setTrainingPercent: timed out waiting for ${percent} (got ${await slider.getAttribute(
        'value'
      )})`
    );
  }

  // ── Map view: job badge & details flyout (regression) ─────────────────────

  async openMapJobBadge(jobId: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsIdSelectionBadge-${jobId}`).click();
    await this.page.testSubj
      .locator(`mlAnalyticsJobDetailsFlyoutButton-${jobId}`)
      .waitFor({ state: 'visible' });
  }

  async openMapJobDetailsFlyout(jobId: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsJobDetailsFlyoutButton-${jobId}`).click();
    await this.page.testSubj.locator('analyticsDetailsFlyout').waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator(`analyticsDetailsFlyout-${jobId}`)
      .waitFor({ state: 'visible' });
  }

  // ── Field-stats flyout ────────────────────────────────────────────────────

  /** Opens the field-stats flyout from the dependent-variable combo box. */
  async openFieldStatsFlyoutFromDependentVariableInput(fieldName: string): Promise<void> {
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      .waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
      .locator('[data-test-subj="comboBoxInput"]')
      .click();
    const inspectBtn = this.page.testSubj.locator(`mlInspectFieldStatsButton-${fieldName}`);
    await inspectBtn.waitFor({ state: 'visible' });
    await inspectBtn.click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'visible' });
    // Close the dropdown left open by the inspect-button click; Escape dismisses EUI
    // ComboBox without closing the push flyout (which ignores Escape by design).
    await this.page.keyboard.press('Escape');
  }

  /** Opens the field-stats flyout from the include-fields table. */
  async openFieldStatsFlyoutFromIncludeFields(fieldName: string): Promise<void> {
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardIncludesSelect')
      .scrollIntoViewIfNeeded();
    await this.page.testSubj
      .locator(
        `~mlAnalyticsCreateJobWizardIncludesSelect > ~mlInspectFieldStatsButton-${fieldName}`
      )
      .click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'visible' });
  }

  /** Closes the field-stats flyout and waits for it to hide. */
  async closeFieldStatsFlyout(): Promise<void> {
    await this.page.testSubj.locator('mlFieldStatsFlyoutCloseButton').click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'hidden' });
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

  // ── Clone flow ────────────────────────────────────────────────────────────

  /** Opens the actions menu for the given job, clicks Clone, and waits for the creation wizard. */
  async cloneJob(jobId: string): Promise<void> {
    await this.openActionsMenu(jobId);
    const explainResponse = this.waitForExplainResponse();
    await this.page.testSubj.locator('mlAnalyticsJobCloneButton').click();
    await this.page.testSubj.locator('mlAnalyticsCreationContainer').waitFor({ state: 'visible' });
    await explainResponse;
  }

  // ── Results view ──────────────────────────────────────────────────────────

  /**
   * Hovers the first feature-importance cell and clicks its action button to open
   * the popover.
   *
   * Two headless Playwright / EUI DataGrid quirks require special handling:
   * 1. EUI DataGrid's VariableSizeGrid renders no cells when its container reports
   *    zero width. Scrolling the grid into view fixes this — but only when the scroll
   *    actually moves the page. After pagination the page may still be showing the
   *    grid, making scrollIntoViewIfNeeded a no-op. Scrolling to the page bottom first
   *    guarantees the grid leaves the viewport regardless of evaluate-panel height,
   *    so the return scroll always triggers EUI's ResizeObserver.
   * 2. data-gridcell-row-index is the absolute ES row offset, not a page-local index.
   *    Page 3 (pageIndex=2, pageSize=25) starts at row 50, so hard-coding row 0 would
   *    never match after pagination. waitForFunction reads row and column ids from the
   *    first rendered FI cell for a unique data-* selector without .first()/.nth().
   */
  async openFeatureImportancePopover(): Promise<void> {
    const dataGrid = this.page.testSubj.locator('mlExplorationDataGrid loaded');

    // Scroll to the page bottom so the grid leaves the viewport, then bring it back.
    // scrollTo(bottom) works for any evaluate-panel height; scrollTo(0) can leave the
    // grid on-screen when the panel is short, making scrollIntoViewIfNeeded a no-op.
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await dataGrid.scrollIntoViewIfNeeded();

    // Wait for any FI cell and capture exact row + column ids so the locator is unique
    // even when multiple feature_importance columns exist on the same row.
    const cellInfoHandle = await this.page.waitForFunction(
      () => {
        const el = document.querySelector(
          '[data-test-subj="mlExplorationDataGrid loaded"] ' +
            '[data-gridcell-column-id*="feature_importance"][data-test-subj="dataGridRowCell"]'
        );
        if (!el) {
          return null;
        }
        const rowIndex = el.getAttribute('data-gridcell-row-index');
        const columnId = el.getAttribute('data-gridcell-column-id');
        if (rowIndex == null || columnId == null) {
          return null;
        }
        return { rowIndex, columnId };
      },
      undefined,
      { timeout: 30_000 }
    );
    const { rowIndex, columnId } = (await cellInfoHandle.jsonValue()) as {
      rowIndex: string;
      columnId: string;
    };

    const featureImportanceCell = dataGrid.locator(
      `[data-gridcell-row-index="${rowIndex}"][data-gridcell-column-id="${columnId}"][data-test-subj="dataGridRowCell"]`
    );
    await featureImportanceCell.waitFor({ state: 'visible' });
    await featureImportanceCell.scrollIntoViewIfNeeded();
    await featureImportanceCell.hover();
    const button = featureImportanceCell.locator('button');
    await button.waitFor({ state: 'visible' });
    await button.click();
    await this.page.testSubj.locator('mlDFAFeatureImportancePopover').waitFor({ state: 'visible' });
  }

  /** Expands the Feature Importance Summary section if collapsed. */
  async expandFeatureImportanceSection(): Promise<void> {
    await this.page.testSubj
      .locator('mlDFExpandableSection-FeatureImportanceSummary')
      .scrollIntoViewIfNeeded();
    const content = this.page.testSubj.locator(
      'mlDFExpandableSection-FeatureImportanceSummary-content'
    );
    if (!(await content.isVisible())) {
      await this.page.testSubj
        .locator('mlDFExpandableSection-FeatureImportanceSummary-toggle-button')
        .click();
    }
    await content.waitFor({ state: 'visible' });
  }

  /**
   * Clicks the pagination button for page {@link pageNum} (1-based) on the
   * exploration data grid and waits for the new page's rows to render.
   *
   * `mlExplorationDataGrid loaded` stays on the wrapper during refetch, so waiting
   * for that locator alone is a no-op. Wait for the active page indicator and for
   * cells whose absolute row index matches the new page (default pageSize is 25).
   */
  async selectResultsTablePage(pageNum: number): Promise<void> {
    // EUI pagination uses 0-based index in data-test-subj (pageNum is 1-based).
    const grid = this.page.testSubj.locator('mlExplorationDataGrid loaded');
    const pageButtonIndex = pageNum - 1;
    await grid.locator(`[data-test-subj="pagination-button-${pageButtonIndex}"]`).click();
    await grid
      .locator(`[data-test-subj="pagination-button-${pageButtonIndex}"][aria-current="page"]`)
      .waitFor({ state: 'visible' });

    // Default exploration pageSize is 25 (see use_exploration_url_state).
    const minRowIndex = String(pageButtonIndex * 25);
    await this.page.waitForFunction(
      (minIdx) => {
        const cell = document.querySelector(
          '[data-test-subj="mlExplorationDataGrid loaded"] [data-test-subj="dataGridRowCell"]'
        );
        const row = cell?.getAttribute('data-gridcell-row-index');
        return row != null && Number(row) >= Number(minIdx);
      },
      minRowIndex,
      { timeout: 30_000 }
    );
  }

  /**
   * Toggles histogram chart preview and waits for a known chart to render when enabling it.
   * Reads aria-pressed to avoid a redundant click.
   */
  async toggleHistogramCharts(enable: boolean, readyChartId: string): Promise<void> {
    const button = this.page.testSubj.locator('mlExplorationDataGridHistogramButton');
    const isPressed = (await button.getAttribute('aria-pressed')) === 'true';
    if (isPressed !== enable) {
      await button.click();
    }
    if (enable) {
      await this.page.testSubj
        .locator(`mlDataGridChart-${readyChartId}`)
        .waitFor({ state: 'visible' });
    }
  }

  /** Returns histogram chart state (visibility, id, legend) for the given column. */
  async getHistogramChartState(columnId: string): Promise<{
    chartContainerVisible: boolean;
    histogramVisible: boolean;
    idText: string;
    legendText: string;
  }> {
    const container = this.page.testSubj.locator(`mlDataGridChart-${columnId}`);
    const chartContainerVisible = await container.isVisible();

    if (!chartContainerVisible) {
      return { chartContainerVisible: false, histogramVisible: false, idText: '', legendText: '' };
    }

    const histogramVisible = await this.page.testSubj
      .locator(`mlDataGridChart-${columnId}-histogram`)
      .isVisible();
    const idText = (
      await this.page.testSubj.locator(`mlDataGridChart-${columnId}-id`).innerText()
    ).trim();

    let legendText = '';
    const legendLocator = this.page.testSubj.locator(`mlDataGridChart-${columnId}-legend`);
    if (await legendLocator.isVisible()) {
      legendText = (await legendLocator.innerText()).trim();
    }

    return { chartContainerVisible, histogramVisible, idText, legendText };
  }

  /** Adds a sort key for the given column via the DataGrid sort popover. */
  async setSortColumn(columnId: string, direction: 'asc' | 'desc'): Promise<void> {
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSortingButton"]')
      .click();
    await this.page.testSubj
      .locator('dataGridColumnSortingSelectionButton')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('dataGridColumnSortingSelectionButton').click();
    await this.page.testSubj
      .locator(`dataGridColumnSortingPopoverColumnSelection-${columnId}`)
      .click();
    await this.page.testSubj
      .locator(`euiDataGridColumnSorting-sortColumn-${columnId}-${direction}`)
      .click();
    await this.page.keyboard.press('Escape');
  }

  /** Shows all columns via the DataGrid column selector. */
  async showAllColumns(): Promise<void> {
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSelectorButton"]')
      .click();
    await this.page.testSubj.locator('dataGridColumnSelectorShowAllButton').click();
    await this.page.keyboard.press('Escape');
  }

  /** Hides all columns via the DataGrid column selector. */
  async hideAllColumns(): Promise<void> {
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSelectorButton"]')
      .click();
    await this.page.testSubj.locator('dataGridColumnSelectorHideAllButton').click();
    await this.page.keyboard.press('Escape');
  }

  /**
   * Clicks the "Explore in custom visualization" link and waits for the browser to
   * navigate to the Visualize app URL. The navigation is triggered by an async
   * onClick handler, so waitForURL is required — Playwright's click() returns as
   * soon as the event fires, not after the async navigateToApp call completes.
   */
  async clickExploreInCustomVisualization(): Promise<void> {
    await this.page.testSubj.locator('mlSplomExploreInCustomVisualizationLink').click();
    await this.page.waitForURL(/visualize/, { timeout: 30_000 });
  }

  // ── Custom URLs tab ───────────────────────────────────────────────────────

  async openCustomUrlsTab(): Promise<void> {
    await this.page.testSubj.locator('mlEditAnalyticsJobFlyout-customUrls').click();
    await this.page.testSubj.locator('mlJobOpenCustomUrlFormButton').waitFor({ state: 'visible' });
  }

  private async openCustomUrlEditor(): Promise<void> {
    await this.page.testSubj.locator('mlJobOpenCustomUrlFormButton').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'visible' });
  }

  private async selectRadioOption(groupTestSubj: string, value: string): Promise<void> {
    await this.page.testSubj.locator(groupTestSubj).locator(`label[for="${value}"]`).click();
  }

  async addDiscoverCustomUrl(config: {
    label: string;
    indexName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DISCOVER');
    await this.page.testSubj
      .locator('mlJobCustomUrlDiscoverIndexPatternInput')
      .selectOption({ label: config.indexName });
    if (config.queryEntityFieldNames.length > 0) {
      await this.page.components
        .comboBox('mlJobCustomUrlQueryEntitiesInput')
        .setSelectedOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }

  async addDashboardCustomUrl(config: {
    label: string;
    dashboardName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DASHBOARD');
    // Dashboard selector is a native <select> (EuiSelect), not a ComboBox.
    await this.page.testSubj
      .locator('mlJobCustomUrlDashboardNameInput')
      .selectOption({ label: config.dashboardName });
    if (config.queryEntityFieldNames.length > 0) {
      await this.page.components
        .comboBox('mlJobCustomUrlQueryEntitiesInput')
        .setSelectedOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }

  async addOtherTypeCustomUrl(config: { label: string; url: string }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'OTHER');
    await this.page.testSubj.locator('mlJobCustomUrlOtherTypeUrlInput').fill(config.url);
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }
}
