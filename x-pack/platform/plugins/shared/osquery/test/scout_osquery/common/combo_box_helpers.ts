/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

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
 * `Locator`). The helper opens the list via `comboBoxSearchInput`, fills the
 * filter, polls until the matching row appears (async options), then clicks by
 * `title`.
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
  await expect(searchInput).toBeEnabled({ timeout: 15_000 });

  // Open the dropdown by clicking `comboBoxSearchInput`, not the `comboBoxInput`
  // wrapper div. EUI mounts the wrapper as a focus target; when the pack
  // combobox re-renders after `usePacks` hydrates options (e.g. flyout pack
  // mode on serverless), Playwright can lose the wrapper mid-click ("element
  // was detached from the DOM"). The inner `<input>` is the stable typing
  // target — same pattern as `AlertFlyoutPage.clearAgentsAndSelectAllAgents`.
  const escaped = optionName.replace(/"/g, '\\"');
  // Prefer visible options only: stacked Security flyouts / portals can leave
  // duplicate `.euiFilterSelectItem` nodes in the DOM (hidden shells + active
  // listbox). `page.locator(...).first()` then races the wrong row and times
  // out on click — the alert pack-picker and live-query flows both hit this.
  const optionLocator = page
    .locator(`.euiFilterSelectItem[title="${escaped}"]`)
    .filter({ visible: true });

  // Options often hydrate after async fetches (e.g. `usePacks` in the live-query
  // form). Opening the list right after toggling pack mode can race ahead of
  // `/api/osquery/packs` — the dropdown is empty until react-query settles, so
  // a single click+type+click misses every time. Re-open and re-apply the filter
  // until the row mounts (virtualized list still renders matching rows).
  await expect(async () => {
    await searchInput.click({ timeout: 15_000 });
    await searchInput.fill(optionName);
    // eslint-disable-next-line playwright/no-nth-methods -- first matching option after async/virtualized list hydration
    await expect(optionLocator.first()).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });

  // Click the option by `title` — EUI's stable label attribute, independent of
  // the option's accessible name / visible text. NOTE: do NOT press Escape
  // afterwards — the key bubbles up and closes the surrounding alert flyout
  // when this helper runs from a flyout context.
  // eslint-disable-next-line playwright/no-nth-methods -- same locator as visibility check above; first visible option
  await optionLocator.first().click({ timeout: 30_000 });
}
