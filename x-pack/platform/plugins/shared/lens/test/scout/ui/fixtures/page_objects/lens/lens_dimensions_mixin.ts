/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { LensAppConstructor } from './mixin_types';

/** `useDebouncedValue` waits 256ms before committing; add margin for a busy main thread. */
const FORMAT_PARAM_DEBOUNCE_FLUSH_MS = 500;

/**
 * Dimension-trigger introspection, format params, quick-functions/static-value tabs, and
 * other dimension-editor details that only Lens's own Scout specs exercise directly
 * (cross-plugin callers go through the shared `configureDimension` in `@kbn/scout`).
 */
export function withLensDimensions<TBase extends LensAppConstructor>(Base: TBase) {
  return class extends Base {
    /** Locator for all dimension-trigger buttons in the Lens config panel. */
    getDimensionTriggerLocator() {
      return this.page.testSubj.locator('lns-dimensionTrigger');
    }

    /**
     * Locator for dimension-trigger buttons inside a panel/group.
     * Prefer `expect(locator).toHaveText(...)` / `toHaveCount(0)` over `expect.poll`
     * + `getDimensionTriggerText` — Playwright auto-waits on the locator.
     */
    getDimensionTriggersLocator(dimension: string) {
      return this.page.testSubj.locator(`${dimension} > lns-dimensionTrigger`);
    }

    /** Returns all dimension-trigger button locators currently rendered in the editor. */
    getDimensionTriggers() {
      return this.getDimensionTriggerLocator().all();
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
      const triggersLocator = this.getDimensionTriggerLocator();
      await expect.poll(async () => await triggersLocator.count()).toBeGreaterThan(index);

      const triggers = await triggersLocator.all();
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
        { timeout: 10_000 }
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
    async setFormatParam(selector: string, value: string) {
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
        { timeout: 10_000 }
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
  };
}
