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
    async clickAddAxis() {
      return await testSubjects.click('visualizeAddYAxisButton');
    }

    async setAxisTitle(title, { index = 0 } = {}) {
      return await testSubjects.setValue(`valueAxisTitle${index}`, title);
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
      const grid = await find.byCssSelector('g.grid');
      const $ = await grid.parseDomContent();
      return $('path')
        .toArray()
        .map(line => {
          const dAttribute = $(line).attr('d');
          const firstPoint = dAttribute
            .split('L')[0]
            .replace('M', '')
            .split(',');
          return {
            x: parseFloat(firstPoint[0]),
            y: parseFloat(firstPoint[1]),
          };
        });
    }

    async toggleGridCategoryLines() {
      return await testSubjects.click('showCategoryLines');
    }

    async setGridValueAxis(axis) {
      log.debug(`setGridValueAxis(${axis})`);
      await find.selectValue('select#gridAxis', axis);
    }

    async setSeriesAxis(series, axis) {
      await find.selectValue(`select#seriesValueAxis${series}`, axis);
    }

    async setSeriesType(series, type) {
      await find.selectValue(`select#seriesType${series}`, type);
    }
  }

  return new PointSeriesVis();
}
