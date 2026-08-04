/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { expect } from '@kbn/scout/ui';
import type { LensAppConstructor } from './mixin_types';

/**
 * Everything else Lens's own Scout specs drive directly: workspace navigation, the
 * discard/apply-changes chrome, message list, settings menu, tag cloud, ES|QL conversion
 * modal, and inline-editor flyout getters.
 */
export function withLensWorkspace<TBase extends LensAppConstructor>(Base: TBase) {
  return class extends Base {
    public readonly chartTitle = this.page.testSubj.locator('lns_ChartTitle');
    /** XY legend items (elastic-charts does not expose a `data-test-subj` for these). */
    public readonly xyLegendItems = this.page.locator('.echLegendItem');

    public get goBackToAppButton() {
      return this.page.testSubj.locator('lnsApp_goBackToAppButton');
    }

    public get discardChangesModal() {
      return this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
    }

    public get confirmModalConfirmButton() {
      return this.page.testSubj.locator('confirmModalConfirmButton');
    }

    public get messageListTrigger() {
      return this.page.testSubj.locator('lens-message-list-trigger');
    }

    public get settingsButton() {
      return this.page.testSubj.locator('lnsApp_settingsButton');
    }

    public get settingsMenu() {
      return this.page.testSubj.locator('lnsApp__settingsMenu');
    }

    public get autoApplyToggle() {
      return this.page.testSubj.locator('lnsToggleAutoApply');
    }

    public get emptyWorkspacePrompt() {
      return this.page.testSubj.locator('workspace-drag-drop-prompt');
    }

    public get workspaceApplyChangesPrompt() {
      return this.page.testSubj.locator('workspace-apply-changes-prompt');
    }

    public get suggestionPanelToggle() {
      return this.page.testSubj.locator('lensSuggestionsPanelToggleButton');
    }

    async openFullEditor() {
      await this.page.gotoApp('lens');
      await this.waitForLensApp();
    }

    /**
     * Navigates directly to the Lens editor for a saved visualization and waits for its
     * chart to render. Prefer this over going through the visualize listing page when the
     * saved-object id is known (e.g. fixture-loaded or freshly-saved visualizations).
     *
     * @param id - saved-object id of the Lens visualization
     * @param chartTestSubj - `data-test-subj` of the rendered chart container
     *   (e.g. `xyVisChart`, `partitionVisChart`, `mtrVis`, `legacyMtrVis`,
     *   `lnsVisualizationContainer` for datatable).
     */
    async openEditor(id: string, chartTestSubj: string) {
      await this.page.gotoApp('lens', { hash: `/edit/${id}` });
      await this.waitForVisualization(chartTestSubj);
    }

    /**
     * Adds a new KQL filter row to a filters-aggregation dimension editor.
     *
     * The query input debounces its `onChange` (~256ms; see `useDebouncedValue`
     * in `@kbn/visualization-utils`), so the typed query only reaches the parent
     * `filter.input` after the debounce fires. If we close the popover before
     * then, `FilterPopover.closePopover` resets the input back to the default
     * (`localFilter.input = filter.input`) and the filter reverts to
     * "All records". We wait for the label input's placeholder — which mirrors
     * `localFilter.input.query` — to match the typed query as the visible DOM
     * signal that the debounce has flushed.
     */
    async addFilterToAgg(kql: string) {
      await this.page.testSubj.click('lns-newBucket-add');
      const queryInput = this.page.testSubj.locator('indexPattern-filters-queryStringInput');
      await queryInput.waitFor({ state: 'visible' });
      await queryInput.pressSequentially(kql);
      await this.page.waitForFunction((expected) => {
        const el = document.querySelector('[data-test-subj="indexPattern-filters-label"]');
        return el instanceof HTMLInputElement && el.placeholder === expected;
      }, kql);
      // Close the popover by clicking its trigger button (identified by the typed query text).
      // This toggles `activeFilterId` without invoking `closePopover()` (which resets
      // localFilter.input to the prop value and can race with React's prop propagation).
      await this.page.testSubj
        .locator('indexPattern-filters-existingFilterTrigger')
        .filter({ hasText: kql })
        .click();
    }

    /** Returns the visible label of every existing filter row in a filters-aggregation editor. */
    async getFiltersAggLabels(): Promise<string[]> {
      const filters = await this.page.testSubj
        .locator('indexPattern-filters-existingFilterContainer')
        .all();
      return Promise.all(filters.map(async (filter) => (await filter.innerText()).trim()));
    }

    async enableFilter() {
      await this.page.testSubj.click('indexPattern-advanced-accordion');
      await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
    }

    async setFilterBy(queryString: string) {
      await this.page.testSubj
        .locator('indexPattern-filters-queryStringInput')
        .pressSequentially(queryString, { delay: 20 });
      await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
    }

    /** Reads the current title displayed in the Lens editor header. */
    async getChartTitle(): Promise<string> {
      return (await this.chartTitle.innerText()).trim();
    }

    async goBackToPreviousApp() {
      await this.goBackToAppButton.click();
    }

    getDiscardChangesModal() {
      return this.discardChangesModal;
    }

    async confirmDiscardChangesModal() {
      await this.discardChangesModal.waitFor({ state: 'visible' });
      await this.confirmModalConfirmButton.click();
      await this.discardChangesModal.waitFor({ state: 'hidden' });
    }

    /** Locator for the "Apply changes" button rendered in the given area. */
    getApplyChangesButton(target: 'toolbar' | 'suggestions' | 'workspace') {
      return this.page.testSubj.locator(`lnsApplyChanges__${target}`);
    }

    /** Clicks the "Apply changes" button in the given area and waits for it to disappear. */
    async applyChanges(target: 'toolbar' | 'suggestions' | 'workspace') {
      const button = this.getApplyChangesButton(target);
      await button.click();
      await button.waitFor({ state: 'hidden' });
    }

    /** Removes all dimensions from the given panel, polling until none remain. */
    async removeAllDimensions(dimensionTestSubj: string) {
      const removeLocator = this.page.testSubj.locator(
        `${dimensionTestSubj} > indexPattern-dimension-remove`
      );
      await expect
        .poll(
          async () => {
            const buttons = await removeLocator.all();
            if (buttons.length > 0) {
              await buttons[0].hover();
              await buttons[0].click();
            }
            return removeLocator.count();
          },
          // Sequential remove+re-render per dimension can exceed the 10s expect timeout.
          { timeout: 30_000 }
        )
        .toBe(0);
    }

    /**
     * Reads the current Elastic Charts / embeddable render count for a workspace chart, or
     * `null` when the chart isn't an Elastic Charts visualization (e.g. a data table).
     * Pair with `waitForVisualization(subj, { afterCount })` when the next action must wait
     * for a *new* render pass rather than settling on the current one.
     */
    async getVisualizationRenderCount(chartSubj: string): Promise<number | null> {
      return this.page.evaluate((subj) => {
        const workspaceEl = document.querySelector('[data-test-subj="lnsWorkspace"]');
        const el = workspaceEl?.querySelector(`[data-test-subj="${subj}"]`);
        if (!el) {
          return null;
        }
        const chartStatus = el.querySelector('.echChartStatus');
        const raw =
          el.getAttribute('data-rendering-count') ??
          (chartStatus?.getAttribute('data-ech-render-complete') === 'true'
            ? chartStatus.getAttribute('data-ech-render-count')
            : null);
        if (raw === null) {
          return null;
        }
        const count = Number(raw);
        return Number.isFinite(count) ? count : null;
      }, chartSubj);
    }

    /**
     * Reads `@elastic/charts` debug state after the visualization finishes rendering.
     * Requires `enableElasticChartDebug` (or equivalent init script) before navigation.
     */
    async getCurrentChartDebugState(visType: string): Promise<DebugState> {
      await this.waitForVisualization(visType);
      const chart = this.page.testSubj.locator('lnsWorkspace').getByTestId(visType);
      // Elastic Charts status node — no Lens data-test-subj; same signal as FTR / open-in-Lens helpers.
      await chart.locator('.echChartStatus[data-ech-render-complete="true"]').waitFor({
        state: 'attached',
      });
      const debugJson = await chart.locator('.echChartStatus').getAttribute('data-ech-debug-state');
      if (!debugJson) {
        throw new Error(
          'Elastic charts debugState not found — enable chart debug before navigation'
        );
      }
      return JSON.parse(debugJson) as DebugState;
    }

    async openMessageList() {
      await this.messageListTrigger.click();
    }

    async closeMessageList() {
      await this.messageListTrigger.click();
    }

    getMessageListItems(severity: 'warning' | 'error') {
      return this.page.testSubj.locator(`lens-message-list-${severity}`);
    }

    /**
     * Locator for a Lens datatable-adjacent count of workspace errors shown in the message list
     * pagination. Excludes the prev/next controls, which also share the `pagination-button-`
     * prefix as `pagination-button-previous` / `pagination-button-next`.
     */
    async getWorkspaceErrorCount(): Promise<number> {
      const errors = this.page.testSubj.locator('lnsWorkspaceErrors');
      if ((await errors.count()) === 0) {
        return 0;
      }
      const pagination = this.page.testSubj.locator('lnsWorkspaceErrorsPaginationControl');
      if ((await pagination.count()) === 0) {
        return 1;
      }
      // EUI pagination buttons use data-test-subj pagination-button-{n}; exclude
      // pagination-button-previous/-next, which match the same prefix.
      return pagination
        .locator(
          '[data-test-subj^="pagination-button-"]:not([data-test-subj$="-previous"]):not([data-test-subj$="-next"])'
        )
        .count();
    }

    /** Opens the Lens settings menu (auto-apply toggle lives here). */
    async openSettingsMenu() {
      await this.settingsButton.click();
      await this.settingsMenu.waitFor({ state: 'visible' });
    }

    /** Closes the Lens settings menu. */
    async closeSettingsMenu() {
      await this.settingsButton.click();
      await this.settingsMenu.waitFor({ state: 'hidden' });
    }

    /** Locator for the auto-apply toggle. Requires the settings menu to be open. */
    getAutoApplyToggle() {
      return this.autoApplyToggle;
    }

    /** Toggles the auto-apply setting. Requires the settings menu to be open. */
    async toggleAutoApply() {
      await this.autoApplyToggle.click();
    }

    /** Waits for the empty Lens workspace drop prompt to be visible. */
    async waitForEmptyWorkspace() {
      await this.emptyWorkspacePrompt.waitFor({ state: 'visible' });
    }

    /** Waits for the workspace "apply changes" prompt (shown when auto-apply is disabled). */
    async waitForWorkspaceWithApplyChangesPrompt() {
      await this.workspaceApplyChangesPrompt.waitFor({ state: 'visible' });
    }

    /**
     * Collapses the suggestions panel.
     * Caller must have suggestions mounted with the panel expanded.
     */
    async closeSuggestionPanel() {
      await this.suggestionPanelToggle.waitFor({ state: 'visible' });
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      await this.page.waitForFunction(
        () =>
          document
            .querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]')
            ?.getAttribute('aria-expanded') === 'true',
        undefined,
        { timeout: 10_000 }
      );
      await this.suggestionPanelToggle.click();
      await this.page.waitForFunction(
        () => {
          const el = document.querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]');
          return el == null || el.getAttribute('aria-expanded') !== 'true';
        },
        undefined,
        { timeout: 10_000 }
      );
    }

    /** Returns visible tag labels from the Lens tag cloud workspace. */
    async getTagCloudTexts(): Promise<string[]> {
      // SVG <text> nodes — use css= so Playwright does not treat "text" as a text-engine query.
      const tags = this.page.testSubj.locator('tagCloudVisualization').locator('css=text');
      return tags.evaluateAll((elements) =>
        elements.map((el) => (el.textContent ?? '').trim()).filter((text) => text.length > 0)
      );
    }

    /** Clicks a tag cloud label matching `tagDisplayText`. */
    async selectTagCloudTag(tagDisplayText: string): Promise<void> {
      const escaped = tagDisplayText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tag = this.page.testSubj
        .locator('tagCloudVisualization')
        .locator('css=text')
        .filter({ hasText: new RegExp(`^${escaped}$`) });
      await tag.waitFor({ state: 'visible' });
      // SVG <text> hit boxes from Elastic Charts are often too thin for Playwright's
      // actionability hit-test; dispatch a DOM click instead of { force: true }.
      await tag.dispatchEvent('click');
    }

    async setInputValue(testSubj: string, value: string) {
      const input = this.page.locator(`input[data-test-subj="${testSubj}"]`);
      await input.waitFor({ state: 'visible' });
      await input.scrollIntoViewIfNeeded();
      // fill() clears first (avoids "07747" from incomplete selection on number inputs).
      await input.fill(value);
      // Controlled EuiFieldNumber often ignores DOM-only fills — also invoke React onChange
      // with an explicit value (React hijacks input.value so the event must carry it).
      await input.evaluate((el, nextValue) => {
        const inputEl = el as HTMLInputElement & Record<string, unknown>;
        const propsKey = Object.keys(inputEl).find((key) => key.startsWith('__reactProps$'));
        if (!propsKey) {
          return;
        }
        const props = inputEl[propsKey] as {
          onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
        };
        props.onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
      }, value);
      // Sync until React controlled value matches (readiness wait — assertions stay in specs).
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      await this.page.waitForFunction(
        ({ subj, expected }) => {
          const el = document.querySelector(
            `input[data-test-subj="${subj}"]`
          ) as HTMLInputElement | null;
          return el?.value === expected;
        },
        { subj: testSubj, expected: value },
        { timeout: 10_000 }
      );
      await input.press('Tab');
      // Blur completed — callers must poll a UI side effect (chart debug, dimension label)
      // before closing flyouts; useDebouncedValue (~256ms) has no DOM readiness hook here.
      await this.page.waitForFunction(
        (subj) => {
          const el = document.querySelector(`input[data-test-subj="${subj}"]`);
          return el != null && document.activeElement !== el;
        },
        testSubj,
        { timeout: 10_000 }
      );
    }

    async toggleFullscreen() {
      await this.page.testSubj.click('lnsFormula-fullscreen');
    }

    /** Returns the current formula Monaco model value (last registered model). */
    async getFormulaText(): Promise<string> {
      const modelIndex = await this.getFormulaModelIndex();
      return this.codeEditor.getCodeEditorValue(modelIndex);
    }

    getConvertToEsqlButton() {
      return this.page.getByRole('button', { name: 'Convert to ES|QL' });
    }

    getConvertToEsqModal() {
      return this.page.getByTestId('lnsConvertToEsqlModal');
    }

    getConvertToEsqModalConfirmButton() {
      return this.page.getByTestId('confirmModalConfirmButton');
    }

    getSecondaryFlyoutBackButton() {
      return this.page.getByTestId('lns-indexPattern-dimensionContainerClose');
    }

    getInlineEditor() {
      return this.page.getByTestId('customizeLens');
    }

    getEditInLensButton() {
      return this.page.getByTestId('navigateToLensEditorLink');
    }
  };
}
