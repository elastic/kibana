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

export function PointSeriesPageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const find = getService('find');

  class PointSeriesVis {
    async clickOptions() {
      return await find.clickByPartialLinkText('Panel Settings');
    }

    async clickAxisOptions() {
      return await find.clickByPartialLinkText('Metrics & Axes');
    }

    async clickAddAxis() {
      return await testSubjects.click('visualizeAddYAxisButton');
    }

    async setAxisTitle(title, { index = 0 } = {}) {
      return await find.setValue(`#valueAxisTitle${index}`, title);
    }

    async getValueAxesCount() {
      const axes = await find.allByCssSelector('.visEditorSidebar__section:contains("Value Axes") > .visEditorSidebar__section');
      return axes.length;
    }

    async getSeriesCount() {
      const series = await find.allByCssSelector('.visEditorSidebar__section:contains("Series") > .visEditorSidebar__section');
      return series.length;
    }

    async getRightValueAxes() {
      const axes = await find.allByCssSelector('.visAxis__column--right g.axis');
      return axes.length;
    }

    async getHistogramSeries() {
      const series = await find.allByCssSelector('.series.histogram');
      return series.length;
    }

    async getGridLines() {
      const gridLines = await find.allByCssSelector('g.grid > path');

      return await Promise.all(gridLines.map(async (gridLine) => {
        const dAttribute = await gridLine.getAttribute('d');

        const firstPoint = dAttribute.split('L')[0].replace('M', '').split(',');
        return {
          x: parseFloat(firstPoint[0]),
          y: parseFloat(firstPoint[1]),
        };
      }));
    }

    async toggleGridCategoryLines() {
      return await find.clickByCssSelector('#showCategoryLines');
    }

    async setGridValueAxis(axis) {
      return await find.clickByCssSelector(`select#gridAxis option[value="${axis}"]`);
    }

    async toggleCollapsibleTitle(title) {
      const sidebarTitles = await find.allByCssSelector('.visEditorSidebar__collapsibleTitle .visEditorSidebar__collapsibleTitleText');
      log.debug('found sidebar titles ' + sidebarTitles.length);

      return Promise.all(sidebarTitles.map(async (titleDiv) => {
        const titleString = await titleDiv.getVisibleText();
        log.debug('sidebar title ' + titleString);

        if (titleString === title) {
          log.debug('clicking sidebar title ' + titleString);
          return titleDiv.click();
        }
      }));
    }

    async setValue(newValue) {
      await find.clickByCssSelector('button[ng-click="numberListCntr.add()"]');
      await find.setValue('input[ng-model="numberListCntr.getList()[$index]"]', newValue);
    }

    async setValueAxisPosition(axis, position) {
      await find.clickByCssSelector(`select#valueAxisPosition${axis} option[label="${position}"]`);
    }

    async setCategoryAxisPosition(newValue) {
      await find.clickByCssSelector(`select#categoryAxisPosition option[label="${newValue}"]`);
    }

    async setSeriesAxis(series, axis) {
      await find.clickByCssSelector(`select#seriesValueAxis${series} option[value="${axis}"]`);
    }

    async setSeriesType(series, type) {
      await find.clickByCssSelector(`select#seriesType${series} option[label="${type}"]`);
    }
  }

  return new PointSeriesVis();
}
