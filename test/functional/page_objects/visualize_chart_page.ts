/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import chroma from 'chroma-js';

import { FtrService } from '../ftr_provider_context';

const partitionVisChartSelector = 'partitionVisChart';
const heatmapChartSelector = 'heatmapChart';

export class VisualizeChartPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly config = this.ctx.getService('config');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly dataGrid = this.ctx.getService('dataGrid');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  public async getEsChartDebugState(chartSelector: string) {
    return await this.elasticChart.getChartDebugData(chartSelector);
  }

  /**
   * Is new charts library advanced setting enabled
   */
  public async isNewChartsLibraryEnabled(
    setting = 'visualization:visualize:legacyPieChartsLibrary'
  ): Promise<boolean> {
    const legacyChartsLibrary = Boolean(await this.kibanaServer.uiSettings.get(setting)) ?? true;
    const enabled = !legacyChartsLibrary;
    this.log.debug(`-- isNewChartsLibraryEnabled = ${enabled}`);

    return enabled;
  }

  /**
   * Is new charts library enabled and an area, line or histogram chart exists
   */
  public async isNewLibraryChart(chartSelector: string): Promise<boolean> {
    const enabled = await this.isNewChartsLibraryEnabled();

    if (!enabled) {
      this.log.debug(`-- isNewLibraryChart = false`);
      return false;
    }

    // check if enabled but not a line, area, histogram or pie chart
    if (await this.find.existsByCssSelector('.visLib__chart', 1)) {
      const chart = await this.find.byCssSelector('.visLib__chart');
      const chartType = await chart.getAttribute('data-vislib-chart-type');

      if (!['line', 'area', 'histogram', 'pie'].includes(chartType)) {
        this.log.debug(`-- isNewLibraryChart = false`);
        return false;
      }
    }

    if (!(await this.elasticChart.hasChart(chartSelector, 1))) {
      // not be a vislib chart type
      this.log.debug(`-- isNewLibraryChart = false`);
      return false;
    }

    this.log.debug(`-- isNewLibraryChart = true`);
    return true;
  }

  public async getYAxisTitle(selector: string) {
    const xAxis = (await this.getEsChartDebugState(selector))?.axes?.y ?? [];
    return xAxis[0]?.title;
  }

  public async getXAxisLabels(selector: string) {
    const [xAxis] = (await this.getEsChartDebugState(selector))?.axes?.x ?? [];
    return xAxis?.labels;
  }

  public async getYAxisLabels(selector: string, nth = 0) {
    const yAxis = (await this.getEsChartDebugState(selector))?.axes?.y ?? [];
    return yAxis[nth]?.labels;
  }

  public async getYAxisLabelsAsNumbers(selector: string) {
    const [yAxis] = (await this.getEsChartDebugState(selector))?.axes?.y ?? [];
    return yAxis?.values;
  }

  /**
   * Gets the chart data and scales it based on chart height and label.
   * @param dataLabel data-label value
   * @param selector  chart selector
   * @param shouldContainXAxisData boolean value for mapping points, false by default
   *
   * Returns an array of height values
   */
  public async getAreaChartData(
    dataLabel: string,
    selector: string,
    shouldContainXAxisData = false
  ) {
    const areas = (await this.getEsChartDebugState(selector))?.areas ?? [];
    const points = areas.find(({ name }) => name === dataLabel)?.lines.y1.points ?? [];
    return shouldContainXAxisData ? points.map(({ x, y }) => [x, y]) : points.map(({ y }) => y);
  }

  /**
   * Returns the paths that compose an area chart.
   * @param dataLabel data-label value
   */
  public async getAreaChartPaths(dataLabel: string, selector: string) {
    const areas = (await this.getEsChartDebugState(selector))?.areas ?? [];
    const path = areas.find(({ name }) => name === dataLabel)?.path ?? '';
    return path.split('L');
  }

  /**
   * Gets the dots and normalizes their height.
   * @param dataLabel data-label value
   * @param axis axis value, 'ValueAxis-1' by default
   */
  public async getLineChartData(selector: string, dataLabel = 'Count') {
    // For now lines are rendered as areas to enable stacking
    const areas = (await this.getEsChartDebugState(selector))?.areas ?? [];
    const lines = areas.map(({ lines: { y1 }, name, color }) => ({ ...y1, name, color }));
    const points = lines.find(({ name }) => name === dataLabel)?.points ?? [];
    return points.map(({ y }) => y);
  }

  /**
   * Returns bar chart data in pixels
   * @param dataLabel data-label value
   */
  public async getBarChartData(selector: string, dataLabel = 'Count') {
    const bars = (await this.getEsChartDebugState(selector))?.bars ?? [];
    const values = bars.find(({ name }) => name === dataLabel)?.bars ?? [];
    return values.map(({ y }) => y);
  }

  private async toggleLegend(force = false) {
    const isVisTypePieChart = await this.isNewLibraryChart(partitionVisChartSelector);
    const legendSelector = force || isVisTypePieChart ? '.echLegend' : '.visLegend';

    await this.retry.try(async () => {
      const isVisible = await this.find.existsByCssSelector(legendSelector);
      if (!isVisible) {
        await this.testSubjects.click('vislibToggleLegend');
      }
    });
  }

  public async filterLegend(name: string, force = false) {
    await this.toggleLegend(force);
    await this.testSubjects.click(`legend-${name}`);
    const filterIn = await this.testSubjects.find(`legend-${name}-filterIn`);
    await filterIn.click();
    await this.waitForVisualizationRenderingStabilized();
  }

  public async doesLegendColorChoiceExist(color: string) {
    return await this.testSubjects.exists(`visColorPickerColor-${color}`);
  }

  public async selectNewLegendColorChoice(color: string) {
    await this.testSubjects.click(`visColorPickerColor-${color}`);
  }

  public async doesSelectedLegendColorExistForXY(color: string, selector: string) {
    const items = (await this.getEsChartDebugState(selector))?.legend?.items ?? [];
    return items.some(({ color: c }) => c === color);
  }

  public async doesSelectedLegendColorExistForPie(matchingColor: string) {
    if (await this.isNewLibraryChart(partitionVisChartSelector)) {
      const hexMatchingColor = chroma(matchingColor).hex().toUpperCase();
      const slices =
        (await this.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]?.partitions ??
        [];
      return slices.some(({ color }) => {
        return hexMatchingColor === chroma(color).hex().toUpperCase();
      });
    }

    return await this.testSubjects.exists(`legendSelectedColor-${matchingColor}`);
  }

  public async expectError() {
    if (!this.isNewLibraryChart(partitionVisChartSelector)) {
      await this.testSubjects.existOrFail('vislibVisualizeError');
    }
  }

  public async getVisualizationRenderingCount() {
    const visualizationLoader = await this.testSubjects.find('visualizationLoader');
    const renderingCount = await visualizationLoader.getAttribute('data-rendering-count');
    return Number(renderingCount);
  }

  public async waitForRenderingCount(minimumCount = 1) {
    await this.retry.waitFor(
      `rendering count to be greater than or equal to [${minimumCount}]`,
      async () => {
        const currentRenderingCount = await this.getVisualizationRenderingCount();
        this.log.debug(`-- currentRenderingCount=${currentRenderingCount}`);
        this.log.debug(`-- expectedCount=${minimumCount}`);
        return currentRenderingCount >= minimumCount;
      }
    );
  }

  public async waitForVisualizationRenderingStabilized() {
    await this.header.waitUntilLoadingHasFinished();
    // assuming rendering is done when data-rendering-count is constant within 1000 ms
    await this.retry.waitFor('rendering count to stabilize', async () => {
      const firstCount = await this.getVisualizationRenderingCount();
      this.log.debug(`-- firstCount=${firstCount}`);

      await this.common.sleep(2000);

      const secondCount = await this.getVisualizationRenderingCount();
      this.log.debug(`-- secondCount=${secondCount}`);

      return firstCount === secondCount;
    });
  }

  public async waitForVisualization() {
    await this.waitForVisualizationRenderingStabilized();
  }

  public async getLegendEntriesXYCharts(selector: string) {
    const items = (await this.getEsChartDebugState(selector))?.legend?.items ?? [];
    return items.map(({ name }) => name);
  }

  public async getLegendEntries() {
    const isVisTypePieChart = await this.isNewLibraryChart(partitionVisChartSelector);
    const isVisTypeHeatmapChart = await this.isNewLibraryChart(heatmapChartSelector);

    if (isVisTypePieChart) {
      const slices =
        (await this.getEsChartDebugState(partitionVisChartSelector))?.partition?.[0]?.partitions ??
        [];
      return slices.map(({ name }) => name);
    }

    if (isVisTypeHeatmapChart) {
      const legendItems =
        (await this.getEsChartDebugState(heatmapChartSelector))?.legend?.items ?? [];
      return legendItems.map(({ name }) => name);
    }

    const legendEntries = await this.find.allByCssSelector(
      '.visLegend__button',
      this.defaultFindTimeout * 2
    );
    return await Promise.all(
      legendEntries.map(async (chart) => await chart.getAttribute('data-label'))
    );
  }

  public async openLegendOptionColorsForXY(name: string, chartSelector: string) {
    await this.waitForVisualizationRenderingStabilized();
    await this.retry.try(async () => {
      const chart = await this.find.byCssSelector(chartSelector);
      const legendItemColor = await chart.findByCssSelector(
        `[data-ech-series-name="${name}"] .echLegendItem__color`
      );
      legendItemColor.click();

      await this.waitForVisualizationRenderingStabilized();
      // arbitrary color chosen, any available would do
      const arbitraryColor = '#d36086';
      const isOpen = await this.doesLegendColorChoiceExist(arbitraryColor);
      if (!isOpen) {
        throw new Error('legend color selector not open');
      }
    });
  }

  public async openLegendOptionColorsForPie(name: string, chartSelector: string) {
    await this.waitForVisualizationRenderingStabilized();
    await this.retry.try(async () => {
      if (await this.isNewLibraryChart(partitionVisChartSelector)) {
        const chart = await this.find.byCssSelector(chartSelector);
        const legendItemColor = await chart.findByCssSelector(
          `[data-ech-series-name="${name}"] .echLegendItem__color`
        );
        legendItemColor.click();
      } else {
        // This click has been flaky in opening the legend, hence the this.retry.  See
        // https://github.com/elastic/kibana/issues/17468
        await this.testSubjects.click(`legend-${name}`);
      }

      await this.waitForVisualizationRenderingStabilized();
      // arbitrary color chosen, any available would do
      const arbitraryColor = '#EF843C';
      const isOpen = await this.doesLegendColorChoiceExist(arbitraryColor);
      if (!isOpen) {
        throw new Error('legend color selector not open');
      }
    });
  }

  public async filterOnTableCell(columnIndex: number, rowIndex: number) {
    await this.retry.try(async () => {
      const cell = await this.dataGrid.getCellElement(rowIndex, columnIndex);
      await cell.click();
      const filterBtn = await this.testSubjects.findDescendant(
        'tbvChartCell__filterForCellValue',
        cell
      );
      await this.common.sleep(2000);
      filterBtn.click();
    });
  }

  public async getMarkdownText() {
    const markdownContainer = await this.testSubjects.find('markdownBody');
    return markdownContainer.getVisibleText();
  }

  public async getMarkdownBodyDescendentText(selector: string) {
    const markdownContainer = await this.testSubjects.find('markdownBody');
    const element = await this.find.descendantDisplayedByCssSelector(selector, markdownContainer);
    return element.getVisibleText();
  }

  // Table visualization

  public async getTableVisNoResult() {
    return await this.testSubjects.find('tbvChartContainer>visNoResult');
  }

  /**
   * This function returns the text displayed in the Table Vis header
   */
  public async getTableVisHeader() {
    return await this.testSubjects.getVisibleText('dataGridHeader');
  }

  public async getFieldLinkInVisTable(
    fieldName: string,
    rowIndex: number = 0,
    colIndex: number = 0
  ) {
    const cell = await this.dataGrid.getCellElement(rowIndex, colIndex);
    return await cell.findByTagName('a');
  }

  /**
   * Function to retrieve data from within a table visualization.
   */
  public async getTableVisContent({ stripEmptyRows = true } = {}) {
    return await this.retry.try(async () => {
      const container = await this.testSubjects.find('tbvChart');
      const allTables = await this.testSubjects.findAllDescendant('euiDataGridBody', container);

      if (allTables.length === 0) {
        return [];
      }

      const allData = await Promise.all(
        allTables.map(async (t) => {
          let data = await this.dataGrid.getDataFromElement(t, 'tbvChartCellContent');
          if (stripEmptyRows) {
            data = data.filter(
              (row) => row.length > 0 && row.some((cell) => cell.trim().length > 0)
            );
          }
          return data;
        })
      );

      if (allTables.length === 1) {
        // If there was only one table we return only the data for that table
        // This prevents an unnecessary array around that single table, which
        // is the case we have in most tests.
        return allData[0];
      }

      return allData;
    });
  }

  public async getMetric() {
    const elements = await this.find.allByCssSelector(
      '[data-test-subj="visualizationLoader"] .mtrVis__container'
    );
    const values = await Promise.all(
      elements.map(async (element) => {
        const text = await element.getVisibleText();
        return text;
      })
    );
    return values
      .filter((item) => item.length > 0)
      .reduce((arr: string[], item) => arr.concat(item.split('\n')), []);
  }

  public async getGaugeValue() {
    const elements = await this.find.allByCssSelector(
      '[data-test-subj="visualizationLoader"] .chart svg text'
    );
    const values = await Promise.all(
      elements.map(async (element) => {
        const text = await element.getVisibleText();
        return text;
      })
    );
    return values.filter((item) => item.length > 0);
  }

  public async getAxesCountByPosition(
    axesPosition: typeof Position[keyof typeof Position],
    selector: string
  ) {
    const yAxes = (await this.getEsChartDebugState(selector))?.axes?.y ?? [];
    return yAxes.filter(({ position }) => position === axesPosition).length;
  }

  public async clickOnGaugeByLabel(label: string) {
    const gauge = await this.testSubjects.find(`visGauge__meter--${label}`);
    const gaugeSize = await gauge.getSize();
    const gaugeHeight = gaugeSize.height;
    // To click at Gauge arc instead of the center of SVG element
    // the offset for a click is calculated as half arc height without 1 pixel
    const yOffset = 1 - Math.floor(gaugeHeight / 2);

    await gauge.clickMouseButton({ xOffset: 0, yOffset });
  }

  public async getAreaSeriesCount(selector: string) {
    const areas = (await this.getEsChartDebugState(selector))?.areas ?? [];
    return areas.filter((area) => area.lines.y1.visible).length;
  }

  public async getHistogramSeriesCount(selector: string) {
    const bars = (await this.getEsChartDebugState(selector))?.bars ?? [];
    return bars.filter(({ visible }) => visible).length;
  }

  public async getGridLines(selector: string): Promise<Array<{ x: number; y: number }>> {
    const { x, y } = (await this.getEsChartDebugState(selector))?.axes ?? {
      x: [],
      y: [],
    };
    return [...x, ...y].flatMap(({ gridlines }) => gridlines);
  }

  public async getChartValues(selector: string) {
    const barSeries = (await this.getEsChartDebugState(selector))?.bars ?? [];
    return barSeries.filter(({ visible }) => visible).flatMap((bars) => bars.labels);
  }
}
