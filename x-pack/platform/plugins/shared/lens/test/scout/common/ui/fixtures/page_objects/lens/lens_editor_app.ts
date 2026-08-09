/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { LensApp } from '@kbn/scout';
import { normalizeComputedColor, parseInlineStyle } from './lens_editor_helpers';

/** `useDebouncedValue` waits 256ms before committing; add margin for a busy main thread. */
const FORMAT_PARAM_DEBOUNCE_FLUSH_MS = 500;

/**
 * Default timeout for `page.waitForFunction` readiness waits.
 */
const WAIT_FOR_FUNCTION_TIMEOUT_MS = 10_000;

export class LensEditorApp extends LensApp {
  // ---------------------------------------------------------------------------
  // Layers — tabs, per-layer data-view switch, add/remove
  // ---------------------------------------------------------------------------

  // Tab `data-test-subj` values use layer ids (not numeric indices); this only ever
  // resolves to elements when there are 2+ layers (EUI hides the tab strip for one).
  private readonly layerTabsLocator = this.page.testSubj.locator('^unifiedTabs_tab_');

  /**
   * Switches the data view of a Lens layer via the layer's data view picker.
   *
   * @param dataViewTitle - title of the target data view (must already exist in the space).
   * @param layerIndex - layer to switch; defaults to the first layer.
   */
  async switchLayerIndexPattern(dataViewTitle: string, layerIndex = 0) {
    const trigger = this.getLayerIndexPatternTrigger(layerIndex);
    await trigger.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', dataViewTitle);
    await switcher.locator(`[data-test-subj="dataView-${dataViewTitle}"]`).click();
    await switcher.waitFor({ state: 'hidden' });
  }

  /** Returns the title of the currently selected data view for the given layer. */
  async getSelectedLayerIndexPattern(layerIndex = 0): Promise<string> {
    const trigger = this.getLayerIndexPatternTrigger(layerIndex);
    await trigger.waitFor({ state: 'visible' });
    return (await trigger.innerText()).trim();
  }

  private getLayerIndexPatternTrigger(layerIndex: number) {
    return layerIndex === 0
      ? this.page.testSubj.locator('lns_layerIndexPatternLabel')
      : this.page.testSubj.locator(`lns-layerPanel-${layerIndex} > lns_layerIndexPatternLabel`);
  }

  /**
   * Activates the layer tab at `index`. Requires the tabs row to be visible (multi-layer charts).
   * Tab `data-test-subj` values use layer ids (not numeric indices), so tabs are resolved by order.
   */
  async activateLayerTab(index: number) {
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      (minExclusive) =>
        document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length > minExclusive,
      index,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );

    const tabs = await this.layerTabsLocator.all();
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`Layer tab not found at index ${index}`);
    }

    await tab.click();
    await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
  }

  /**
   * Ensures the layer tab at `index` is active, tolerating the single-layer case where the
   * tabs row isn't rendered at all (the lone layer's panel is already showing). Unlike
   * `activateLayerTab`, this is a no-op when there's no tab bar to select from, and when
   * the tab is already selected.
   */
  async ensureLayerTabIsActive(index = 0) {
    const tabs = await this.layerTabsLocator.all();
    if (tabs.length === 0) {
      return;
    }
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`Layer tab not found at index ${index}`);
    }
    if ((await tab.getAttribute('aria-selected')) === 'true') {
      return;
    }
    await tab.click();
    await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
  }

  /**
   * Opens the layer-actions popover for the layer at `index` and clicks the given action
   * (e.g. `lnsXY_annotationLayer_saveToLibrary`).
   */
  async performLayerAction(testSubject: string, layerIndex = 0) {
    await this.hoverLayerTab(layerIndex);
    // The layer actions mount after the hover, so wait for the popover trigger to render
    // instead of clicking straight away.
    const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${layerIndex}`);
    await splitButton.waitFor({ state: 'visible' });
    await splitButton.click();
    await this.page.testSubj.click(testSubject);
  }

  /**
   * Hovers the layer tab at `index` when the tabs row is rendered (hidden for a single layer).
   * Throws if tabs exist but `index` is out of range — a wrong index must not silently no-op.
   */
  private async hoverLayerTab(index: number) {
    const tabs = await this.layerTabsLocator.all();
    if (tabs.length === 0) {
      return;
    }
    const tab = tabs[index];
    if (!tab) {
      throw new Error(`Layer tab not found at index ${index}`);
    }
    await tab.hover();
  }

  /** Returns the number of layers in the Lens editor (unified-tabs row is hidden for a single layer). */
  async getLayerCount(): Promise<number> {
    const tabs = await this.layerTabsLocator.count();
    return tabs === 0 ? 1 : tabs;
  }

  /**
   * Adds a visualization layer of the given type (opens the layer-type menu).
   * Caller must use a chart that shows `lnsLayerAddButton-{layerType}` after Add.
   *
   * Annotation layers open a second menu to pick between a new annotation group and one
   * saved in the annotation library; pass `annotationFromLibraryTitle` for the latter.
   */
  async createLayer(
    layerType: 'data' | 'referenceLine' | 'annotations',
    annotationFromLibraryTitle?: string
  ) {
    const tabsBefore = await this.getLayerCount();
    await this.page.testSubj.click('lnsLayerAddButton');
    await this.page.testSubj.click(`lnsLayerAddButton-${layerType}`);
    if (layerType === 'annotations') {
      if (annotationFromLibraryTitle) {
        await this.page.testSubj.click('lnsAnnotationLayer_addFromLibrary');
        await this.page.testSubj.click(
          `savedObjectTitle${annotationFromLibraryTitle.split(' ').join('-')}`
        );
      } else {
        await this.page.testSubj.click('lnsAnnotationLayer_new');
      }
    }
    await this.page.waitForFunction(
      (before) => {
        const tabs = document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length;
        const count = tabs === 0 ? 1 : tabs;
        return count > before;
      },
      tabsBefore,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
  }

  /**
   * Removes the layer at `index` (FTR `removeLayer`). With a single layer this clears the viz
   * instead of dropping a tab. Returns once the removal is reflected in the config panel, so
   * callers can read the layer count / build a new chart right after.
   *
   * Lens shows `lnsLayerRemoveModal` for clear/delete unless the user previously checked
   * "Don't ask me again". Default `confirm: true` matches a fresh browser context; pass
   * `confirm: false` only when that skip preference is already set.
   */
  async removeLayer(index = 0, options: { confirm?: boolean } = { confirm: true }) {
    const tabsBefore = await this.layerTabsLocator.count();
    await this.hoverLayerTab(index);

    const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${index}`);
    const removeButton = this.page.testSubj.locator(`lnsLayerRemove--${index}`);
    // Layers with more than one action (e.g. an annotation layer that can also be saved to the
    // library) hide the remove action behind a split-button popover; single-action layers expose
    // it directly. Exactly one of the two renders, so wait for whichever appears rather than
    // racing the layer actions still mounting after the hover.
    await splitButton.or(removeButton).waitFor({ state: 'visible' });
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }
    await removeButton.click();

    if (options.confirm !== false) {
      const removeModal = this.page.testSubj.locator('lnsLayerRemoveModal');
      await removeModal.waitFor({ state: 'visible' });
      await this.page.testSubj.click('lnsLayerRemoveConfirmButton');
      await removeModal.waitFor({ state: 'hidden' });
    }

    if (tabsBefore > 0) {
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      await this.page.waitForFunction(
        (before) =>
          document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length < before,
        tabsBefore,
        { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
      );
    } else {
      // Clearing the only layer keeps its (now empty) panel, so wait for its dimensions to go.
      await this.page.testSubj.waitForSelector(`lns-layerPanel-${index} > lns-dimensionTrigger`, {
        state: 'detached',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Dimensions — triggers, format params, quick-functions / static-value tabs
  // ---------------------------------------------------------------------------

  /** Locator for all dimension-trigger buttons in the Lens config panel. */
  readonly dimensionTriggerLocator = this.page.testSubj.locator('lns-dimensionTrigger');

  /**
   * Locator for dimension-trigger buttons inside a panel/group.
   */
  getDimensionTriggersLocator(dimension: string) {
    return this.page.testSubj.locator(`${dimension} > lns-dimensionTrigger`);
  }

  /** Returns all dimension-trigger button locators currently rendered in the editor. */
  getDimensionTriggers() {
    return this.dimensionTriggerLocator.all();
  }

  /**
   * Returns visible labels for all dimension triggers inside a panel/group.
   * Empty panels return `[]` (do not wait for a trigger to appear).
   * Panel test-subj may match multiple wrappers (filled + empty slot); read triggers only.
   * Prefer locator assertions via `getDimensionTriggersLocator` when waiting for UI updates.
   */
  async getDimensionTriggersTexts(dimension: string): Promise<string[]> {
    const triggers = await this.getDimensionTriggersLocator(dimension).all();
    const texts: string[] = [];
    for (const trigger of triggers) {
      texts.push(await trigger.innerText());
    }
    // Lens inserts zero-width spaces around dots in field names for line-breaking.
    return texts.map((text) => text.replace(/\u200b/g, '').trim());
  }

  /** Returns the visible label of a dimension trigger inside a dimension panel. */
  async getDimensionTriggerText(dimension: string, index = 0): Promise<string> {
    const dimensionTexts = await this.getDimensionTriggersTexts(dimension);
    const text = dimensionTexts[index];
    if (text === undefined) {
      throw new Error(`Dimension trigger not found at index ${index} for "${dimension}"`);
    }
    return text;
  }

  /**
   * Hovers over a dimension-trigger button so that metric tiles are in their
   * default (un-hovered) state before asserting colors.
   */
  async hoverOverDimensionButton(index = 0) {
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      (minExclusive) =>
        document.querySelectorAll('[data-test-subj="lns-dimensionTrigger"]').length > minExclusive,
      index,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );

    const triggers = await this.dimensionTriggerLocator.all();
    const trigger = triggers[index];
    if (!trigger) {
      throw new Error(`Dimension trigger not found at index ${index}`);
    }
    await trigger.hover();
    // Move the pointer off the metric tiles so hover styles do not affect color assertions.
    await this.page.testSubj.locator('lns-layerPanel-0').hover();
  }

  /** Opens a dimension editor flyout from a dimension trigger inside a layer panel. */
  async openDimensionEditor(dimension: string, layerIndex = 0, dimensionIndex = 0) {
    const editorsLocator = this.page.testSubj.locator(
      `lns-layerPanel-${layerIndex} > ${dimension}`
    );
    await this.page.waitForFunction(
      ({ layerPanel, segments, minCount }) => {
        const layer = document.querySelector(`[data-test-subj="${layerPanel}"]`);
        if (!layer) {
          return false;
        }
        let nodes: Element[] = [layer];
        for (const segment of segments) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${segment}"]`)));
          }
          nodes = next;
        }
        return nodes.length > minCount;
      },
      {
        layerPanel: `lns-layerPanel-${layerIndex}`,
        segments: dimension.split('>').map((part) => part.trim()),
        minCount: dimensionIndex,
      },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );

    const editors = await editorsLocator.all();
    const editor = editors[dimensionIndex];
    if (!editor) {
      throw new Error(
        `Dimension editor not found at index ${dimensionIndex} for "${dimension}" in layer ${layerIndex}`
      );
    }
    await editor.click();
    await this.closeDimensionEditorButton.waitFor({ state: 'visible' });
  }

  /** Closes the open dimension editor flyout (same as `closeDimensionEditor`, kept for FTR parity naming). */
  async closeDimensionEditorPanel() {
    await this.closeDimensionEditor();
  }

  /** Clears the dimension field combo box (removes the currently selected field). */
  async clearDimensionField() {
    await this.page.components.comboBox('indexPattern-dimension-field').clear();
  }

  /** Enables empty rows for the current date histogram dimension. */
  async enableIncludeEmptyRows() {
    const includeEmptyRows = this.page.testSubj.locator('indexPattern-include-empty-rows');
    await includeEmptyRows.click();
    await includeEmptyRows
      .and(this.page.locator('[aria-checked="true"]'))
      .waitFor({ state: 'visible' });
  }

  /**
   * Sets terms "Number of values".
   * ValuesInput debounces parent updates (~256ms) and is a controlled EuiFieldNumber —
   * Playwright fill/pressSequentially often update the DOM without committing `params.size`.
   * Mirror `setInputValue`: invoke the component `onChange(number)` via React props/fiber,
   * then wait for the dimension trigger label to include `Top ${value}`.
   */
  async setTermsNumberOfValues(value: number) {
    const input = this.page.locator(
      'input[data-test-subj="indexPattern-terms-values"][type="number"]'
    );
    await input.waitFor({ state: 'visible' });
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.evaluate((el, nextValue) => {
      const inputEl = el as HTMLInputElement & Record<string, unknown>;
      const fiberKey = Object.keys(inputEl).find((key) => key.startsWith('__reactFiber$'));
      if (!fiberKey) {
        throw new Error('React fiber not found on indexPattern-terms-values');
      }
      interface FiberNode {
        memoizedProps?: { value?: unknown; onChange?: (v: number) => void };
        return?: FiberNode | null;
      }
      let fiber: FiberNode | null | undefined = inputEl[fiberKey] as FiberNode;
      while (fiber) {
        const props = fiber.memoizedProps;
        // ValuesInput passes numeric value + onChange(number) — not the string input handler.
        if (props && typeof props.value === 'number' && typeof props.onChange === 'function') {
          props.onChange(Number(nextValue));
          return;
        }
        fiber = fiber.return;
      }
      throw new Error('ValuesInput onChange(number) not found in React fiber tree');
    }, `${value}`);
    // Wait for Lens to commit size into the dimension trigger label (not an assertion).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      (expected) => {
        const triggers = document.querySelectorAll('[data-test-subj="lns-dimensionTrigger"]');
        return Array.from(triggers).some((el) =>
          (el.textContent ?? '').replace(/\u200b/g, '').includes(`Top ${expected}`)
        );
      },
      value,
      { timeout: 15_000 }
    );
  }

  /** Returns whether the open dimension editor has top-level aggregation enabled. */
  async isTopLevelAggregation(): Promise<boolean> {
    const nestingSwitch = this.page.testSubj.locator('indexPattern-nesting-switch');
    await nestingSwitch.waitFor({ state: 'visible' });
    return nestingSwitch.isChecked();
  }

  /** Waits until the static-value dimension input is visible in the open editor. */
  async waitForStaticValueInput() {
    await this.page.testSubj.locator('lns-indexPattern-static_value-input').waitFor({
      state: 'visible',
    });
  }

  async switchToQuickFunctions() {
    await this.page.testSubj.click('lens-dimensionTabs-quickFunctions');
  }

  async switchToStaticValue() {
    await this.page.testSubj.click('lens-dimensionTabs-static_value');
  }

  /**
   * Clicks an incompatible quick-function option without waiting for it to become selected.
   * Used to assert Lens keeps the prior formula on incomplete transitions.
   */
  async clickIncompatibleOperation(operation: string) {
    await this.page.testSubj.click(`lns-indexPatternDimension-${operation} incompatible`);
  }

  /**
   * Sets the format of the currently open dimension, and optionally its decimal places
   * and suffix/prefix text.
   */
  async editDimensionFormat(format: string, options?: { decimals?: number; prefix?: string }) {
    await this.page.components
      .comboBox('indexPattern-dimension-format')
      .setSelectedOptions([format]);

    if (options?.prefix != null) {
      await this.setFormatParam(
        'input[data-test-subj="indexPattern-dimension-formatSuffix"]',
        options.prefix
      );
    }

    if (options?.decimals != null) {
      // EuiRange with `showInput` stamps `data-test-subj` on both the number input and the
      // range slider; target the number input explicitly to avoid a strict-mode violation.
      await this.setFormatParam(
        'input[type="number"][data-test-subj="indexPattern-dimension-formatDecimals"]',
        `${options.decimals}`
      );
    }
  }

  /**
   * Fills one format-params input and gives its debounced commit time to reach the Lens state.
   *
   * These inputs go through `useDebouncedValue`, whose `onChange` spreads the format params the
   * closure captured, so editing a second param before the first commits overwrites it — and
   * unmounting the editor (`closeDimensionEditor`) drops a pending commit altogether, silently
   * reverting the value. The commit has no DOM signal of its own to wait for.
   */
  private async setFormatParam(selector: string, value: string) {
    await this.page.locator(selector).fill(value);
    // Dismisses the range popover the decimals input opens, and takes focus off the input.
    await this.page.keyboard.press('Tab');
    // React owns these inputs and can reject or reformat what was typed, so wait for the value
    // to stick before letting the debounce run (readiness wait — assertions stay in specs).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      ({ sel, expected }) => {
        const el = document.querySelector(sel);
        return el instanceof HTMLInputElement && el.value === expected;
      },
      { sel: selector, expected: value },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(FORMAT_PARAM_DEBOUNCE_FLUSH_MS);
  }

  /** Changes the axis side of the currently open dimension editor. */
  async changeAxisSide(newSide: 'left' | 'right' | 'auto') {
    await this.page.testSubj.click(`lnsXY_axisSide_groups_${newSide}`);
  }

  /** Returns the selected axis side label from an open dimension editor. */
  async getSelectedAxisSide(): Promise<string> {
    const selectedButton = this.page.locator(
      '[data-test-subj^="lnsXY_axisSide_groups_"][aria-pressed="true"]'
    );
    await selectedButton.waitFor({ state: 'visible' });
    const text = (await selectedButton.innerText()).trim();
    if (!text) {
      throw new Error('Axis side button text not yet rendered');
    }
    return text;
  }

  /** Focused field list item — name + test-subj for keyboard-DnD assertions (FTR `assertFocusedField`). */
  async getFocusedField(): Promise<{ name: string; testSubj: string | null }> {
    return this.page.evaluate(() => {
      const input = document.activeElement as HTMLElement | null;
      if (!input) {
        return { name: '', testSubj: null };
      }
      // FTR: activeElement parent holds `data-test-subj="lnsFieldListPanelField"`.
      const parent = input.parentElement;
      let fieldEl: HTMLElement | null = input;
      while (fieldEl && !fieldEl.getAttribute('data-attr-field')) {
        fieldEl = fieldEl.parentElement;
      }
      return {
        name: fieldEl?.getAttribute('data-attr-field') ?? '',
        testSubj: parent?.getAttribute('data-test-subj') ?? null,
      };
    });
  }

  /** Visible text of the focused field list item (for keyboard-DnD assertions). */
  async getFocusedFieldName(): Promise<string> {
    return (await this.getFocusedField()).name;
  }

  /** Visible text of the focused dimension trigger (for keyboard-DnD assertions). */
  async getFocusedDimensionLabel(): Promise<string> {
    return this.page.evaluate(() => {
      const input = document.activeElement;
      if (!input) {
        return '';
      }
      const dimension = input.parentElement?.parentElement;
      return (dimension?.textContent ?? '').replace(/\u200b/g, '').trim();
    });
  }

  // ---------------------------------------------------------------------------
  // Style — style flyout, palette details, gauge/heatmap, reference lines, annotations
  // ---------------------------------------------------------------------------

  /** Style flyout title — Lens uses a DOM id, not a data-test-subj (FTR parity). */
  private readonly dimensionContainerTitle = this.page.locator('#lnsDimensionContainerTitle');
  private readonly styleSettingsButton = this.page.locator('button[data-test-subj="style"]');
  private readonly flyoutBackButton = this.page.testSubj.locator(
    'lns-indexPattern-dimensionContainerBack'
  );
  readonly referenceLineFillBelowButton = this.page.testSubj.locator('lnsXY_fill_below');

  /**
   * Opens the Lens style settings flyout.
   * Caller must close any open dimension/palette flyout first.
   */
  async openStyleSettingsFlyout() {
    await this.styleSettingsButton.click();
    await this.dimensionContainerTitle.waitFor({ state: 'visible' });
  }

  /**
   * Closes the open style/settings flyout via the back control.
   * Caller must have that flyout open (back button visible).
   */
  async closeFlyoutWithBackButton() {
    await this.flyoutBackButton.click();
    await this.flyoutBackButton.waitFor({ state: 'hidden' });
  }

  /** Reads the selected donut hole size from the style settings flyout. */
  async getDonutHoleSize(): Promise<string> {
    await this.openStyleSettingsFlyout();
    const selectedOptions = await this.page.components
      .comboBox('lnsEmptySizeRatioOption')
      .getSelectedOptions();
    return selectedOptions[0] ?? '';
  }

  /** Returns the selected bar orientation from the style settings flyout. */
  async getSelectedBarOrientationSetting(): Promise<string> {
    await this.openStyleSettingsFlyout();

    const selectedButton = this.page.locator(
      '[data-test-subj^="lns_barOrientation_"][aria-pressed="true"]'
    );
    await selectedButton.waitFor({ state: 'visible' });
    return (await selectedButton.innerText()).trim();
  }

  async setGaugeShape(value: string) {
    await this.openStyleSettingsFlyout();
    await this.page.components.comboBox('lnsToolbarGaugeAngleType').setSelectedOptions([value]);
    await this.closeFlyoutWithBackButton();
  }

  async setGaugeOrientation(value: 'horizontal' | 'vertical') {
    await this.openStyleSettingsFlyout();
    await this.page.testSubj.click(`lns_gaugeOrientation_${value}Bullet`);
    await this.closeFlyoutWithBackButton();
  }

  /**
   * Sets the gauge minor-label mode (`none` / `custom` / …).
   * Requires the style-settings flyout to already be open; does not open or close it.
   */
  async setGaugeMinorLabelMode(value: string) {
    await this.page.testSubj.locator('lnsToolbarGaugeLabelMinor-select').selectOption(value);
  }

  /** Sets heatmap/XY axis label orientation from style settings (`horizontal` / `vertical` / `angled`). */
  async setAxisLabelOrientation(orientation: 'horizontal' | 'vertical' | 'angled') {
    await this.page.testSubj.click(`axis_orientation_${orientation}`);
  }

  async setTableDynamicColoring(coloringType: 'none' | 'cell' | 'text' | 'badge' | 'progress') {
    // Cell decoration combo labels diverge from stored values (`cell` → "Background").
    const labelByColoringType: Record<typeof coloringType, string> = {
      none: 'None',
      cell: 'Background',
      text: 'Text',
      badge: 'Badge',
      progress: 'Progress bar',
    };
    await this.page.components
      .comboBox('lnsDatatable_dynamicColoring_groups')
      .setSelectedOptions([labelByColoringType[coloringType]]);
    // Palette editor appears once a non-none decoration assigns palette/colorMapping.
    if (coloringType !== 'none') {
      await this.page.testSubj.locator('lns_dynamicColoring_edit').waitFor({ state: 'visible' });
    }
  }

  /**
   * Selects a named dynamic-coloring palette (e.g. `status`) from the open palette panel.
   * Distinct from the shared `configureDimension`'s palette option, which toggles legacy vs
   * color-mapping pickers.
   */
  async changePaletteTo(paletteName: string) {
    await this.page.testSubj.click('lnsPalettePanel_dynamicColoring_palette_picker');
    await this.page.testSubj.click(`${paletteName}-palette`);
  }

  /** Selects a dynamic-coloring palette range type (`number` or `percent`). */
  async setPaletteRangeType(rangeType: 'number' | 'percent') {
    await this.page.testSubj.click(`lnsPalettePanel_dynamicColoring_rangeType_groups_${rangeType}`);
  }

  /** Reverses the palette colors from the open palette panel. */
  async reversePaletteColors() {
    await this.page.testSubj.click('lnsPalettePanel_dynamicColoring_reverseColors');
  }

  /**
   * Sets a palette color-stop range value (1-based index) in the open palette panel.
   * The resulting recolor is debounced; callers should assert the settled effect
   * (for example the metric's computed color) rather than the input's own value.
   */
  async setPaletteRangeValue(index: number, value: string) {
    const input = this.page.testSubj.locator(
      `lnsPalettePanel_dynamicColoring_range_value_${index}`
    );
    await input.fill(value);
    await this.page.keyboard.press('Tab');
  }

  /** Reads color-stop values and colors from the currently open palette panel. */
  async getPaletteColorStops(expectedStopsCount?: number) {
    const palettePanel = this.page.testSubj.locator('lns-palettePanelFlyout');
    const stopInputsLocator = palettePanel.locator(
      '[data-test-subj^="lnsPalettePanel_dynamicColoring_range_value_"]'
    );
    const colorAnchorsLocator = palettePanel.locator('[data-test-subj="euiColorPickerAnchor"]');

    const readColorStops = async () => {
      const stopInputs = await stopInputsLocator.all();
      const colorAnchors = await colorAnchorsLocator.all();

      const colorStops = [];
      for (let i = 0; i < stopInputs.length; i++) {
        const input = stopInputs[i];
        const colorAnchor = colorAnchors[i];
        colorStops.push({
          stop: await input.getAttribute('value'),
          color:
            colorAnchor != null
              ? normalizeComputedColor(
                  await colorAnchor.evaluate((node) => getComputedStyle(node).backgroundColor)
                )
              : undefined,
        });
      }

      return colorStops;
    };

    await this.page.evaluate(() => {
      delete (window as unknown as { __lensPaletteStopsPrev?: string }).__lensPaletteStopsPrev;
    });
    // Palette stops can take several debounce cycles to stabilize after edits.
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    try {
      await this.page.waitForFunction(
        ({ expectedCount }) => {
          const panel = document.querySelector('[data-test-subj="lns-palettePanelFlyout"]');
          if (!panel) {
            return false;
          }
          const stopInputs = panel.querySelectorAll(
            '[data-test-subj^="lnsPalettePanel_dynamicColoring_range_value_"]'
          );
          if (expectedCount != null && stopInputs.length !== expectedCount) {
            return false;
          }
          if (stopInputs.length === 0) {
            return false;
          }
          const colorAnchors = panel.querySelectorAll('[data-test-subj="euiColorPickerAnchor"]');
          const colorStops = Array.from(stopInputs).map((input, i) => {
            const anchor = colorAnchors[i] as HTMLElement | undefined;
            return {
              stop: (input as HTMLInputElement).getAttribute('value'),
              color: anchor ? getComputedStyle(anchor).backgroundColor : undefined,
            };
          });
          const colorStopsJson = JSON.stringify(colorStops);
          const win = window as unknown as { __lensPaletteStopsPrev?: string };
          if (win.__lensPaletteStopsPrev === colorStopsJson) {
            return true;
          }
          win.__lensPaletteStopsPrev = colorStopsJson;
          return false;
        },
        { expectedCount: expectedStopsCount ?? null },
        { polling: 500, timeout: 20_000 }
      );
    } finally {
      // Clear even on timeout so a leftover prev===next can't false-settle the next call.
      await this.page.evaluate(() => {
        delete (window as unknown as { __lensPaletteStopsPrev?: string }).__lensPaletteStopsPrev;
      });
    }

    return readColorStops();
  }

  /**
   * Sets a hex value in the currently open EUI color picker (dimension editor color mode),
   * replacing any existing value. The recolor is debounced, so callers should assert the
   * settled effect (computed tile/badge color) rather than the input value.
   */
  async setColorPickerValue(hex: string) {
    const colorPicker = this.page.testSubj.locator('euiColorPickerAnchor');
    await colorPicker.clear();
    await colorPicker.fill(hex);
    await this.page.keyboard.press('Tab');
  }

  /** Enables the "fill below" style for the reference line in the open dimension editor. */
  async setReferenceLineFillBelow() {
    await this.referenceLineFillBelowButton.click();
    // The button reflects the layer state Lens just committed, so this is the readiness signal
    // that the style landed before callers move on (assertions stay in specs).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      () =>
        document
          .querySelector('[data-test-subj="lnsXY_fill_below"]')
          ?.getAttribute('aria-pressed') === 'true',
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
  }

  /**
   * Configures a query-based annotation in the currently open annotation dimension editor.
   * The query textarea lives inside a popover that opens by default for a fresh query
   * annotation; typing into it and then toggling the trigger link commits the value before the
   * time-field picker underneath can be interacted with.
   */
  async configureQueryAnnotation(opts: {
    queryString: string;
    timeField: string;
    textDecoration?: { type: 'none' | 'name' | 'field'; textField?: string };
    extraFields?: string[];
  }) {
    await this.page.testSubj.locator('annotation-query-based-query-input').fill(opts.queryString);
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
    await this.page.components
      .comboBox('lnsXY-annotation-query-based-field-picker')
      .setSelectedOptions([opts.timeField]);

    if (opts.textDecoration) {
      await this.setAnnotationTextVisibility(opts.textDecoration.type);
      if (opts.textDecoration.textField) {
        await this.page.components
          .comboBox('lnsXY-annotation-query-based-text-decoration-field-picker')
          .setSelectedOptions([opts.textDecoration.textField]);
      }
    }

    if (opts.extraFields) {
      for (const field of opts.extraFields) {
        await this.addFieldToTooltip(field);
      }
    }
  }

  /** Sets the text-decoration mode in the currently open annotation dimension editor. */
  async setAnnotationTextVisibility(mode: 'none' | 'name' | 'field') {
    await this.page.testSubj.click(`lnsXY_textVisibility_${mode}`);
  }

  /** Adds another tooltip field row to the currently open annotation dimension editor. */
  private async addFieldToTooltip(fieldName: string) {
    const existingPickers = await this.page.testSubj
      .locator('^lnsXY-annotation-tooltip-field-picker')
      .count();
    await this.page.testSubj.click('lnsXY-annotation-tooltip-add_field');
    await this.page.components
      .comboBox(`lnsXY-annotation-tooltip-field-picker--${existingPickers}`)
      .setSelectedOptions([fieldName]);
  }

  // ---------------------------------------------------------------------------
  // Metric — Elastic Charts metric tiles + legacy metric
  // ---------------------------------------------------------------------------

  // Elastic Charts pads the last grid row with empty filler cells (`role="presentation"`,
  // no title/value) to keep tile sizing consistent; excluded since they aren't real metrics.
  // Scope Elastic Charts class selectors to the metric workspace so chrome/other
  // panels with the same classes can't produce false positives.
  readonly metricTilesLocator = this.page.locator(
    '[data-test-subj="mtrVis"] .echChart li:not([role="presentation"])'
  );
  readonly secondaryMetricBadge = this.page.locator('[data-test-subj="mtrVis"] .echBadge__content');
  private readonly secondaryMetricLabel = this.page.locator(
    '[data-test-subj="mtrVis"] .echSecondaryMetric__label'
  );
  /**
   * Added in a render pass after the one `waitForVisualization` settles on — callers that need
   * to assert it appears should poll `count()` before snapshotting via `getMetricVisualizationData`.
   */
  readonly metricProgressBar = this.page.locator(
    '[data-test-subj="mtrVis"] .echSingleMetricProgress'
  );
  readonly legacyMetricValue = this.page.testSubj.locator('metric_value');

  /** Returns locators for each Elastic Charts metric tile currently rendered. */
  getMetricTiles() {
    return this.metricTilesLocator.all();
  }

  /**
   * Clicks the metric tile whose title matches exactly (e.g. to trigger a click-to-filter
   * action). Throws if no tile has that title.
   */
  async clickMetricTileByTitle(title: string) {
    const data = await this.getMetricVisualizationData();
    const index = data.findIndex((datum) => datum.title === title);
    if (index === -1) {
      throw new Error(`Metric tile with title "${title}" not found`);
    }
    const tiles = await this.getMetricTiles();
    await tiles[index].click();
  }

  /** Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`. */
  async getMetricVisualizationData() {
    const tiles = await this.getMetricTiles();
    const showingBar = (await this.metricProgressBar.count()) > 0;

    const data = [];
    for (const tile of tiles) {
      const getText = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        return el.evaluate((node) => (node as HTMLElement).innerText);
      };
      const getColor = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        const color = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
        return normalizeComputedColor(color);
      };

      data.push({
        title: await getText('h2'),
        subtitle: await getText('.echMetricText__subtitle'),
        extraText: await getText('.echMetricText__extraBlock'),
        value: await getText('.echMetricText__valueBlock'),
        color: await getColor('.echMetric'),
        trendlineColor: await (async () => {
          const el = tile.locator('.echSingleMetricSparkline__svg > rect');
          if ((await el.count()) === 0) return undefined;
          return (await el.getAttribute('fill')) ?? undefined;
        })(),
        showingTrendline: (await tile.locator('.echSingleMetricSparkline').count()) > 0,
        showingBar,
      });
    }

    return data;
  }

  /** Returns the visible text of the secondary-value trend badge, or `undefined` if absent. */
  async getSecondaryMetricBadgeText(): Promise<string | undefined> {
    if ((await this.secondaryMetricBadge.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricBadge.innerText()).trim();
  }

  /** Returns the secondary metric's label text, or `undefined` if not rendered. */
  async getSecondaryMetricLabel(): Promise<string | undefined> {
    if ((await this.secondaryMetricLabel.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricLabel.innerText()).trim();
  }

  /** Returns the title and value rendered by a legacy metric visualization. */
  async getLegacyMetricData(): Promise<{ title: string; value: string }> {
    return {
      title: await this.page.testSubj.innerText('metric_label'),
      value: await this.page.testSubj.innerText('metric_value'),
    };
  }

  /** Clicks the legacy metric label (used to create a filter). */
  async clickLegacyMetric() {
    await this.page.testSubj.click('metric_label');
  }

  /** Sets the legacy metric dynamic coloring mode. */
  async setLegacyMetricColoringMode(mode: 'none' | 'labels' | 'background') {
    await this.page.testSubj.click(`lnsLegacyMetric_dynamicColoring_groups_${mode}`);
  }

  /**
   * Parses the inline `style` attribute of the legacy metric value element into a map.
   * Prefer asserting `legacyMetricValue` color with `expect(...).toHaveCSS('color', ...)`
   * over this helper when checking a color that was just changed — coloring updates are
   * debounced, so a point-in-time read of the `style` attribute can race the update, while
   * `toHaveCSS` auto-retries until the color settles.
   */
  async getLegacyMetricStyle(): Promise<Record<string, string>> {
    return parseInlineStyle((await this.legacyMetricValue.getAttribute('style')) ?? '');
  }

  // ---------------------------------------------------------------------------
  // Datatable — cell / header reading
  // ---------------------------------------------------------------------------

  private readonly dataTable = this.page.testSubj.locator('lnsDataTable');

  /**
   * Locator for a Lens datatable cell. Prefer `expect(locator).toContainText(...)`
   * over polling + `getDatatableCellText` when asserting visible values.
   */
  getDatatableCellLocator(rowIndex = 0, colIndex = 0, addRowNumberColumn = true) {
    const col = colIndex + (addRowNumberColumn ? 1 : 0);
    return this.dataTable.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-index="${col}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
  }

  private datatableCell(rowIndex: number, colIndex: number, addRowNumberColumn: boolean) {
    return this.getDatatableCellLocator(rowIndex, colIndex, addRowNumberColumn);
  }

  async getDatatableCellText(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<string> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    // EUI data grid can append expand/filter glyphs (↵, ↦) / extra whitespace in innerText.
    return ((await cell.innerText()) ?? '')
      .replace(/[\u21b5\u21a6\u2192]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getDatatableCellStyle(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<Record<string, string>> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    return parseInlineStyle((await cell.getAttribute('style')) ?? '');
  }

  async getCountOfDatatableColumns(): Promise<number> {
    // FTR parity: EuiDataGrid has no per-column test subj for content cells; `.euiDataGridHeaderCell__content`
    // excludes the leading control column (same selector as FTR `getCountOfDatatableColumns`).
    return this.dataTable.locator('.euiDataGridHeaderCell__content').count();
  }

  async getDatatableHeaderText(index = 0): Promise<string> {
    // Prefer content nodes — columnheader innerText can include action glyphs like ↵.
    // Index matches getCountOfDatatableColumns (control column excluded).
    // FTR parity: EUI class selector until Lens exposes header content test subjects.
    const headers = this.dataTable.locator('.euiDataGridHeaderCell__content');
    await this.page.waitForFunction(
      ({ minCount }) =>
        document.querySelectorAll('[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content')
          .length > minCount,
      { minCount: index },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const headerContents = await headers.all();
    const headerContent = headerContents[index];
    if (!headerContent) {
      throw new Error(`Datatable header not found at index ${index}`);
    }
    return (await headerContent.innerText()).replace(/\s+/g, ' ').trim();
  }

  // ---------------------------------------------------------------------------
  // Drag and drop — variants beyond shared dragFieldToWorkspace (geo, extra drop
  // types, reorder, keyboard DnD, field-list / data-panel helpers)
  // ---------------------------------------------------------------------------

  /**
   * Geo workspace drop target only mounts after dragstart on a geo field, so
   * Playwright `dragTo` cannot resolve the target up-front. Mirror FTR
   * `html5DragAndDrop`: dispatch dragstart, wait for the geo drop zone, drop.
   */
  async dragFieldToGeoFieldWorkspace(field: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;

    await this.page.evaluate((fromSel: string) => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = {
          data: {},
          setData(key: string, value: string) {
            this.data[key] = value;
          },
          getData(key: string) {
            return this.data[key];
          },
        };
        return event;
      }

      const origin = document.querySelector(`[data-test-subj="${fromSel}"]`);
      if (!origin) {
        throw new Error(`dragFieldToGeoFieldWorkspace: origin not found for ${fromSel}`);
      }
      const dragStartEvent = createEvent('dragstart');
      origin.dispatchEvent(dragStartEvent);
      (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer =
        dragStartEvent.dataTransfer;
    }, fieldTestSubj);

    const dropTarget = this.page.testSubj.locator('lnsGeoFieldWorkspace');
    await dropTarget.waitFor({ state: 'visible' });

    await this.page.evaluate(() => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }
      const transfer = (window as unknown as { __lensGeoDragTransfer?: Transfer })
        .__lensGeoDragTransfer;
      const target = document.querySelector('[data-test-subj="lnsGeoFieldWorkspace"]');
      if (!target || !transfer) {
        throw new Error('dragFieldToGeoFieldWorkspace: drop target or transfer missing');
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = transfer!;
        return event;
      }

      target.dispatchEvent(createEvent('dragenter'));
      target.dispatchEvent(createEvent('dragover'));
      target.dispatchEvent(createEvent('drop'));
      delete (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer;
    });

    await this.waitForLensDragDropToFinish();
  }

  /**
   * HTML5 DnD between dimension triggers/drop targets (FTR `dragDimensionToDimension`).
   * Both `from` and `to` are test-subj chains (e.g. `panel > lns-dimensionTrigger`).
   */
  async dragDimensionToDimension({ from, to }: { from: string; to: string }) {
    // Chains may match multiple nodes (e.g. Y panel with duplicates); wait for presence, not strict unique.
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      from,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      to,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.html5DragAndDrop(from, to);
    await this.waitForLensDragDropToFinish();
  }

  /** Drags a field onto a dimension trigger / empty slot (test-subj chain). */
  async dragFieldToDimensionTrigger(field: string, dimension: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.page.testSubj.locator(dimension).waitFor({ state: 'visible' });
    await this.html5DragAndDrop(fieldTestSubj, dimension);
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Reorders dimensions within a group (1-based indices, FTR `reorderDimensions`).
   * The reorderable drop layer only mounts after dragstart, so the full DnD runs in-page.
   * Waits for the drop layer to become an active droppable (same signal as `html5DragAndDrop`)
   * instead of a fixed sleep.
   */
  async reorderDimensions(dimension: string, startIndex: number, endIndex: number) {
    await this.page.waitForFunction(
      ({ panelSubj, minCount }) =>
        document.querySelectorAll(`[data-test-subj="${panelSubj}"]`).length >= minCount,
      { panelSubj: dimension, minCount: Math.max(startIndex, endIndex) },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.page.evaluate(
      async ([panelSubj, startIdx, endIdx]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function getReorderDropTarget(): Element | null {
          const panels = Array.from(document.querySelectorAll(`[data-test-subj="${panelSubj}"]`));
          return (
            panels[endIdx - 1]?.querySelector(
              `[data-test-subj="lnsDragDrop-reorderableDropLayer"]`
            ) ?? null
          );
        }

        async function waitForReorderDropTarget(timeout: number) {
          // Reorder drop layers mount after dragstart; they don't always pick up
          // `domDroppable--active` the way group-to-group drops do — wait for mount.
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = getReorderDropTarget();
            if (element) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        const panels = Array.from(document.querySelectorAll(`[data-test-subj="${panelSubj}"]`));
        const origin = panels[startIdx - 1]?.querySelector('.domDraggable');
        if (!origin) {
          throw new Error(
            `reorderDimensions: missing origin for ${panelSubj} index ${startIdx} (found ${panels.length} panels)`
          );
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        const target = await waitForReorderDropTarget(2_000);
        if (!target) {
          throw new Error(
            `reorderDimensions: drop layer never mounted for ${panelSubj} index ${endIdx}`
          );
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dimension, startIndex, endIndex] as [string, number, number]
    );
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Drags over a dimension group and drops on an extra target (duplicate/swap/combine).
   * Waits for droppable active/hover readiness (same pattern as `html5DragAndDrop`) instead
   * of fixed sleeps.
   */
  private async dragEnterDrop(dragging: string, draggedOver: string, dropTarget: string) {
    await this.page.evaluate(
      async ([fromSel, overSel, dropSel]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function queryChain(chain: string): Element | null {
          // CSS selector (starts with `[`) or test-subj chain with `>`
          if (chain.trim().startsWith('[')) {
            return document.querySelector(chain);
          }
          const parts = chain.split('>').map((p) => p.trim());
          let nodes: Element[] = [document.body];
          for (const part of parts) {
            const next: Element[] = [];
            for (const node of nodes) {
              next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
            }
            nodes = next;
          }
          return nodes[0] ?? null;
        }

        async function waitForTargetWithClass(chain: string, className: string, timeout: number) {
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = queryChain(chain);
            if (element?.closest('.domDroppable')?.classList.contains(className)) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        async function waitForElement(chain: string, timeout: number) {
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = queryChain(chain);
            if (element) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        const origin = queryChain(fromSel);
        if (!origin) {
          throw new Error(`dragEnterDrop: origin not found for ${fromSel}`);
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        const over = await waitForTargetWithClass(overSel, 'domDroppable--active', 2_000);
        if (!over) {
          throw new Error(`dragEnterDrop: draggedOver never became active for ${overSel}`);
        }
        const dragenter = createEvent('dragenter');
        dragenter.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragenter);
        const dragover = createEvent('dragover');
        dragover.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragover);

        // Extra drop targets (duplicate/swap/combine) mount after the hover; wait for them
        // rather than sleeping a fixed interval.
        const target = await waitForElement(dropSel, 5_000);
        if (!target) {
          throw new Error(`dragEnterDrop: dropTarget not found for ${dropSel}`);
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dragging, draggedOver, dropTarget] as [string, string, string]
    );
  }

  async dragFieldToExtraDropType(
    field: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.dragEnterDrop(
      fieldTestSubj,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  async dragDimensionToExtraDropType(
    from: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    await this.page.testSubj.locator(from).waitFor({ state: 'visible' });
    await this.dragEnterDrop(
      from,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  /** Active keyboard-DnD drop target key (test-subj or class+text fallback). */
  private async getKeyboardDragActiveKey(): Promise<string> {
    return this.page.evaluate(() => {
      const active = document.querySelector('.domDroppable--active, .domDroppable--hover');
      if (!active) {
        return '';
      }
      return (
        active.getAttribute('data-test-subj') ??
        `${active.className}:${(active.textContent ?? '').slice(0, 40)}`
      );
    });
  }

  /**
   * Pace between Lens keyboard DnD arrow presses (FTR `common.sleep(200)`).
   * Lens does not expose a reliable settle signal here: waiting for
   * `.domDroppable--active` key changes times out on common workspace drops
   * (highlight often updates without a distinct key). Intentional short sleep.
   */
  private async paceKeyboardDragDrop(previousActiveKey?: string): Promise<string> {
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(200);
    return (await this.getKeyboardDragActiveKey()) || previousActiveKey || '';
  }

  /**
   * Keyboard-drags a field onto a drop target by arrow steps (FTR `dragFieldWithKeyboard`).
   */
  async dragFieldWithKeyboard(fieldName: string, steps = 1, reverse = false) {
    const handler = this.page.locator(
      `[data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    // Prefer available-fields handler when the field is listed twice (selected + available).
    const availableHandler = this.page.locator(
      `[data-test-subj="lnsIndexPatternAvailableFields"] [data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    const target = (await availableHandler.count()) > 0 ? availableHandler : handler;
    await target.waitFor({ state: 'visible' });
    await target.focus();
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(
      () => document.querySelectorAll('.domDroppable--active').length > 0,
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-moves a dimension by arrow steps (FTR `dimensionKeyboardDragDrop`).
   */
  async dimensionKeyboardDragDrop(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardDragDrop: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-reorders a dimension within its group (FTR `dimensionKeyboardReorder`).
   */
  async dimensionKeyboardReorder(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardReorder: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowUp' : 'ArrowDown');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /** Filters the field list (FTR `searchField`). */
  async searchField(name: string) {
    const input = this.page.testSubj.locator('lnsIndexPatternFieldSearch');
    await input.waitFor({ state: 'visible' });
    await input.fill('');
    await this.page.testSubj.typeWithDelay('lnsIndexPatternFieldSearch', name, { delay: 30 });
  }

  /**
   * Changes the data view in the Lens data panel.
   * Waits for a saved `dataView-{title}` row and fails if it is missing
   * (does not fall back to "Explore matching indices").
   *
   * Does not type into the switcher search box: EuiSelectable filtering races with
   * async option load under CI. Scopes to the :visible switcher because the layer
   * panel also mounts `indexPattern-switcher` (hidden) while the popover is open.
   */
  async switchDataPanelIndexPattern(dataViewTitle: string) {
    const switchLink = this.page.testSubj.locator('lns-dataView-switch-link');
    await switchLink.waitFor({ state: 'visible' });
    if ((await switchLink.innerText()).trim() === dataViewTitle) {
      return;
    }

    await switchLink.click();
    // Layer config also uses `indexPattern-switcher`; only the open popover is visible.
    const switcher = this.page.locator('[data-test-subj="indexPattern-switcher"]:visible');
    await switcher.waitFor({ state: 'visible' });
    const matching = switcher.getByTestId(`dataView-${dataViewTitle}`);
    await matching.waitFor({ state: 'visible' });
    await matching.click();
    await switcher.waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('fieldListLoading').waitFor({ state: 'hidden' });
  }

  // ---------------------------------------------------------------------------
  // Workspace — navigation, apply/discard chrome, settings, tag cloud, ES|QL /
  // inline-editor getters, formula text
  // ---------------------------------------------------------------------------

  public readonly chartTitle = this.page.testSubj.locator('lns_ChartTitle');
  /** XY legend items (elastic-charts does not expose a `data-test-subj` for these). */
  public readonly xyLegendItems = this.page.locator('.echLegendItem');
  // Stable locators as readonly fields (Scout UI best practice); methods stay for parameterized
  // locators and multi-step actions. See docs/extend/testing/ui-best-practices.md.
  readonly convertToEsqlButton = this.page.getByRole('button', { name: 'Convert to ES|QL' });
  readonly convertToEsqlModal = this.page.getByTestId('lnsConvertToEsqlModal');
  readonly convertToEsqlModalConfirmButton = this.page.getByTestId('confirmModalConfirmButton');
  /** Same control as `closeDimensionEditorButton` — kept under this name for flyout-back call sites. */
  readonly secondaryFlyoutBackButton = this.closeDimensionEditorButton;
  readonly inlineEditor = this.page.getByTestId('customizeLens');
  readonly discardChangesModal = this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
  readonly autoApplyToggle = this.page.testSubj.locator('lnsToggleAutoApply');

  private readonly goBackToAppButton = this.page.testSubj.locator('lnsApp_goBackToAppButton');
  private readonly confirmModalConfirmButton = this.page.testSubj.locator(
    'confirmModalConfirmButton'
  );
  private readonly messageListTrigger = this.page.testSubj.locator('lens-message-list-trigger');
  private readonly settingsButton = this.page.testSubj.locator('lnsApp_settingsButton');
  private readonly settingsMenu = this.page.testSubj.locator('lnsApp__settingsMenu');
  private readonly emptyWorkspacePrompt = this.page.testSubj.locator('workspace-drag-drop-prompt');
  private readonly workspaceApplyChangesPrompt = this.page.testSubj.locator(
    'workspace-apply-changes-prompt'
  );
  private readonly suggestionPanelToggle = this.page.testSubj.locator(
    'lensSuggestionsPanelToggleButton'
  );

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
    // Sequential remove+re-render per dimension can exceed the 10s actionTimeout.
    const deadline = Date.now() + 30_000;
    while ((await removeLocator.count()) > 0) {
      if (Date.now() >= deadline) {
        throw new Error(`Timed out removing dimensions for "${dimensionTestSubj}"`);
      }
      const buttons = await removeLocator.all();
      const button = buttons[0];
      if (!button) {
        break;
      }
      const countBefore = buttons.length;
      await button.hover();
      await button.click();
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      await this.page.waitForFunction(
        ({ panelSubj, before }) => {
          const panel = document.querySelector(`[data-test-subj="${panelSubj}"]`);
          if (!panel) {
            return true;
          }
          return (
            panel.querySelectorAll('[data-test-subj="indexPattern-dimension-remove"]').length <
            before
          );
        },
        { panelSubj: dimensionTestSubj, before: countBefore },
        { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
      );
    }
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
      throw new Error('Elastic charts debugState not found — enable chart debug before navigation');
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
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.suggestionPanelToggle.click();
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]');
        return el == null || el.getAttribute('aria-expanded') !== 'true';
      },
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
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
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
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
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
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
}
