/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * EUI and the embedded charts mix screen-reader-only content into the visible text
 * of table cells: every cell ends with a keyboard tab-stop hint (`↦`, or `↵` on the
 * last column), asynchronously loaded cells are prefixed with a "Loaded" status
 * line, and cells containing a spark plot append a chart description. None of that
 * is part of the value under test.
 */
const SCREEN_READER_ONLY_LINES = new Set([
  '↦',
  '↵',
  'Loaded',
  'Loading',
  'Chart type:',
  'bar chart',
]);

const meaningfulLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !SCREEN_READER_ONLY_LINES.has(line));

/** A column header renders its label plus a sort/tab-stop hint on a second line. */
export const normalizeHeaderText = (text: string): string => meaningfulLines(text)[0] ?? '';

/**
 * Keeps every meaningful line of a cell, because some cells legitimately render
 * two (the data set name column shows the display name above the raw name when
 * "show full data set names" is toggled on).
 */
export const normalizeCellText = (text: string): string => meaningfulLines(text).join('\n');

/**
 * Selects an option inside an `EuiSelectable`.
 *
 * `EuiSelectableWrapper` from `@kbn/scout` matches options by exact accessible
 * name, which never matches here: EUI appends ". To check this option, press
 * Enter." to each option's label. This matches on the option's visible text instead.
 */
export const selectOptionByText = async (
  page: ScoutPage,
  containerTestSubj: string,
  optionText: string
): Promise<void> => {
  const option: Locator = page
    .locator(`[data-test-subj="${containerTestSubj}"] li[role="option"]`)
    .filter({ hasText: optionText });

  await option.click();
};

/**
 * Selects an option in a searchable `Selector` filter. The list is virtualised, so the
 * search box must narrow it first — an option scrolled out of view is not in the DOM.
 * Clicking by `<selector>Option-<label>` avoids EUI's screen-reader text suffix.
 *
 * Toggling an option flips its `checked` state, which re-renders the `EuiSelectable`
 * (and can transiently detach and remount its search box). The search box can therefore
 * vanish between the visibility check and `fill`, so that pair is retried as a unit, and
 * the click waits for the row's checked state to flip so the caller only starts waiting
 * on the table once the selection has registered.
 */
export const selectSearchableOption = async (
  page: ScoutPage,
  selectorTestSubj: string,
  label: string
): Promise<void> => {
  const container = page.testSubj.locator(`${selectorTestSubj}Options`);
  await container.waitFor({ state: 'visible' });

  const option = page.testSubj.locator(`${selectorTestSubj}Option-${label}`);
  const optionRow = option.locator('xpath=ancestor::li[@role="option"]');

  // Narrow the list first. A re-render triggered by a previous toggle can remount the
  // search box between the visibility check and `fill`, so retry that pair as a unit.
  // Cap the retries so a genuinely missing option fails here rather than eating the
  // whole test timeout.
  await expect(async () => {
    const searchbox = container.getByRole('searchbox');
    await searchbox.waitFor({ state: 'visible' });
    await searchbox.fill(label);
    await expect(option).toBeVisible();
  }).toPass({ timeout: 30_000 });

  // Toggle the option and wait for its row to report the flipped state, so the caller's
  // table-load wait starts only once the selection has actually registered.
  const wasChecked = (await optionRow.getAttribute('aria-checked')) === 'true';
  await option.click();
  await expect(optionRow).toHaveAttribute('aria-checked', wasChecked ? 'false' : 'true');
};
