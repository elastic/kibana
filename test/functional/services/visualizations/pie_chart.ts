/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function PieChartProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const defaultFindTimeout = config.get('timeouts.find');
  const panelActions = getService('dashboardPanelActions');

  return new (class PieChart {
    private readonly filterActionText = 'Apply filter to current view';

    async clickOnPieSlice(name?: string) {
      log.debug(`PieChart.clickOnPieSlice(${name})`);
      if (name) {
        await testSubjects.click(`pieSlice-${name.split(' ').join('-')}`);
      } else {
        // If no pie slice has been provided, find the first one available.
        await retry.try(async () => {
          const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice');
          log.debug('Slices found:' + slices.length);
          return slices[0].click();
        });
      }
    }

    async filterOnPieSlice(name?: string) {
      log.debug(`PieChart.filterOnPieSlice(${name})`);
      await this.clickOnPieSlice(name);
      const hasUiActionsPopup = await testSubjects.exists('multipleActionsContextMenu');
      if (hasUiActionsPopup) {
        const actionElement = await panelActions.getActionWebElementByText(this.filterActionText);
        await actionElement.click();
      }
    }

    async filterByLegendItem(label: string) {
      log.debug(`PieChart.filterByLegendItem(${label})`);
      await testSubjects.click(`legend-${label}`);
      await testSubjects.click(`legend-${label}-filterIn`);
    }

    async getPieSlice(name: string) {
      return await testSubjects.find(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getAllPieSlices(name: string) {
      return await testSubjects.findAll(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getPieSliceStyle(name: string) {
      log.debug(`VisualizePage.getPieSliceStyle(${name})`);
      const pieSlice = await this.getPieSlice(name);
      return await pieSlice.getAttribute('style');
    }

    async getAllPieSliceStyles(name: string) {
      log.debug(`VisualizePage.getAllPieSliceStyles(${name})`);
      const pieSlices = await this.getAllPieSlices(name);
      return await Promise.all(
        pieSlices.map(async (pieSlice) => await pieSlice.getAttribute('style'))
      );
    }

    async getPieChartData() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);
      return await Promise.all(chartTypes.map(async (chart) => await chart.getAttribute('d')));
    }

    async expectPieChartTableData(expectedTableData: Array<[]>) {
      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    }

    async getPieChartLabels() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);
      return await Promise.all(
        chartTypes.map(async (chart) => await chart.getAttribute('data-label'))
      );
    }

    async getPieSliceCount() {
      log.debug('PieChart.getPieSliceCount');
      const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice');
      return slices.length;
    }

    async expectPieSliceCount(expectedCount: number) {
      log.debug(`PieChart.expectPieSliceCount(${expectedCount})`);
      await retry.try(async () => {
        const slicesCount = await this.getPieSliceCount();
        expect(slicesCount).to.be(expectedCount);
      });
    }

    async expectPieChartLabels(expectedLabels: string[]) {
      log.debug(`PieChart.expectPieChartLabels(${expectedLabels.join(',')})`);
      await retry.try(async () => {
        const pieData = await this.getPieChartLabels();
        expect(pieData).to.eql(expectedLabels);
      });
    }
  })();
}
