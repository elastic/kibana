/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup } from '../../fixtures';

const XY_CHART = 'xyVisChart';

/**
 * Migrated from FTR `group5/drag_and_drop.ts` basic dimension DnD journey
 * (table drops → reorder → bar moves → duplicate/swap/combine).
 */
spaceTest.describe('Lens drag and drop dimension moves', { tag: tags.stateful.classic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'drops fields onto table dimensions, reorders, moves across groups, and combines',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await spaceTest.step('seed workspace with a time field then switch to table', async () => {
        await lens.dragFieldToWorkspace('@timestamp', XY_CHART);
        await lens.switchToVisualization('lnsDatatable');
      });

      await spaceTest.step('drop fields onto existing and empty dimension triggers', async () => {
        await lens.dragFieldToDimensionTrigger(
          'clientip',
          'lnsDatatable_rows > lns-dimensionTrigger'
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsDatatable_rows'))
          .toBe('Top 9 values of clientip');

        await lens.dragFieldToDimensionTrigger('bytes', 'lnsDatatable_rows > lns-empty-dimension');
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsDatatable_rows', 1))
          .toBe('bytes');
        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsDatatable_rows > lns-empty-dimension'
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsDatatable_rows', 2))
          .toBe('Top 9 values of @message.raw');
      });

      await spaceTest.step('reorder table row dimensions', async () => {
        await lens.reorderDimensions('lnsDatatable_rows', 3, 1);
        await lens.waitForVisualization();
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsDatatable_rows'))
          .toStrictEqual(['Top 9 values of @message.raw', 'Top 9 values of clientip', 'bytes']);
      });

      await spaceTest.step('move column to compatible dimension group on bar chart', async () => {
        await lens.switchToVisualization('bar');
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel'))
          .toStrictEqual(['Top 9 values of @message.raw']);
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel'))
          .toStrictEqual(['Top 9 values of clientip']);

        await lens.dragDimensionToDimension({
          from: 'lns-layerPanel-0 > lnsXY_xDimensionPanel > lns-dimensionTrigger',
          to: 'lns-layerPanel-0 > lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        });

        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel'))
          .toStrictEqual([]);
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel'))
          .toStrictEqual(['Top 9 values of @message.raw']);
      });

      await spaceTest.step('move column to non-compatible dimension group', async () => {
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel'))
          .toStrictEqual(['Top 9 values of @message.raw']);

        await lens.dragDimensionToDimension({
          from: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        });

        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel'))
          .toStrictEqual([]);
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toStrictEqual(['Count of @message.raw']);
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
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toStrictEqual([
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
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toStrictEqual(['Count of @message.raw', 'Count of @message.raw [1]']);
        await expect
          .poll(async () => lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel'))
          .toStrictEqual(['Top 9 values of @message.raw']);
      });

      await spaceTest.step('duplicate and swap via secondary drop targets', async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
        await lens.switchToVisualization('bar');
        await lens.dragFieldToWorkspace('@timestamp', XY_CHART);

        await lens.dragDimensionToExtraDropType(
          'lnsXY_xDimensionPanel > lns-dimensionTrigger',
          'lnsXY_splitDimensionPanel',
          'duplicate',
          XY_CHART
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
          .toBe('@timestamp [1]');
        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_yDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_yDimensionPanel',
          'swap',
          XY_CHART
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_yDimensionPanel'))
          .toBe('Count of @timestamp');
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
          .toBe('Top 9 values of @message.raw');
      });

      await spaceTest.step('combine breakdown with horizontal dimension', async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
        await lens.dragFieldToWorkspace('clientip', XY_CHART);
        await lens.dragFieldToWorkspace('@message.raw', XY_CHART);

        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          XY_CHART
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_xDimensionPanel'))
          .toBe('Top values of clientip + 1 other');
      });

      await spaceTest.step('combine field onto existing horizontal dimension', async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
        await lens.dragFieldToWorkspace('clientip', XY_CHART);

        await lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          XY_CHART
        );
        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_xDimensionPanel'))
          .toBe('Top values of clientip + 1 other');
      });

      await spaceTest.step('combine two multi-terms dimensions', async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
        await lens.dragFieldToWorkspace('clientip', XY_CHART);

        await lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          XY_CHART
        );

        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_splitDimensionPanel > lns-empty-dimension'
        );
        await lens.dragFieldToExtraDropType(
          'geo.src',
          'lnsXY_splitDimensionPanel',
          'combine',
          XY_CHART
        );
        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          XY_CHART
        );

        await expect
          .poll(async () => lens.getDimensionTriggerText('lnsXY_xDimensionPanel'))
          .toBe('Top values of clientip + 2 others');
      });
    }
  );
});
