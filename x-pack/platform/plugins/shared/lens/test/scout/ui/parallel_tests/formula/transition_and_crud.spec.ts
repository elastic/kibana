/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup } from '../../fixtures';

spaceTest.describe('Lens formula transition and CRUD', { tag: tags.stateful.classic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    enableChartDebug: true,
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
    await lens.waitForVisualization('xyVisChart');
    await expect
      .poll(async () => (await lens.getCurrentChartDebugState('xyVisChart')).legend?.items.length)
      .toBe(3);

    const { violations } = await page.checkA11y({
      // Dimension flyout has no root data-test-subj; title id is the stable a11y landmark.
      include: ['#lnsDimensionContainerTitle'],
    });
    expect(violations).toHaveLength(0);
  });

  spaceTest('updates a formula via autocomplete completion', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count(kql=`,
      keepOpen: true,
    });
    await lens.typeInFormula('*', { focus: false });
    // FTR parity: exact Logstash count for in-range archive window.
    await expect.poll(async () => lens.getDatatableCellText(0, 0)).toBe('14,005');
  });

  spaceTest('persists a broken formula on close', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `asdf`,
    });

    expect(await lens.getDimensionTriggerText('lnsDatatable_metrics')).toBe('asdf');
    await lens.openMessageList();
    await expect(lens.getMessageListItems('error')).toContainText('Field asdf was not found.');
    await lens.closeMessageList();
  });

  spaceTest('keeps formula text when entering expanded mode', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `count()`,
      keepOpen: true,
    });
    await lens.toggleFullscreen();
    await expect.poll(async () => lens.getFormulaText()).toBe('count()');
  });

  spaceTest('allows an empty formula combined with a valid formula', async ({ pageObjects }) => {
    const { lens } = pageObjects;

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
