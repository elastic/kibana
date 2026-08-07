/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../../fixtures';

spaceTest.describe('Lens formula transition and CRUD', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    enableChartDebug: true,
    // Saved-vis transition opens `lnsXYvis` directly; CRUD tests open an empty editor below.
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('transitions from count to formula on saved XY vis', async ({ page, pageObjects }) => {
    const { lens, visualize } = pageObjects;

    await visualize.goto();
    await visualize.openSavedVisualization('lnsXYvis', { waitFor: 'lens' });

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
      operation: 'average',
      field: 'bytes',
      keepOpen: true,
    });
    await lens.switchToFormula();
    // getCurrentChartDebugState waits for chart render-complete internally, so a single read is stable.
    // Formula transition must preserve the terms grouping on the saved viz: 3 legend items (FTR parity).
    const { legend } = await lens.getCurrentChartDebugState('xyVisChart');
    expect(legend?.items).toHaveLength(3);

    const { violations } = await page.checkA11y({
      // Dimension flyout has no root data-test-subj; title id is the stable a11y landmark.
      include: ['#lnsDimensionContainerTitle'],
    });
    expect(violations).toHaveLength(0);
  });

  spaceTest('updates a formula via autocomplete completion', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count(kql=`,
      keepOpen: true,
    });
    await lens.typeInFormula('*', { focus: false });
    await lens.waitForVisualization();
    // Exact archive counts → #280444. UI asserts autocomplete produced a positive count.
    await expect(lens.getDatatableCellLocator(0, 0)).toHaveText(/\d/);
    const count = Number((await lens.getDatatableCellText(0, 0)).replace(/,/g, ''));
    expect(count).toBeGreaterThan(0);
  });

  spaceTest('persists a broken formula on close', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `asdf`,
    });

    await expect(lens.getDimensionTriggersLocator('lnsDatatable_metrics')).toHaveText('asdf');
    await lens.openMessageList();
    await expect(lens.getMessageListItems('error')).toContainText('Field asdf was not found.');
    await lens.closeMessageList();
  });

  spaceTest('keeps formula text when entering expanded mode', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count()`,
      keepOpen: true,
    });
    await lens.toggleFullscreen();
    // Monaco model value — no locator auto-wait for editor contents.
    await expect.poll(async () => lens.getFormulaText()).toBe('count()');
  });

  spaceTest('allows an empty formula combined with a valid formula', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count()`,
    });
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
    });

    await lens.waitForVisualization();
    expect(await lens.getWorkspaceErrorCount()).toBe(0);
  });
});
