/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

/**
 * Migrated from FTR `group5/drag_and_drop.ts` duplicate/swap/combine scenarios.
 * Each test reseeds the workspace (independent — safe to parallelize at file level).
 */
spaceTest.describe(
  'Lens drag and drop duplicate swap and combine',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup();

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('duplicates and swaps via secondary drop targets', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.switchToVisualization('bar');
      await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

      await lens.dragDimensionToExtraDropType(
        'lnsXY_xDimensionPanel > lns-dimensionTrigger',
        'lnsXY_splitDimensionPanel',
        'duplicate',
        testData.XY_CHART
      );
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText(
        '@timestamp [1]'
      );
      await lens.dragFieldToDimensionTrigger(
        '@message.raw',
        'lnsXY_yDimensionPanel > lns-dimensionTrigger'
      );
      await lens.dragDimensionToExtraDropType(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        'lnsXY_yDimensionPanel',
        'swap',
        testData.XY_CHART
      );
      await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText(
        'Count of @timestamp'
      );
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText(
        'Top 9 values of @message.raw'
      );
    });

    spaceTest('combines breakdown with horizontal dimension', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.dragFieldToWorkspace('clientip', testData.XY_CHART);
      await lens.dragFieldToWorkspace('@message.raw', testData.XY_CHART);

      await lens.dragDimensionToExtraDropType(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        'lnsXY_xDimensionPanel',
        'combine',
        testData.XY_CHART
      );
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        'Top values of clientip + 1 other'
      );
    });

    spaceTest('combines field onto existing horizontal dimension', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.dragFieldToWorkspace('clientip', testData.XY_CHART);

      await lens.dragFieldToExtraDropType(
        '@message.raw',
        'lnsXY_xDimensionPanel',
        'combine',
        testData.XY_CHART
      );
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        'Top values of clientip + 1 other'
      );
    });

    spaceTest('combines two multi-terms dimensions', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.dragFieldToWorkspace('clientip', testData.XY_CHART);

      await lens.dragFieldToExtraDropType(
        '@message.raw',
        'lnsXY_xDimensionPanel',
        'combine',
        testData.XY_CHART
      );

      await lens.dragFieldToDimensionTrigger(
        '@message.raw',
        'lnsXY_splitDimensionPanel > lns-empty-dimension'
      );
      await lens.dragFieldToExtraDropType(
        'geo.src',
        'lnsXY_splitDimensionPanel',
        'combine',
        testData.XY_CHART
      );
      await lens.dragDimensionToExtraDropType(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        'lnsXY_xDimensionPanel',
        'combine',
        testData.XY_CHART
      );

      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        'Top values of clientip + 2 others'
      );
    });
  }
);
