/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { isNil } from 'lodash';
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
  private readonly defaultFindTimeout = this.config.get('timeouts.find');
  private readonly visChart = this.ctx.getPageObject('visChart');

  private readonly filterActionText = 'Apply filter to current view';

  async clickOnPieSlice(name?: string) {
    this.log.debug(`PieChart.clickOnPieSlice(${name})`);
    if (await this.visChart.isNewLibraryChart(partitionVisChartSelector)) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
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
    } else {
      if (name) {
        await this.testSubjects.click(`pieSlice-${name.split(' ').join('-')}`);
      } else {
        // If no pie slice has been provided, find the first one available.
        await this.retry.try(async () => {
          const slices = await this.find.allByCssSelector('svg > g > g.arcs > path.slice');
          this.log.debug('Slices found:' + slices.length);
          return slices[0].click();
        });
      }
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

  async getPieSliceStyle(name: string) {
    this.log.debug(`VisualizePage.getPieSliceStyle(${name})`);
    if (await this.visChart.isNewLibraryChart(partitionVisChartSelector)) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
      const selectedSlice = slices.filter((slice) => {
        return slice.name.toString() === name.replace(',', '');
      });
      return selectedSlice[0]?.color;
    }
    const pieSlice = await this.getPieSlice(name);
    return await pieSlice.getAttribute('style');
  }

  async getAllPieSlicesColors() {
    const slicesColors = [];
    const slices =
      (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
        ?.partitions ?? [];
    for (const slice of slices) {
      slicesColors.push(slice.color);
    }
    return slicesColors;
  }

  async getAllPieSliceColor(name: string) {
    this.log.debug(`VisualizePage.getAllPieSliceColor(${name})`);
    if (await this.visChart.isNewLibraryChart(partitionVisChartSelector)) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
      const selectedSlice = slices.filter((slice) => {
        return slice.name.toString() === name.replace(',', '');
      });
      return selectedSlice.map((slice) => slice.color);
    }
    const pieSlices = await this.getAllPieSlices(name);
    const slicesStyles = await Promise.all(
      pieSlices.map(async (pieSlice) => await pieSlice.getAttribute('style'))
    );
    return slicesStyles
      .map(
        (styles) =>
          styles.split(';').reduce<Record<string, string>>((styleAsObj, style) => {
            const stylePair = style.split(':');
            if (stylePair.length !== 2) {
              return styleAsObj;
            }
            styleAsObj[stylePair[0].trim()] = stylePair[1].trim();
            return styleAsObj;
          }, {}).fill // in vislib the color is available on the `fill` style prop
      )
      .filter((d) => !isNil(d));
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

  async getPieChartLabels(isNewLibrary: boolean = true) {
    if (isNewLibrary) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
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
    const chartTypes = await this.find.allByCssSelector('path.slice', this.defaultFindTimeout * 2);
    return await Promise.all(
      chartTypes.map(async (chart) => await chart.getAttribute('data-label'))
    );
  }

  async getPieChartValues(isNewLibrary: boolean = true) {
    this.log.debug('PieChart.getPieChartValues');
    if (isNewLibrary) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
      return slices.map((slice) => {
        return slice.value;
      });
    }
    const chartTypes = await this.find.allByCssSelector('path.slice', this.defaultFindTimeout * 2);
    return await Promise.all(
      chartTypes.map(async (chart) => await chart.getAttribute('data-value'))
    );
  }

  async getPieSliceCount(isNewLibrary: boolean = true) {
    this.log.debug('PieChart.getPieSliceCount');
    if (isNewLibrary) {
      const slices =
        (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
          ?.partitions ?? [];
      return slices?.length;
    }
    const slices = await this.find.allByCssSelector('svg > g > g.arcs > path.slice');
    return slices.length;
  }

  async getSliceCountForAllPies() {
    this.log.debug('PieChart.getSliceCountForAllPies');
    let pieSlices = 0;
    const charts =
      (await this.visChart.getAllESChartsDebugDataByTestSubj(partitionVisChartSelector)) ?? [];
    this.log.debug(`Found ${charts.length} charts`);
    for (const chart of charts) {
      await chart.moveMouseTo();
      const visContainer = await chart.findByCssSelector('.echChartStatus');
      const debugDataString: string | undefined = await visContainer.getAttribute(
        'data-ech-debug-state'
      );
      if (debugDataString) {
        const parsedData = JSON.parse(debugDataString);
        const partition = parsedData?.partition?.[0] ?? [];
        pieSlices += partition.partitions.length;
      }
    }
    return pieSlices;
  }

  async expectPieSliceCountEsCharts(expectedCount: number) {
    const slices =
      (await this.visChart.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]
        ?.partitions ?? [];
    expect(slices.length).to.be(expectedCount);
  }

  async expectPieSliceCount(expectedCount: number, isNewLibrary: boolean = true) {
    this.log.debug(`PieChart.expectPieSliceCount(${expectedCount})`);
    await this.retry.try(async () => {
      const slicesCount = await this.getPieSliceCount(isNewLibrary);
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

  async expectPieChartLabels(expectedLabels: string[], isNewLibrary: boolean = true) {
    this.log.debug(`PieChart.expectPieChartLabels(${expectedLabels.join(',')})`);
    await this.retry.try(async () => {
      const pieData = await this.getPieChartLabels(isNewLibrary);
      expect(pieData.sort()).to.eql(expectedLabels);
    });
  }
}
