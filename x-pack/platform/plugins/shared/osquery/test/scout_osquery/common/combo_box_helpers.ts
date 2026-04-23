/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * `EuiComboBoxWrapper.selectSingleOption` from `@kbn/scout` doesn't cover the
 * two EUI combobox variants osquery uses heavily:
 *
 *  1. `singleSelection={{ asPlainText: true }}` — after Enter, EUI replaces
 *     the `comboBoxSearchInput` `<input>` with a plain text rendering of the
 *     label. The wrapper's post-commit `expect(getSelectedValue()).toBe(value)`
 *     reads the (now-absent) input and times out.
 *  2. Options whose accessible name is a description, not the field/id the
 *     spec types (e.g., ECS field combobox: option `title="host.name"` but
 *     the rendered text is "Name of the host"). The wrapper's
 *     `getByRole('option', { name: value, exact: false })` lookup matches by
 *     accessible name and fails.
 *
 * This helper works around both by clicking the option via its `title` CSS
 * attribute selector — the same pattern `EuiComboBoxWrapper.selectMultiOption`
 * uses internally. EUI sets `title` to the option's label on every
 * `euiFilterSelectItem`, so this is stable across both variants above.
 *
 * Callers scope to the combobox wrapper (by `data-test-subj` or an existing
 * `Locator`). The helper handles focus → type → click-by-title.
 */
export interface SelectComboBoxOptionParams {
  /**
   * Scope for the combobox wrapper. Either a `data-test-subj` value, or a
   * pre-built `Locator` (used for flyout-scoped comboboxes).
   */
  wrapper: { dataTestSubj: string } | { locator: Locator };
  /** Option label to select — must match the option's `title` attribute. */
  optionName: string;
}

function resolveWrapper(page: ScoutPage, wrapper: SelectComboBoxOptionParams['wrapper']): Locator {
  if ('locator' in wrapper) return wrapper.locator;

  return page.testSubj.locator(wrapper.dataTestSubj);
}

/**
 * Select a single option in an osquery EUI combobox by typing a filter and
 * clicking the option whose `title` attribute matches the label exactly.
 * Works for both `asPlainText: true` comboboxes (pack / saved-query) and
 * standard description-labelled comboboxes (ECS field / osquery column).
 */
export async function selectSingleAsPlainTextOption(
  page: ScoutPage,
  { wrapper, optionName }: SelectComboBoxOptionParams
): Promise<void> {
  const wrapperLocator = resolveWrapper(page, wrapper);
  const searchInput = wrapperLocator.locator('[data-test-subj="comboBoxSearchInput"]');

  await searchInput.waitFor({ state: 'visible', timeout: 15_000 });

  // Click the main input to open the popover. Scope to the wrapper's own
  // main input (not the inner search input) because clicking the inner
  // input doesn't always open the dropdown on the first attempt.
  await wrapperLocator.locator('[data-test-subj="comboBoxInput"]').click();

  // Type with a per-key delay so async option loading (e.g., packs/saved
  // queries fetched server-side) can filter down to our target label.
  await searchInput.pressSequentially(optionName, { delay: 20 });

  // Click the option by `title` — EUI's stable label attribute, independent of
  // the option's accessible name / visible text. Escape double-quotes in the
  // user-supplied label so selectors with quotes don't break. NOTE: do NOT
  // press Escape afterwards — the key bubbles up and closes the surrounding
  // alert flyout when this helper runs from a flyout context.
  const escaped = optionName.replace(/"/g, '\\"');
  await page.locator(`.euiFilterSelectItem[title="${escaped}"]`).click();
}
