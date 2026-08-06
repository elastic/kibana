/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

spaceTest.describe('Lens formula KQL escaping', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    withEscapedRuntimeField: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('escapes KQL string values with apostrophes', async ({ page, pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count(kql=`,
      keepOpen: true,
    });

    await lens.typeInFormula(' ', { focus: false });
    await page.keyboard.press('ArrowLeft');
    await lens.typeInFormula(`Men's Clothing`, { focus: false });
    // Monaco model + KQL autocomplete debounce — no locator auto-wait for editor contents.
    await expect
      .poll(async () => lens.getFormulaText(), { timeout: 15_000 })
      .toBe(`count(kql='Men\\'s Clothing ')`);

    await lens.typeInFormula('count(kql=', { replace: true });
    await lens.typeInFormula(`Men's Clothing`, { focus: false });
    await expect
      .poll(async () => lens.getFormulaText(), { timeout: 15_000 })
      .toBe(`count(kql='Men\\'s Clothing')`);
  });

  spaceTest('escapes field names that contain quotes', async ({ page, pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'unique_count',
      field: testData.FORMULA_ESCAPED_RUNTIME_FIELD,
      keepOpen: true,
    });
    await lens.switchToFormula();
    // Monaco model value — no locator auto-wait for editor contents.
    await expect.poll(async () => lens.getFormulaText()).toBe(`unique_count('ab\\' "\\'')`);

    // Re-type and accept field autocomplete (FTR presses Enter on suggestion).
    await lens.typeInFormula('unique_count(', { replace: true });
    await lens.typeInFormula('ab', { focus: false });
    await page.keyboard.press('Enter');
    await expect.poll(async () => lens.getFormulaText()).toBe(`unique_count('ab\\' "\\'')`);
  });
});
