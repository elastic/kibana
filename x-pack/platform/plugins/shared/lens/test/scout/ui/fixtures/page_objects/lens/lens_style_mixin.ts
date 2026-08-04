/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { LensAppConstructor } from './mixin_types';
import { normalizeComputedColor } from './lens_editor_helpers';

/**
 * Style-settings flyout, palette details (beyond the shared `configureDimension` palette
 * picker), gauge/heatmap style, reference-line style, and annotation-editor helpers.
 */
export function withLensStyle<TBase extends LensAppConstructor>(Base: TBase) {
  return class extends Base {
    /** Style flyout title — Lens uses a DOM id, not a data-test-subj (FTR parity). */
    public get dimensionContainerTitle() {
      return this.page.locator('#lnsDimensionContainerTitle');
    }

    public get styleSettingsButton() {
      return this.page.locator('button[data-test-subj="style"]');
    }

    public get flyoutBackButton() {
      return this.page.testSubj.locator('lns-indexPattern-dimensionContainerBack');
    }

    public get referenceLineFillBelowButton() {
      return this.page.testSubj.locator('lnsXY_fill_below');
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
      await this.page.testSubj.click(
        `lnsPalettePanel_dynamicColoring_rangeType_groups_${rangeType}`
      );
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

      let prevColorStopsJson: string | null = null;
      await expect
        .poll(
          async () => {
            const stopCount = await stopInputsLocator.count();
            if (expectedStopsCount !== undefined && stopCount !== expectedStopsCount) {
              return false;
            }
            if (stopCount === 0) {
              return false;
            }

            const colorStopsJson = JSON.stringify(await readColorStops());
            if (prevColorStopsJson === colorStopsJson) {
              return true;
            }
            prevColorStopsJson = colorStopsJson;
            return false;
          },
          // Palette stops can take several debounce cycles to stabilize after edits.
          { intervals: [500], timeout: 20_000 }
        )
        .toBe(true);

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

    /** Locator for the reference-line "fill below" style button in the open dimension editor. */
    getReferenceLineFillBelowButton() {
      return this.referenceLineFillBelowButton;
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
        { timeout: 10_000 }
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
    async addFieldToTooltip(fieldName: string) {
      const existingPickers = await this.page.testSubj
        .locator('^lnsXY-annotation-tooltip-field-picker')
        .count();
      await this.page.testSubj.click('lnsXY-annotation-tooltip-add_field');
      await this.page.components
        .comboBox(`lnsXY-annotation-tooltip-field-picker--${existingPickers}`)
        .setSelectedOptions([fieldName]);
    }
  };
}
