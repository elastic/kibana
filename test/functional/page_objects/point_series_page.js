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
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  const defaultFindTimeout = config.get('timeouts.find');

  class PointSeriesVis {
    clickOptions() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText('Panel Settings')
        .click();
    }

    clickAxisOptions() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByPartialLinkText('Metrics & Axes')
        .click();
    }

    async clickAddAxis() {
      return await testSubjects.click('visualizeAddYAxisButton');
    }

    getValueAxesCount() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('.kuiSideBarSection:contains("Value Axes") > .kuiSideBarSection')
        .then(all => all.length);
    }

    getSeriesCount() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('.kuiSideBarSection:contains("Series") > .kuiSideBarSection')
        .then(all => all.length);
    }

    getRightValueAxes() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('.axis-wrapper-right g.axis')
        .then(all => all.length);
    }

    getHistogramSeries() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('.series.histogram')
        .then(all => all.length);
    }

    getGridLines() {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('g.grid > path')
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
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('#showCategoryLines')
        .click();
    }

    setGridValueAxis(axis) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`select#gridAxis option[value="${axis}"]`)
        .click();
    }

    toggleCollapsibleTitle(title) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('.kuiSideBarCollapsibleTitle .kuiSideBarCollapsibleTitle__text')
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
      return remote
        .setFindTimeout(defaultFindTimeout * 2)
        .findByCssSelector('button[ng-click="numberListCntr.add()"]')
        .click()
        .then(() => {
          return remote
            .setFindTimeout(defaultFindTimeout)
            .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
            .clearValue();
        })
        .then(() => {
          return remote
            .setFindTimeout(defaultFindTimeout)
            .findByCssSelector('input[ng-model="numberListCntr.getList()[$index]"]')
            .type(newValue);
        });
    }

    setValueAxisPosition(axis, position) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`select#valueAxisPosition${axis} option[label="${position}"]`)
        .click();
    }

    setCategoryAxisPosition(newValue) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`select#categoryAxisPosition option[label="${newValue}"]`)
        .click();
    }

    setSeriesAxis(series, axis) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`select#seriesValueAxis${series} option[value="${axis}"]`)
        .click();
    }

    setSeriesType(series, type) {
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`select#seriesType${series} option[label="${type}"]`)
        .click();
    }
  }

  return new PointSeriesVis();
}
