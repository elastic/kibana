/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function VisualizeChartPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const table = getService('table');
  const defaultFindTimeout = config.get('timeouts.find');
  const { common } = getPageObjects(['common']);

  class VisualizeChart {
    public async getYAxisTitle() {
      const title = await find.byCssSelector('.y-axis-div .y-axis-title text');
      return await title.getVisibleText();
    }

    public async getXAxisLabels() {
      const xAxis = await find.byCssSelector('.visAxis--x.visAxis__column--bottom');
      const $ = await xAxis.parseDomContent();
      return $('.x > g > text')
        .toArray()
        .map(tick =>
          $(tick)
            .text()
            .trim()
        );
    }

    public async getYAxisLabels() {
      const yAxis = await find.byCssSelector('.visAxis__column--y.visAxis__column--left');
      const $ = await yAxis.parseDomContent();
      return $('.y > g > text')
        .toArray()
        .map(tick =>
          $(tick)
            .text()
            .trim()
        );
    }

    /**
     * Gets the chart data and scales it based on chart height and label.
     * @param dataLabel data-label value
     * @param axis  axis value, 'ValueAxis-1' by default
     *
     * Returns an array of height values
     */
    public async getAreaChartData(dataLabel: string, axis = 'ValueAxis-1') {
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
        chartTypes.map(async chart => {
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
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      const svg = await find.byCssSelector('div.chart');
      const $ = await svg.parseDomContent();
      const chartData = $(`g > g.series > rect[data-label="${dataLabel}"]`)
        .toArray()
        .map(chart => {
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
      await retry.try(async () => {
        const isVisible = find.byCssSelector('.visLegend');
        if ((show && !isVisible) || (!show && isVisible)) {
          await testSubjects.click('vislibToggleLegend');
        }
      });
    }

    public async filterLegend(name: string) {
      await this.toggleLegend();
      await testSubjects.click(`legend-${name}`);
      const filters = await testSubjects.find(`legend-${name}-filters`);
      const [filterIn] = await filters.findAllByCssSelector(`input`);
      await filterIn.click();
      await this.waitForVisualizationRenderingStabilized();
    }

    public async doesLegendColorChoiceExist(color: string) {
      return await testSubjects.exists(`legendSelectColor-${color}`);
    }

    public async selectNewLegendColorChoice(color: string) {
      await testSubjects.click(`legendSelectColor-${color}`);
    }

    public async doesSelectedLegendColorExist(color: string) {
      return await testSubjects.exists(`legendSelectedColor-${color}`);
    }

    public async expectError() {
      await testSubjects.existOrFail('visLibVisualizeError');
    }

    public async getChartTypes() {
      const chartTypeField = await testSubjects.find('visNewDialogTypes');
      const $ = await chartTypeField.parseDomContent();
      return $('button')
        .toArray()
        .map(chart =>
          $(chart)
            .findTestSubject('visTypeTitle')
            .text()
            .trim()
        );
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
          return currentRenderingCount >= minimumCount;
        }
      );
    }

    public async waitForVisualizationRenderingStabilized() {
      // assuming rendering is done when data-rendering-count is constant within 1000 ms
      await retry.waitFor('rendering count to stabilize', async () => {
        const firstCount = await this.getVisualizationRenderingCount();
        log.debug(`-- firstCount=${firstCount}`);

        await common.sleep(1000);

        const secondCount = await this.getVisualizationRenderingCount();
        log.debug(`-- secondCount=${secondCount}`);

        return firstCount === secondCount;
      });
    }

    public async waitForVisualization() {
      await this.waitForVisualizationRenderingStabilized();
      return await find.byCssSelector('.visualization');
    }

    public async getLegendEntries() {
      const legendEntries = await find.allByCssSelector(
        '.visLegend__button',
        defaultFindTimeout * 2
      );
      return await Promise.all(
        legendEntries.map(async chart => await chart.getAttribute('data-label'))
      );
    }

    public async openLegendOptionColors(name: string) {
      await this.waitForVisualizationRenderingStabilized();
      await retry.try(async () => {
        // This click has been flaky in opening the legend, hence the retry.  See
        // https://github.com/elastic/kibana/issues/17468
        await testSubjects.click(`legend-${name}`);
        await this.waitForVisualizationRenderingStabilized();
        // arbitrary color chosen, any available would do
        const isOpen = await this.doesLegendColorChoiceExist('#EF843C');
        if (!isOpen) {
          throw new Error('legend color selector not open');
        }
      });
    }

    public async filterOnTableCell(column: string, row: string) {
      await retry.try(async () => {
        const tableVis = await testSubjects.find('tableVis');
        const cell = await tableVis.findByCssSelector(
          `tbody tr:nth-child(${row}) td:nth-child(${column})`
        );
        await cell.moveMouseTo();
        const filterBtn = await testSubjects.findDescendant('filterForCellValue', cell);
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

    public async getVegaSpec() {
      // Adapted from console_page.js:getVisibleTextFromAceEditor(). Is there a common utilities file?
      const editor = await testSubjects.find('vega-editor');
      const lines = await editor.findAllByClassName('ace_line_group');
      const linesText = await Promise.all(
        lines.map(async line => {
          return await line.getVisibleText();
        })
      );
      return linesText.join('\n');
    }

    public async getVegaViewContainer() {
      return await find.byCssSelector('div.vgaVis__view');
    }

    public async getVegaControlContainer() {
      return await find.byCssSelector('div.vgaVis__controls');
    }

    /**
     * If you are writing new tests, you should rather look into getTableVisContent method instead.
     */
    public async getTableVisData() {
      return await testSubjects.getVisibleText('paginated-table-body');
    }

    /**
     * This function is the newer function to retrieve data from within a table visualization.
     * It uses a better return format, than the old getTableVisData, by properly splitting
     * cell values into arrays. Please use this function for newer tests.
     */
    public async getTableVisContent({ stripEmptyRows = true } = {}) {
      return await retry.try(async () => {
        const container = await testSubjects.find('tableVis');
        const allTables = await testSubjects.findAllDescendant('paginated-table-body', container);

        if (allTables.length === 0) {
          return [];
        }

        const allData = await Promise.all(
          allTables.map(async t => {
            let data = await table.getDataFromElement(t);
            if (stripEmptyRows) {
              data = data.filter(row => row.length > 0 && row.some(cell => cell.trim().length > 0));
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
        elements.map(async element => {
          const text = await element.getVisibleText();
          return text;
        })
      );
      return values
        .filter(item => item.length > 0)
        .reduce((arr: string[], item) => arr.concat(item.split('\n')), []);
    }

    public async getGaugeValue() {
      const elements = await find.allByCssSelector(
        '[data-test-subj="visualizationLoader"] .chart svg text'
      );
      const values = await Promise.all(
        elements.map(async element => {
          const text = await element.getVisibleText();
          return text;
        })
      );
      return values.filter(item => item.length > 0);
    }
  }

  return new VisualizeChart();
}
