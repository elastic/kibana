/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { DebugState } from '@elastic/charts';
import { FtrService } from '../../ftr_provider_context';

const partitionVisChartSelector = 'partitionVisChart';

export class PieChartService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly panelActions = this.ctx.getService('dashboardPanelActions');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly defaultFindTimeout = this.config.get('timeouts.find');
  private readonly visChart = this.ctx.getPageObject('visChart');

  private readonly filterActionText = 'Apply filter to current view';

  async clickOnPieSlice(name?: string) {
    this.log.debug(`PieChart.clickOnPieSlice(${name})`);

    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    let sliceLabel = name || slices[0].name;
    if (name === 'Other') {
      sliceLabel = '__other__';
    }
    const pieSlice = slices.find((slice) => String(slice.name) === sliceLabel);
    const pie = await this.testSubjects.find(partitionVisChartSelector);
    if (pieSlice) {
      const pieSize = await pie.getSize();
      const pieHeight = pieSize.height;
      const pieWidth = pieSize.width;
      await pie.clickMouseButton({
        xOffset: pieSlice.coords[0] - Math.floor(pieWidth / 2),
        yOffset: pieSlice.coords[1] - Math.floor(pieHeight / 2),
      });
    }
  }

  async filterOnPieSlice(name?: string) {
    this.log.debug(`PieChart.filterOnPieSlice(${name})`);
    await this.clickOnPieSlice(name);
    const hasUiActionsPopup = await this.testSubjects.exists('multipleActionsContextMenu');
    if (hasUiActionsPopup) {
      const actionElement = await this.panelActions.getActionWebElementByText(
        this.filterActionText
      );
      await actionElement.click();
    }
  }

  async filterByLegendItem(label: string) {
    this.log.debug(`PieChart.filterByLegendItem(${label})`);
    await this.testSubjects.click(`legend-${label}`);
    await this.testSubjects.click(`legend-${label}-filterIn`);
  }

  async getPieSlice(name: string) {
    return await this.testSubjects.find(`pieSlice-${name.split(' ').join('-')}`);
  }

  async getAllPieSlices(name: string) {
    return await this.testSubjects.findAll(`pieSlice-${name.split(' ').join('-')}`);
  }

  async getSelectedSlice(name: string) {
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    return slices.filter((slice) => {
      return slice.name.toString() === name.replace(',', '');
    });
  }

  async getPieSliceStyle(name: string) {
    this.log.debug(`VisualizePage.getPieSliceStyle(${name})`);
    const selectedSlice = await this.getSelectedSlice(name);
    return selectedSlice[0]?.color;
  }

  async getAllPieSlicesColors() {
    const slicesColors = [];
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    for (const slice of slices) {
      slicesColors.push(slice.color);
    }
    return slicesColors;
  }

  async getAllPieSliceColor(name: string) {
    this.log.debug(`VisualizePage.getAllPieSliceColor(${name})`);
    const selectedSlice = await this.getSelectedSlice(name);
    return selectedSlice.map((slice) => slice.color);
  }

  async getPieChartData() {
    const chartTypes = await this.find.allByCssSelector('path.slice', this.defaultFindTimeout * 2);
    return await Promise.all(chartTypes.map(async (chart) => await chart.getAttribute('d')));
  }

  async expectPieChartTableData(expectedTableData: Array<[]>) {
    await this.inspector.open();
    await this.inspector.setTablePageSize(50);
    await this.inspector.expectTableData(expectedTableData);
  }

  async getPieChartLabels() {
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    return slices.map((slice) => {
      if (slice.name === '__missing__') {
        return 'Missing';
      } else if (slice.name === '__other__') {
        return 'Other';
      } else if (typeof slice.name === 'number') {
        // debugState of escharts returns the numbers without comma
        const val = slice.name as number;
        return val.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
      } else {
        return slice.name;
      }
    });
  }

  async getPieChartValues() {
    this.log.debug('PieChart.getPieChartValues');
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    return slices.map((slice) => {
      return slice.value;
    });
  }

  async getPieSliceCount() {
    this.log.debug('PieChart.getPieSliceCount');
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    return slices?.length;
  }

  async getSliceCountForAllPies() {
    this.log.debug('PieChart.getSliceCountForAllPies');
    let pieSlices = 0;
    const charts =
      (await this.visChart.getAllESChartsDebugDataByTestSubj(partitionVisChartSelector)) ?? [];
    this.log.debug(`Found ${charts.length} charts`);
    for (const chart of charts) {
      await chart.moveMouseTo();
      const pieChartData = await this.elasticChart.getChartDebugDataFromChart(chart);
      const slices = this.getSlices(pieChartData);
      pieSlices += slices.length;
    }
    return pieSlices;
  }

  getSlices(pieChartData: DebugState) {
    return pieChartData?.partition?.[0]?.partitions ?? [];
  }

  async expectPieSliceCountEsCharts(expectedCount: number) {
    const slices = this.getSlices(
      await this.visChart.getEsChartDebugState(partitionVisChartSelector)
    );
    expect(slices.length).to.be(expectedCount);
  }

  async expectPieSliceCount(expectedCount: number) {
    this.log.debug(`PieChart.expectPieSliceCount(${expectedCount})`);
    await this.retry.try(async () => {
      const slicesCount = await this.getPieSliceCount();
      expect(slicesCount).to.be(expectedCount);
    });
  }

  async expectSliceCountForAllPies(expectedCount: number) {
    await this.retry.try(async () => {
      const slicesCount = await this.getSliceCountForAllPies();
      expect(slicesCount).to.be(expectedCount);
    });
  }

  async expectEmptyPieChart() {
    const noResult = await this.testSubjects.exists('partitionVisEmptyValues');
    expect(noResult).to.be(true);
  }

  async expectPieChartLabels(expectedLabels: string[]) {
    this.log.debug(`PieChart.expectPieChartLabels(${expectedLabels.join(',')})`);
    await this.retry.try(async () => {
      const pieData = await this.getPieChartLabels();
      expect(pieData.sort()).to.eql(expectedLabels);
    });
  }
}
