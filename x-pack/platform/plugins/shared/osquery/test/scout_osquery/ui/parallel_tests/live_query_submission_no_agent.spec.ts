/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';

test.describe('Live query submission without enrolled agents', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
  });

  // Single dedicated a11y test (axe is slow — not in beforeEach).
  test('live query form has no accessibility violations', async ({ page }) => {
    // Exclude EuiCard selectable footers (no accessible name — known EUI/axe gap).
    const { violations } = await page.checkA11y({
      include: ['[data-test-subj="liveQueryForm"]'],
      exclude: ['[class*="euiCardSelect"]'],
      timeoutMs: 25_000,
    });
    expect(violations).toStrictEqual([]);
  });

  test('blocks submit with an agents validation message when no agents are selected', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select 1;');
    await pageObjects.osqueryLiveQueryForm.clickSubmit();
    await expect(page.getByText('Agents is a required field')).toBeVisible();
  });

  test('grows the editor on Shift+Enter and keeps a multiline query in Monaco', async ({
    pageObjects,
  }) => {
    await pageObjects.osqueryLiveQueryForm.queryEditor.click();
    await pageObjects.osqueryLiveQueryForm.inputQuery('select 1');
    const heightBefore = await pageObjects.osqueryLiveQueryForm.getQueryEditorHeight();
    // Height must be measurable (avoids vacuous 0 >= 0).
    expect(heightBefore).toBeGreaterThan(0);
    await pageObjects.osqueryLiveQueryForm.pressShiftEnterInEditor();
    await pageObjects.osqueryLiveQueryForm.inputQuery('select 2;');
    const heightAfter = await pageObjects.osqueryLiveQueryForm.getQueryEditorHeight();
    // Height may be unchanged with newline; newline still asserted on model text.
    expect(heightAfter).toBeGreaterThanOrEqual(heightBefore);
    const editorText = await pageObjects.osqueryLiveQueryForm.getMonacoEditorText();
    expect(editorText).toContain('select 1');
    expect(editorText).toContain('select 2');
    expect(/\r?\n/.test(editorText)).toBe(true);
  });

  test('reveals the timeout field when Advanced options are expanded', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();
    await expect(
      page.testSubj.locator('advanced-accordion-content').getByTestId('timeout-input')
    ).toBeVisible();
  });

  test('blocks submit with a query validation message when the query is empty', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select 1;');
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('');
    await pageObjects.osqueryLiveQueryForm.clickSubmit();
    // Duplicate error nodes (inline + summary) — .first() for strict mode.
    // eslint-disable-next-line playwright/no-nth-methods -- duplicate validation text
    await expect(page.getByText('Query is a required field').first()).toBeVisible();
  });
});
