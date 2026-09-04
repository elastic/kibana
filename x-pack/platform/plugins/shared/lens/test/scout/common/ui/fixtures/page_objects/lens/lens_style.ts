/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { normalizeComputedColor, WAIT_FOR_FUNCTION_TIMEOUT_MS } from './lens_editor_helpers';

/**
 * Lens style flyout, palette details, gauge/heatmap settings, reference lines, and annotations.
 */
export class LensStyle {
  /** Style flyout title — Lens uses a DOM id, not a data-test-subj (FTR parity). */
  private readonly dimensionContainerTitle;
  private readonly styleSettingsButton;
  private readonly flyoutBackButton;
  private readonly closeDimensionEditorButton;
  /** Shared by palette open/close helpers and `getPaletteColorStops`. */
  private readonly palettePanelFlyout;
  private readonly colorEditingTrigger;
  private readonly paletteSiblingFlyoutBackButton;
  private readonly colorMappingPalettePicker;
  private readonly legacyPalettePicker;
  readonly referenceLineFillBelowButton;
  private readonly curveStyleSelect;
  private readonly missingValuesSuperSelect;
  readonly missingValuesSelect;

  constructor(private readonly page: ScoutPage) {
    this.dimensionContainerTitle = this.page.locator('#lnsDimensionContainerTitle');
    this.styleSettingsButton = this.page.locator('button[data-test-subj="style"]');
    this.flyoutBackButton = this.page.testSubj.locator('lns-indexPattern-dimensionContainerBack');
    this.closeDimensionEditorButton = this.page.testSubj.locator(
      'lns-indexPattern-dimensionContainerClose'
    );
    this.palettePanelFlyout = this.page.testSubj.locator('lns-palettePanelFlyout');
    this.colorEditingTrigger = this.page.testSubj.locator('lns_colorEditing_trigger');
    this.paletteSiblingFlyoutBackButton = this.page.testSubj.locator(
      'lns-indexPattern-SettingWithSiblingFlyoutBack'
    );
    this.colorMappingPalettePicker = this.page.testSubj.locator(
      'kbnColoring_ColorMapping_PalettePicker'
    );
    this.legacyPalettePicker = this.page.testSubj.locator('lns-palettePicker');
    this.referenceLineFillBelowButton = this.page.testSubj.locator('lnsXY_fill_below');
    this.curveStyleSelect = this.page.components.superSelect('lnsCurveStyleSelect');
    this.missingValuesSuperSelect = this.page.components.superSelect('lnsMissingValuesSelect');
    this.missingValuesSelect = this.page.testSubj.locator('lnsMissingValuesSelect');
  }

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

  /**
   * Opens the palette panel flyout for the currently active dimension.
   * Waits for the color-editing trigger (appears after field selection commits).
   */
  private async openPalettePanelFlyout() {
    await this.colorEditingTrigger.waitFor({ state: 'visible' });
    await this.colorEditingTrigger.click();
    await this.palettePanelFlyout.waitFor({
      state: 'visible',
    });
  }

  private async closePalettePanelFlyout() {
    await this.paletteSiblingFlyoutBackButton.click();
    await this.paletteSiblingFlyoutBackButton.waitFor({ state: 'hidden' });
  }

  private async closeDimensionEditor() {
    await this.closeDimensionEditorButton.click({ timeout: 15_000 });
    await this.closeDimensionEditorButton.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  /**
   * Reads the selected donut hole size from the style settings flyout.
   * Leaves the flyout open — caller should close when done (e.g. `closeFlyoutWithBackButton`).
   */
  async getDonutHoleSize(): Promise<string> {
    await this.openStyleSettingsFlyout();
    const selectedOptions = await this.page.components
      .comboBox('lnsEmptySizeRatioOption')
      .getSelectedOptions();
    return selectedOptions[0] ?? '';
  }

  /** Sets the donut hole size from the style settings flyout (e.g. `Large`). */
  async setDonutHoleSize(value: string) {
    await this.openStyleSettingsFlyout();
    await this.page.components.comboBox('lnsEmptySizeRatioOption').setSelectedOptions([value]);
    await this.closeFlyoutWithBackButton();
  }

  /**
   * Returns the currently selected palette id from the open dimension's palette panel.
   * Closes the palette panel afterward. Dimension editor must already be open.
   */
  async getSelectedPaletteId(isLegacy: boolean): Promise<string> {
    await this.openPalettePanelFlyout();
    const palettePicker = isLegacy ? this.legacyPalettePicker : this.colorMappingPalettePicker;
    await palettePicker.click();
    const selected = this.page.locator('[role=option][aria-selected=true]');
    await selected.waitFor({ state: 'visible' });
    const paletteId = await selected.getAttribute('id');
    // Close the open picker list, then the palette flyout.
    await palettePicker.click();
    await this.closePalettePanelFlyout();
    if (!paletteId) {
      throw new Error('No selected palette option found');
    }
    return paletteId;
  }

  /**
   * Opens a dimension by test-subj, switches its color-mapping palette, and closes the editor.
   * Prefer `configureDimension({ palette })` when configuring a new empty dimension.
   */
  async changeColorMappingPalette(dimensionSelector: string, paletteId: string) {
    await this.page.testSubj.click(dimensionSelector);
    await this.closeDimensionEditorButton.waitFor({ state: 'visible' });
    await this.openPalettePanelFlyout();
    // Caller must already be on color-mapping mode (aria-checked=false).
    await this.page.testSubj
      .locator('lns_colorMappingOrLegacyPalette_switch')
      .and(this.page.locator('[aria-checked="false"]'))
      .waitFor({ state: 'visible' });
    await this.colorMappingPalettePicker.click();
    await this.page.testSubj.click(`kbnColoring_ColorMapping_Palette-${paletteId}`);
    await this.closePalettePanelFlyout();
    await this.closeDimensionEditor();
  }

  /**
   * Overrides a categorical color-mapping assignment (0-based swatch / palette color indices).
   * Closes the palette panel and dimension editor afterward.
   */
  async changeColorMappingCategoricalColors(
    dimensionSelector: string,
    colorSwatchIndex: number,
    paletteColorIndex: number
  ) {
    const dimensionLink = this.page.testSubj.locator(dimensionSelector);
    await dimensionLink.waitFor({ state: 'visible' });
    await dimensionLink.click();
    // Color-mapping panel can lag after dimension open under parallel load.
    await this.closeDimensionEditorButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.openPalettePanelFlyout();
    // Assignments prompt remounts with the palette panel; dispatchEvent avoids stability flakes.
    const addAll = this.page.testSubj.locator('lns-colorMapping-assignmentsPromptAddAll');
    await addAll.waitFor({ state: 'visible' });
    await addAll.dispatchEvent('click');
    await this.page.testSubj.click(`lns-colorMapping-colorSwatch-${colorSwatchIndex}`);
    await this.page.testSubj.click(`lns-colorMapping-colorPicker-staticColor-${paletteColorIndex}`);
    await this.page.testSubj.click(`lns-colorMapping-colorSwatch-${colorSwatchIndex}`);
    await this.closePalettePanelFlyout();
    await this.closeDimensionEditor();
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
    const stopInputsLocator = this.palettePanelFlyout.locator(
      '[data-test-subj^="lnsPalettePanel_dynamicColoring_range_value_"]'
    );
    const colorAnchorsLocator = this.palettePanelFlyout.locator(
      '[data-test-subj="euiColorPickerAnchor"]'
    );

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

  /**
   * Sets XY line interpolation from the open style flyout (`Straight`, `Smooth`, `Step`).
   */
  async setCurvedLines(label: string) {
    await this.curveStyleSelect.selectOptionByLabel(label);
  }

  /**
   * Sets XY missing-values fitting from the open style flyout (`Hide`, `Zero`, `Linear`, …).
   */
  async editMissingValues(label: string) {
    await this.missingValuesSuperSelect.selectOptionByLabel(label);
  }
}
