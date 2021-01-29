/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Position } from '@elastic/charts';

import { FtrProviderContext } from '../ftr_provider_context';

const elasticChartSelector = 'visTypeXyChart';

export function VisualizeChartPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const elasticChart = getService('elasticChart');
  const dataGrid = getService('dataGrid');
  const defaultFindTimeout = config.get('timeouts.find');
  const { common } = getPageObjects(['common']);

  class VisualizeChart {
    private async getDebugState() {
      return await elasticChart.getChartDebugData(elasticChartSelector);
    }

    /**
     * Is new charts library advanced setting enabled
     */
    public async isNewChartsLibraryEnabled(): Promise<boolean> {
      const legacyChartsLibrary =
        Boolean(await kibanaServer.uiSettings.get('visualization:visualize:legacyChartsLibrary')) ??
        true;
      const enabled = !legacyChartsLibrary;
      log.debug(`-- isNewChartsLibraryEnabled = ${enabled}`);

      return enabled;
    }

    /**
     * Is new charts library enabled and an area, line or histogram chart exists
     */
    private async isVisTypeXYChart(): Promise<boolean> {
      const enabled = await this.isNewChartsLibraryEnabled();

      if (!enabled) {
        log.debug(`-- isVisTypeXYChart = false`);
        return false;
      }

      // check if enabled but not a line, area or histogram chart
      if (await find.existsByCssSelector('.visLib__chart', 1)) {
        const chart = await find.byCssSelector('.visLib__chart');
        const chartType = await chart.getAttribute('data-vislib-chart-type');

        if (!['line', 'area', 'histogram'].includes(chartType)) {
          log.debug(`-- isVisTypeXYChart = false`);
          return false;
        }
      }

      if (!(await elasticChart.hasChart(elasticChartSelector, 1))) {
        // not be a vislib chart type
        log.debug(`-- isVisTypeXYChart = false`);
        return false;
      }

      log.debug(`-- isVisTypeXYChart = true`);
      return true;
    }

    /**
     * Helper method to get expected values that are slightly different
     * between vislib and elastic-chart inplementations
     * @param vislibValue value expected for vislib chart
     * @param elasticChartsValue value expected for `@elastic/charts` chart
     */
    public async getExpectedValue<T>(vislibValue: T, elasticChartsValue: T): Promise<T> {
      if (await this.isVisTypeXYChart()) {
        return elasticChartsValue;
      }

      return vislibValue;
    }

    public async getYAxisTitle() {
      if (await this.isVisTypeXYChart()) {
        const xAxis = (await this.getDebugState())?.axes?.y ?? [];
        return xAxis[0]?.title;
      }

      const title = await find.byCssSelector('.y-axis-div .y-axis-title text');
      return await title.getVisibleText();
    }

    public async getXAxisLabels() {
      if (await this.isVisTypeXYChart()) {
        const [xAxis] = (await this.getDebugState())?.axes?.x ?? [];
        return xAxis?.labels;
      }

      const xAxis = await find.byCssSelector('.visAxis--x.visAxis__column--bottom');
      const $ = await xAxis.parseDomContent();
      return $('.x > g > text')
        .toArray()
        .map((tick) => $(tick).text().trim());
    }

    public async getYAxisLabels() {
      if (await this.isVisTypeXYChart()) {
        const [yAxis] = (await this.getDebugState())?.axes?.y ?? [];
        return yAxis?.labels;
      }

      const yAxis = await find.byCssSelector('.visAxis__column--y.visAxis__column--left');
      const $ = await yAxis.parseDomContent();
      return $('.y > g > text')
        .toArray()
        .map((tick) => $(tick).text().trim());
    }

    public async getYAxisLabelsAsNumbers() {
      if (await this.isVisTypeXYChart()) {
        const [yAxis] = (await this.getDebugState())?.axes?.y ?? [];
        return yAxis?.values;
      }

      return (await this.getYAxisLabels()).map((label) => Number(label.replace(',', '')));
    }

    /**
     * Gets the chart data and scales it based on chart height and label.
     * @param dataLabel data-label value
     * @param axis  axis value, 'ValueAxis-1' by default
     *
     * Returns an array of height values
     */
    public async getAreaChartData(dataLabel: string, axis = 'ValueAxis-1') {
      if (await this.isVisTypeXYChart()) {
        const areas = (await this.getDebugState())?.areas ?? [];
        const points = areas.find(({ name }) => name === dataLabel)?.lines.y1.points ?? [];
        return points.map(({ y }) => y);
      }

      const yAxisRatio = await this.getChartYAxisRatio(axis);

      const rectangle = await find.byCssSelector('rect.background');
      const yAxisHeight = Number(await rectangle.getAttribute('height'));
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () =>
          await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2)
      );
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      const tempArray = data
        .replace('M ', '')
        .replace('M', '')
        .replace(/ L /g, 'L')
        .replace(/ /g, ',')
        .split('L');
      const chartSections = tempArray.length / 2;
      const chartData = [];
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - Number(tempArray[i].split(',')[1])) * yAxisRatio);
        log.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    }

    /**
     * Returns the paths that compose an area chart.
     * @param dataLabel data-label value
     */
    public async getAreaChartPaths(dataLabel: string) {
      if (await this.isVisTypeXYChart()) {
        const areas = (await this.getDebugState())?.areas ?? [];
        const path = areas.find(({ name }) => name === dataLabel)?.path ?? '';
        return path.split('L');
      }

      const path = await retry.try(
        async () =>
          await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2)
      );
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      return data.split('L');
    }

    /**
     * Gets the dots and normalizes their height.
     * @param dataLabel data-label value
     * @param axis axis value, 'ValueAxis-1' by default
     */
    public async getLineChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      if (await this.isVisTypeXYChart()) {
        // For now lines are rendered as areas to enable stacking
        const areas = (await this.getDebugState())?.areas ?? [];
        const lines = areas.map(({ lines: { y1 }, name, color }) => ({ ...y1, name, color }));
        const points = lines.find(({ name }) => name === dataLabel)?.points ?? [];
        return points.map(({ y }) => y);
      }

      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 2). find and save the y-axis pixel size (the chart height)
      const rectangle = await find.byCssSelector('clipPath rect');
      const yAxisHeight = Number(await rectangle.getAttribute('height'));
      // 3). get the visWrapper__chart elements
      const chartTypes = await retry.try(
        async () =>
          await find.allByCssSelector(
            `.visWrapper__chart circle[data-label="${dataLabel}"][fill-opacity="1"]`,
            defaultFindTimeout * 2
          )
      );
      // 4). for each chart element, find the green circle, then the cy position
      const chartData = await Promise.all(
        chartTypes.map(async (chart) => {
          const cy = Number(await chart.getAttribute('cy'));
          // the point_series_options test has data in the billions range and
          // getting 11 digits of precision with these calculations is very hard
          return Math.round(Number(((yAxisHeight - cy) * yAxisRatio).toPrecision(6)));
        })
      );

      return chartData;
    }

    /**
     * Returns bar chart data in pixels
     * @param dataLabel data-label value
     * @param axis axis value, 'ValueAxis-1' by default
     */
    public async getBarChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      if (await this.isVisTypeXYChart()) {
        const bars = (await this.getDebugState())?.bars ?? [];
        const values = bars.find(({ name }) => name === dataLabel)?.bars ?? [];
        return values.map(({ y }) => y);
      }

      const yAxisRatio = await this.getChartYAxisRatio(axis);
      const svg = await find.byCssSelector('div.chart');
      const $ = await svg.parseDomContent();
      const chartData = $(`g > g.series > rect[data-label="${dataLabel}"]`)
        .toArray()
        .map((chart) => {
          const barHeight = Number($(chart).attr('height'));
          return Math.round(barHeight * yAxisRatio);
        });

      return chartData;
    }

    /**
     * Returns the range/pixel ratio
     * @param axis axis value, 'ValueAxis-1' by default
     */
    private async getChartYAxisRatio(axis = 'ValueAxis-1') {
      // 1). get the maximum chart Y-Axis marker value and Y position
      const maxYAxisChartMarker = await retry.try(
        async () =>
          await find.byCssSelector(
            `div.visAxis__splitAxes--y > div > svg > g.${axis} > g:last-of-type.tick`
          )
      );
      const maxYLabel = (await maxYAxisChartMarker.getVisibleText()).replace(/,/g, '');
      const maxYLabelYPosition = (await maxYAxisChartMarker.getPosition()).y;
      log.debug(`maxYLabel = ${maxYLabel}, maxYLabelYPosition = ${maxYLabelYPosition}`);

      // 2). get the minimum chart Y-Axis marker value and Y position
      const minYAxisChartMarker = await find.byCssSelector(
        'div.visAxis__column--y.visAxis__column--left  > div > div > svg:nth-child(2) > g > g:nth-child(1).tick'
      );
      const minYLabel = (await minYAxisChartMarker.getVisibleText()).replace(',', '');
      const minYLabelYPosition = (await minYAxisChartMarker.getPosition()).y;
      return (Number(maxYLabel) - Number(minYLabel)) / (minYLabelYPosition - maxYLabelYPosition);
    }

    public async toggleLegend(show = true) {
      const isVisTypeXYChart = await this.isVisTypeXYChart();
      const legendSelector = isVisTypeXYChart ? '.echLegend' : '.visLegend';

      await retry.try(async () => {
        const isVisible = await find.existsByCssSelector(legendSelector);
        if ((show && !isVisible) || (!show && isVisible)) {
          await testSubjects.click('vislibToggleLegend');
        }
      });
    }

    public async filterLegend(name: string) {
      await this.toggleLegend();
      await testSubjects.click(`legend-${name}`);
      const filterIn = await testSubjects.find(`legend-${name}-filterIn`);
      await filterIn.click();
      await this.waitForVisualizationRenderingStabilized();
    }

    public async doesLegendColorChoiceExist(color: string) {
      return await testSubjects.exists(`visColorPickerColor-${color}`);
    }

    public async selectNewLegendColorChoice(color: string) {
      await testSubjects.click(`visColorPickerColor-${color}`);
    }

    public async doesSelectedLegendColorExist(color: string) {
      if (await this.isVisTypeXYChart()) {
        const items = (await this.getDebugState())?.legend?.items ?? [];
        return items.some(({ color: c }) => c === color);
      }

      return await testSubjects.exists(`legendSelectedColor-${color}`);
    }

    public async expectError() {
      if (!this.isVisTypeXYChart()) {
        await testSubjects.existOrFail('vislibVisualizeError');
      }
    }

    public async getVisualizationRenderingCount() {
      const visualizationLoader = await testSubjects.find('visualizationLoader');
      const renderingCount = await visualizationLoader.getAttribute('data-rendering-count');
      return Number(renderingCount);
    }

    public async waitForRenderingCount(minimumCount = 1) {
      await retry.waitFor(
        `rendering count to be greater than or equal to [${minimumCount}]`,
        async () => {
          const currentRenderingCount = await this.getVisualizationRenderingCount();
          log.debug(`-- currentRenderingCount=${currentRenderingCount}`);
          log.debug(`-- expectedCount=${minimumCount}`);
          return currentRenderingCount >= minimumCount;
        }
      );
    }

    public async waitForVisualizationRenderingStabilized() {
      // assuming rendering is done when data-rendering-count is constant within 1000 ms
      await retry.waitFor('rendering count to stabilize', async () => {
        const firstCount = await this.getVisualizationRenderingCount();
        log.debug(`-- firstCount=${firstCount}`);

        await common.sleep(2000);

        const secondCount = await this.getVisualizationRenderingCount();
        log.debug(`-- secondCount=${secondCount}`);

        return firstCount === secondCount;
      });
    }

    public async waitForVisualization() {
      await this.waitForVisualizationRenderingStabilized();

      if (!(await this.isVisTypeXYChart())) {
        await find.byCssSelector('.visualization');
      }
    }

    public async getLegendEntries() {
      if (await this.isVisTypeXYChart()) {
        const items = (await this.getDebugState())?.legend?.items ?? [];
        return items.map(({ name }) => name);
      }

      const legendEntries = await find.allByCssSelector(
        '.visLegend__button',
        defaultFindTimeout * 2
      );
      return await Promise.all(
        legendEntries.map(async (chart) => await chart.getAttribute('data-label'))
      );
    }

    public async openLegendOptionColors(name: string, chartSelector = elasticChartSelector) {
      await this.waitForVisualizationRenderingStabilized();
      await retry.try(async () => {
        if (await this.isVisTypeXYChart()) {
          const chart = await find.byCssSelector(chartSelector);
          const legendItemColor = await chart.findByCssSelector(
            `[data-ech-series-name="${name}"] .echLegendItem__color`
          );
          legendItemColor.click();
        } else {
          // This click has been flaky in opening the legend, hence the retry.  See
          // https://github.com/elastic/kibana/issues/17468
          await testSubjects.click(`legend-${name}`);
        }

        await this.waitForVisualizationRenderingStabilized();
        // arbitrary color chosen, any available would do
        const isOpen = await this.doesLegendColorChoiceExist('#EF843C');
        if (!isOpen) {
          throw new Error('legend color selector not open');
        }
      });
    }

    public async filterOnTableCell(columnIndex: number, rowIndex: number) {
      await retry.try(async () => {
        const cell = await dataGrid.getCellElement(rowIndex, columnIndex);
        await cell.moveMouseTo();
        const filterBtn = await testSubjects.findDescendant(
          'tbvChartCell__filterForCellValue',
          cell
        );
        await filterBtn.click();
      });
    }

    public async getMarkdownText() {
      const markdownContainer = await testSubjects.find('markdownBody');
      return markdownContainer.getVisibleText();
    }

    public async getMarkdownBodyDescendentText(selector: string) {
      const markdownContainer = await testSubjects.find('markdownBody');
      const element = await find.descendantDisplayedByCssSelector(selector, markdownContainer);
      return element.getVisibleText();
    }

    // Table visualization

    public async getTableVisNoResult() {
      return await testSubjects.find('tbvChartContainer>visNoResult');
    }

    /**
     * This function returns the text displayed in the Table Vis header
     */
    public async getTableVisHeader() {
      return await testSubjects.getVisibleText('dataGridHeader');
    }

    public async getFieldLinkInVisTable(fieldName: string, rowIndex: number = 1) {
      const headers = await dataGrid.getHeaders();
      const fieldColumnIndex = headers.indexOf(fieldName);
      const cell = await dataGrid.getCellElement(rowIndex, fieldColumnIndex + 1);
      return await cell.findByTagName('a');
    }

    /**
     * Function to retrieve data from within a table visualization.
     */
    public async getTableVisContent({ stripEmptyRows = true } = {}) {
      return await retry.try(async () => {
        const container = await testSubjects.find('tbvChart');
        const allTables = await testSubjects.findAllDescendant('dataGridWrapper', container);

        if (allTables.length === 0) {
          return [];
        }

        const allData = await Promise.all(
          allTables.map(async (t) => {
            let data = await dataGrid.getDataFromElement(t, 'tbvChartCellContent');
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
      const elements = await find.allByCssSelector(
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
      const elements = await find.allByCssSelector(
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

    public async getRightValueAxesCount() {
      if (await this.isVisTypeXYChart()) {
        const yAxes = (await this.getDebugState())?.axes?.y ?? [];
        return yAxes.filter(({ position }) => position === Position.Right).length;
      }
      const axes = await find.allByCssSelector('.visAxis__column--right g.axis');
      return axes.length;
    }

    public async clickOnGaugeByLabel(label: string) {
      const gauge = await testSubjects.find(`visGauge__meter--${label}`);
      const gaugeSize = await gauge.getSize();
      const gaugeHeight = gaugeSize.height;
      // To click at Gauge arc instead of the center of SVG element
      // the offset for a click is calculated as half arc height without 1 pixel
      const yOffset = 1 - Math.floor(gaugeHeight / 2);

      await gauge.clickMouseButton({ xOffset: 0, yOffset });
    }

    public async getHistogramSeriesCount() {
      if (await this.isVisTypeXYChart()) {
        const bars = (await this.getDebugState())?.bars ?? [];
        return bars.filter(({ visible }) => visible).length;
      }

      const series = await find.allByCssSelector('.series.histogram');
      return series.length;
    }

    public async getGridLines(): Promise<Array<{ x: number; y: number }>> {
      if (await this.isVisTypeXYChart()) {
        const { x, y } = (await this.getDebugState())?.axes ?? { x: [], y: [] };
        return [...x, ...y].flatMap(({ gridlines }) => gridlines);
      }

      const grid = await find.byCssSelector('g.grid');
      const $ = await grid.parseDomContent();
      return $('path')
        .toArray()
        .map((line) => {
          const dAttribute = $(line).attr('d');
          const firstPoint = dAttribute.split('L')[0].replace('M', '').split(',');
          return {
            x: parseFloat(firstPoint[0]),
            y: parseFloat(firstPoint[1]),
          };
        });
    }

    public async getChartValues() {
      if (await this.isVisTypeXYChart()) {
        const barSeries = (await this.getDebugState())?.bars ?? [];
        return barSeries.filter(({ visible }) => visible).flatMap((bars) => bars.labels);
      }

      const elements = await find.allByCssSelector('.series.histogram text');
      const values = await Promise.all(
        elements.map(async (element) => {
          const text = await element.getVisibleText();
          return text;
        })
      );
      return values;
    }
  }

  return new VisualizeChart();
}
