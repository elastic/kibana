/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

function partitionNames(state: DebugState | undefined): string[] {
  return (
    state?.partition?.[0]?.partitions
      .map((partition) => partition.name)
      .sort((a, b) => a.localeCompare(b)) ?? []
  );
}

function barXLabels(state: DebugState | undefined): string[] {
  return state?.bars?.[0]?.bars.map((bar) => String(bar.x)) ?? [];
}

// FTR chart_data.ts category names (logstash archive); skip exact aggregation floats in UI.
const EXPECTED_XY_CATEGORIES = [
  '97.220.3.248',
  '169.228.188.120',
  '78.83.247.30',
  '226.82.228.233',
  '93.28.27.24',
  'Other',
];

// Partition charts use __other__ instead of Other; partitionNames() sorts alphabetically.
const EXPECTED_PARTITION_CATEGORIES = EXPECTED_XY_CATEGORIES.map((name) =>
  name === 'Other' ? '__other__' : name
).sort((a, b) => a.localeCompare(b));

spaceTest.describe(
  'Lens chart data across visualization types',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      enableChartDebug: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    // One journey: chart-type switches share the same dimension config (FTR chart_data.ts).
    // Assert known category names; exact aggregation floats belong off UI.
    spaceTest(
      'renders the same terms + average config across chart types',
      async ({ pageObjects }) => {
        // Multi-visualization switches exceed the default 60s parallel timeout under load.
        spaceTest.setTimeout(120_000);
        const { lens } = pageObjects;

        await spaceTest.step('configure terms of ip and average of bytes', async () => {
          await lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'terms',
            field: 'ip',
            keepOpen: true,
          });
          await lens.dimensions.setTermsNumberOfValues(5);
          await lens.closeDimensionEditor();
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });
        });

        await spaceTest.step('xy bar chart', async () => {
          const data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
          expect(barXLabels(data)).toStrictEqual(EXPECTED_XY_CATEGORIES);
          expect(data.bars?.[0]?.bars.every((bar) => typeof bar.y === 'number' && bar.y > 0)).toBe(
            true
          );
        });

        await spaceTest.step('pie chart', async () => {
          await lens.switchToVisualization('pie');
          await lens.waitForVisualization('partitionVisChart');
          expect(
            partitionNames(await lens.workspace.getCurrentChartDebugState('partitionVisChart'))
          ).toStrictEqual(EXPECTED_PARTITION_CATEGORIES);
        });

        await spaceTest.step('donut chart', async () => {
          await lens.style.setDonutHoleSize('Large');
          expect(
            partitionNames(await lens.workspace.getCurrentChartDebugState('partitionVisChart'))
          ).toStrictEqual(EXPECTED_PARTITION_CATEGORIES);
          expect(await lens.style.getDonutHoleSize()).toBe('Large');
          await lens.style.closeFlyoutWithBackButton();
          // Style flyout close can remount the partition chart; wait before chart-type switch.
          await lens.waitForVisualization('partitionVisChart');
        });

        await spaceTest.step('treemap chart', async () => {
          await lens.switchToVisualization('treemap', { search: 'treemap' });
          await lens.waitForVisualization('partitionVisChart');
          expect(
            partitionNames(await lens.workspace.getCurrentChartDebugState('partitionVisChart'))
          ).toStrictEqual(EXPECTED_PARTITION_CATEGORIES);
        });

        await spaceTest.step('heatmap chart', async () => {
          await lens.switchToVisualization('heatmap', { search: 'heat' });
          await lens.waitForVisualization('heatmapChart');
          const debugState = await lens.workspace.getCurrentChartDebugState('heatmapChart');
          expect(debugState.axes?.x[0].labels).toStrictEqual(EXPECTED_XY_CATEGORIES);
          expect(debugState.axes?.y[0].labels).toStrictEqual(['']);
          expect(debugState.heatmap?.cells.length).toBe(6);
          expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        });

        await spaceTest.step('datatable', async () => {
          await lens.switchToVisualization('lnsDatatable');
          await lens.waitForVisualization();
          const terms: string[] = [];
          const values: number[] = [];
          for (let index = 0; index < 6; index++) {
            terms.push(await lens.datatable.getCellText(index, 0));
            const raw = await lens.datatable.getCellText(index, 1);
            values.push(Number(raw.replace(/,/g, '')));
          }
          expect(terms).toStrictEqual(EXPECTED_XY_CATEGORIES);
          expect(values.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
        });

        await spaceTest.step('legacy metric', async () => {
          await lens.switchToVisualization('lnsLegacyMetric');
          await lens.waitForVisualization('legacyMtrVis');
          const metric = await lens.metric.getLegacyMetricData();
          expect(metric.title).toBe('Average of bytes');
          expect(Number(metric.value.replace(/,/g, ''))).toBeGreaterThan(0);
        });
      }
    );
  }
);
