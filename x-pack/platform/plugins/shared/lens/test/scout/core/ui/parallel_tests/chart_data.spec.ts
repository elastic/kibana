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
    // Exact aggregation floats belong off UI; assert structural render parity across types.
    spaceTest(
      'renders the same terms + average config across chart types',
      async ({ pageObjects }) => {
        // Multi-visualization switches exceed the default 60s parallel timeout under load.
        spaceTest.setTimeout(120_000);
        const { lens } = pageObjects;
        let baselineXLabels: string[] = [];

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
          baselineXLabels = barXLabels(data);
          expect(baselineXLabels).toHaveLength(6);
          expect(baselineXLabels).toContain('Other');
          expect(data.bars?.[0]?.bars.every((bar) => typeof bar.y === 'number' && bar.y > 0)).toBe(
            true
          );
        });

        await spaceTest.step('pie chart', async () => {
          await lens.switchToVisualization('pie');
          await lens.waitForVisualization('partitionVisChart');
          const names = partitionNames(
            await lens.workspace.getCurrentChartDebugState('partitionVisChart')
          );
          expect(names).toHaveLength(6);
          // Partition "other" uses __other__; XY uses Other — compare non-other cardinality.
          expect(names.filter((name) => name !== '__other__')).toHaveLength(5);
        });

        await spaceTest.step('donut chart', async () => {
          await lens.style.setDonutHoleSize('Large');
          const data = await lens.workspace.getCurrentChartDebugState('partitionVisChart');
          expect(partitionNames(data)).toHaveLength(6);
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
          ).toHaveLength(6);
        });

        await spaceTest.step('heatmap chart', async () => {
          await lens.switchToVisualization('heatmap', { search: 'heat' });
          await lens.waitForVisualization('heatmapChart');
          const debugState = await lens.workspace.getCurrentChartDebugState('heatmapChart');
          expect(debugState.axes?.x[0].labels).toStrictEqual(baselineXLabels);
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
          expect(terms).toStrictEqual(baselineXLabels);
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
