/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

/**
 * Migrated from FTR `group5/drag_and_drop.ts` (field→workspace + workspace nesting).
 * Cross-layer DnD (`describe.skip('dropping between layers')`) is omitted — not supported
 * with layers-as-tabs (product limitation); do not reintroduce as test.skip.
 */
spaceTest.describe(
  'Lens drag and drop field to workspace',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup();

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('builds a bar chart when dropping a categorical field', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.dragFieldToWorkspace('machine.os.raw', testData.XY_CHART);
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        'Top 9 values of machine.os.raw'
      );
      expect(await lens.getChartSwitchType()).toBe('Bar');
    });

    spaceTest('builds a line chart when dropping a time field', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);
      await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        '@timestamp'
      );
      expect(await lens.getChartSwitchType()).toBe('Line');
    });

    spaceTest(
      'nests time under categorical breakdown and overwrites existing time dimension',
      async ({ pageObjects }) => {
        const { lens } = pageObjects;

        await spaceTest.step(
          'drop time field then clientip; nest time under category',
          async () => {
            await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);
            await lens.dragFieldToWorkspace('clientip', testData.XY_CHART);
            await expect(lens.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')).toHaveText([
              'Top 9 values of clientip',
            ]);
            await lens.openDimensionEditor('lnsXY_splitDimensionPanel > lns-dimensionTrigger');
            expect(await lens.isTopLevelAggregation()).toBe(true);
            await lens.closeDimensionEditor();
          }
        );

        await spaceTest.step(
          'overwrite time dimension with utc_time via field search',
          async () => {
            await lens.searchField('utc');
            await lens.dragFieldToWorkspace('utc_time', testData.XY_CHART);
            await lens.searchField('client');
            await lens.dragFieldToWorkspace('clientip', testData.XY_CHART);
            await expect(lens.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText([
              'utc_time',
            ]);
          }
        );
      }
    );
  }
);
