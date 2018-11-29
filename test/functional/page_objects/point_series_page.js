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

    setAxisTitle(title, { index = 0 } = {}) {
      return find.setValue(`#valueAxisTitle${index}`, title);
    }

    getValueAxesCount() {
      return find.allByCssSelector('.kuiSideBarSection:contains("Value Axes") > .kuiSideBarSection')
        .then(all => all.length);
    }

    getSeriesCount() {
      return find.allByCssSelector('.kuiSideBarSection:contains("Series") > .kuiSideBarSection')
        .then(all => all.length);
    }

    getRightValueAxes() {
      return find.allByCssSelector('.axis-wrapper-right g.axis')
        .then(all => all.length);
    }

    getHistogramSeries() {
      return find.allByCssSelector('.series.histogram')
        .then(all => all.length);
    }

    getGridLines() {
      return find.allByCssSelector('g.grid > path')
        .then(function (data) {
          function getGridLine(gridLine) {
            return gridLine
              .getAttribute('d')
              .then(dAttribute => {
                const firstPoint = dAttribute.split('L')[0].replace('M', '').split(',');
                return { x: parseFloat(firstPoint[0]), y: parseFloat(firstPoint[1]) };
              });
          }
          const promises = data.map(getGridLine);
          return Promise.all(promises);
        })
        .then(function (gridLines) {
          return gridLines;
        });
    }

    toggleGridCategoryLines() {
      return find.byCssSelector('#showCategoryLines')
        .click();
    }

    setGridValueAxis(axis) {
      return find.byCssSelector(`select#gridAxis option[value="${axis}"]`)
        .click();
    }

    toggleCollapsibleTitle(title) {
      return find.allByCssSelector('.kuiSideBarCollapsibleTitle .kuiSideBarCollapsibleTitle__text')
        .then(sidebarTitles => {
          log.debug('found sidebar titles ' + sidebarTitles.length);
          function getTitle(titleDiv) {
            return titleDiv
              .getVisibleText()
              .then(titleString => {
                log.debug('sidebar title ' + titleString);
                if (titleString === title) {
                  log.debug('clicking sidebar title ' + titleString);
                  return titleDiv.click();
                }
              });
          }
          const sidebarTitlePromises = sidebarTitles.map(getTitle);
          return Promise.all(sidebarTitlePromises);
        });
    }

    setValue(newValue) {
      return find.clickByCssSelector('button[ng-click="numberListCntr.add()"]')
        .then(() => {
          return find.setValue('input[ng-model="numberListCntr.getList()[$index]"]', newValue);
        });
    }

    setValueAxisPosition(axis, position) {
      return find.clickByCssSelector(`select#valueAxisPosition${axis} option[label="${position}"]`);
    }

    setCategoryAxisPosition(newValue) {
      return find.clickByCssSelector(`select#categoryAxisPosition option[label="${newValue}"]`);
    }

    setSeriesAxis(series, axis) {
      return find.clickByCssSelector(`select#seriesValueAxis${series} option[value="${axis}"]`);
    }

    setSeriesType(series, type) {
      return find.clickByCssSelector(`select#seriesType${series} option[label="${type}"]`);
    }
  }

  return new PointSeriesVis();
}
