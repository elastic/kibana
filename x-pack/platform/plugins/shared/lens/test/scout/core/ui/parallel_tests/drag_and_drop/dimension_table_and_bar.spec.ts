/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

/**
 * Migrated from FTR `group5/drag_and_drop.ts` table → bar dimension moves
 * (drops, reorder, compatible/non-compatible moves, duplicate within group).
 * Sequential within this file — later steps continue editor state from earlier ones.
 */
spaceTest.describe(
  'Lens drag and drop table and bar moves',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup();

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'drops fields onto table dimensions, reorders, and moves across bar groups',
      async ({ pageObjects }) => {
        const { lens } = pageObjects;

        await spaceTest.step('seed workspace with a time field then switch to table', async () => {
          await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);
          await lens.switchToVisualization('lnsDatatable');
        });

        await spaceTest.step('drop fields onto existing and empty dimension triggers', async () => {
          await lens.dragFieldToDimensionTrigger(
            'clientip',
            'lnsDatatable_rows > lns-dimensionTrigger'
          );
          await expect(lens.getDimensionTriggersLocator('lnsDatatable_rows')).toHaveText([
            'Top 9 values of clientip',
          ]);

          await lens.dragFieldToDimensionTrigger(
            'bytes',
            'lnsDatatable_rows > lns-empty-dimension'
          );
          await expect(lens.getDimensionTriggersLocator('lnsDatatable_rows')).toHaveText([
            'Top 9 values of clientip',
            'bytes',
          ]);
          await lens.dragFieldToDimensionTrigger(
            '@message.raw',
            'lnsDatatable_rows > lns-empty-dimension'
          );
          await expect(lens.getDimensionTriggersLocator('lnsDatatable_rows')).toHaveText([
            'Top 9 values of clientip',
            'bytes',
            'Top 9 values of @message.raw',
          ]);
        });

        await spaceTest.step('reorder table row dimensions', async () => {
          await lens.reorderDimensions('lnsDatatable_rows', 3, 1);
          await lens.waitForVisualization();
          await expect(lens.getDimensionTriggersLocator('lnsDatatable_rows')).toHaveText([
            'Top 9 values of @message.raw',
            'Top 9 values of clientip',
            'bytes',
          ]);
        });

        await spaceTest.step('move column to compatible dimension group on bar chart', async () => {
          await lens.switchToVisualization('bar');
          await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText([
            'Top 9 values of @message.raw',
          ]);
          await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
            'Top 9 values of clientip',
          ]);

          await lens.dragDimensionToDimension({
            from: 'lns-layerPanel-0 > lnsXY_xDimensionPanel > lns-dimensionTrigger',
            to: 'lns-layerPanel-0 > lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          });

          await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveCount(0);
          await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
            'Top 9 values of @message.raw',
          ]);
        });

        await spaceTest.step('move column to non-compatible dimension group', async () => {
          await lens.dragDimensionToDimension({
            from: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
            to: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          });

          await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveCount(
            0
          );
          await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
            'Count of @message.raw',
          ]);
        });

        await spaceTest.step('duplicate column within the same group', async () => {
          await lens.dragDimensionToDimension({
            from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
            to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          });
          await lens.dragDimensionToDimension({
            from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
            to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          });
          await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
            'Count of @message.raw',
            'Count of @message.raw [1]',
            'Count of @message.raw [2]',
          ]);
        });

        await spaceTest.step('move duplicated column to non-compatible group', async () => {
          await lens.dragDimensionToDimension({
            from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
            to: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          });
          await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
            'Count of @message.raw',
            'Count of @message.raw [1]',
          ]);
          await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText([
            'Top 9 values of @message.raw',
          ]);
        });
      }
    );
  }
);
