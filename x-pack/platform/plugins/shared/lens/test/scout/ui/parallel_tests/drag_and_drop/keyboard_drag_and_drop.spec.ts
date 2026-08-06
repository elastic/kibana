/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../../fixtures';

/**
 * Migrated from FTR `group5/drag_and_drop.ts` keyboard DnD journey.
 */
spaceTest.describe('Lens keyboard drag and drop', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('moves fields and dimensions with keyboard drag and drop', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await spaceTest.step('drop a field onto the workspace', async () => {
      await lens.dragFieldWithKeyboard('@timestamp');
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        '@timestamp'
      );
      // Focus lives on document.activeElement — no locator auto-wait.
      await expect
        .poll(async () => lens.getFocusedField())
        .toStrictEqual({
          name: '@timestamp',
          testSubj: 'lnsFieldListPanelField',
        });
    });

    await spaceTest.step('drop fields onto empty and reverse targets', async () => {
      await lens.dragFieldWithKeyboard('bytes', 4);
      await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
        'Count of records',
        'Median of bytes',
      ]);
      await lens.dragFieldWithKeyboard('@message.raw', 1, true);
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
        'Top 9 values of @message.raw',
      ]);
      await expect
        .poll(async () => lens.getFocusedField())
        .toStrictEqual({
          name: '@message.raw',
          testSubj: 'lnsFieldListPanelField',
        });
    });

    await spaceTest.step('replace an existing dimension via keyboard', async () => {
      await lens.dragFieldWithKeyboard('clientip', 1, true);
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
        'Top 9 values of clientip',
      ]);
      await expect
        .poll(async () => lens.getFocusedField())
        .toStrictEqual({
          name: 'clientip',
          testSubj: 'lnsFieldListPanelField',
        });
    });

    await spaceTest.step('duplicate an element in a group', async () => {
      await lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 0, 1);
      await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
        'Count of records',
        'Median of bytes',
        'Count of records [1]',
      ]);
      await expect.poll(async () => lens.getFocusedDimensionLabel()).toBe('Count of records [1]');
    });

    await spaceTest.step('move dimension to compatible dimension', async () => {
      await lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 5);
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveCount(0);
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
        '@timestamp',
      ]);

      await lens.dimensionKeyboardDragDrop('lnsXY_splitDimensionPanel', 0, 5, true);
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText([
        '@timestamp',
      ]);
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveCount(0);
      await expect.poll(async () => lens.getFocusedDimensionLabel()).toBe('@timestamp');
    });

    await spaceTest.step('move dimension to incompatible dimension', async () => {
      await lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 1, 2);
      await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
        'bytes',
      ]);

      await lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 2);
      await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
        'Count of records',
        'Count of @timestamp',
      ]);
      await expect.poll(async () => lens.getFocusedDimensionLabel()).toBe('Count of @timestamp');
    });

    await spaceTest.step('reorder elements with keyboard', async () => {
      await lens.dimensionKeyboardReorder('lnsXY_yDimensionPanel', 0, 1);
      await expect(lens.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
        'Count of @timestamp',
        'Count of records',
      ]);
      await expect.poll(async () => lens.getFocusedDimensionLabel()).toBe('Count of records');
    });
  });
});
