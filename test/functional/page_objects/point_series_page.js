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

import { By } from 'selenium-webdriver';

export function PointSeriesPageProvider({ getService }) {
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const defaultFindTimeout = config.get('timeouts.find');

  class PointSeriesVis {
    async clickOptions() {
      await remote.click(By.partialLinkText('Panel Settings'));
    }

    async clickAxisOptions() {
      await remote.click(By.partialLinkText('Metrics & Axes'));
    }

    async clickAddAxis() {
      return await testSubjects.click('visualizeAddYAxisButton');
    }

    async setAxisTitle(title, { index = 0 } = {}) {
      const el = await remote.findElement(By.css(`#valueAxisTitle${index}`));
      await remote.setValue(el, title);
    }

    getValueAxesCount() {
      return remote.findElements(By.css('.kuiSideBarSection:contains("Value Axes") > .kuiSideBarSection'));
    }

    getSeriesCount() {
      return remote.findElements(By.css('.kuiSideBarSection:contains("Series") > .kuiSideBarSection'));
    }

    getRightValueAxes() {
      return remote.findElements(By.css('.axis-wrapper-right g.axis'));
    }

    getHistogramSeries() {
      return remote.findElements(By.css('.series.histogram'));
    }

    async getGridLines() {
      const gridLines = await remote.findElements(By.css('g.grid > path'));
      return Promise.all(gridLines.map(async (gridLine) => {
        const dAttribute = await gridLine.getAttribute('d');
        const firstPoint = dAttribute.split('L')[0].replace('M', '').split(',');
        return { x: parseFloat(firstPoint[0]), y: parseFloat(firstPoint[1]) };
      }));
    }

    async toggleGridCategoryLines() {
      await remote.click(By.css('#showCategoryLines'));
    }

    async setGridValueAxis(axis) {
      await remote.click(By.css(`select#gridAxis option[value="${axis}"]`));
    }

    async toggleCollapsibleTitle(title) {
      const locator = `//span[contains(@class, 'kuiSideBarCollapsibleTitle__text') and contains(text(), '${title}')]`;
      await remote.click(By.xpath(locator));
    }

    async setValue(newValue) {
      await remote.click(By.css('button[ng-click="numberListCntr.add()"]'), defaultFindTimeout * 2);
      const input = await remote.findElement(By.css('input[ng-model="numberListCntr.getList()[$index]"]'));
      await input.clear();
      await input.sendKeys(newValue);
    }

    async setValueAxisPosition(axis, position) {
      const element = await remote.waitForElementPresent(By.css(`select#valueAxisPosition${axis} option[label="${position}"]`));
      await element.click();
    }

    async setCategoryAxisPosition(newValue) {
      const element = await remote.waitForElementPresent(By.css(`select#categoryAxisPosition option[label="${newValue}"]`));
      await element.click();
    }

    async setSeriesAxis(series, axis) {
      const select = await remote.findElement(By.css(`select#seriesValueAxis${series}`));
      await remote.moveMouseTo(select);
      const option = await remote.findElement(By.css(`select#seriesValueAxis${series} option[value="${axis}"]`));
      await option.click();
    }

    async setSeriesType(series, type) {
      const element = await remote.waitForElementPresent(By.css(`select#seriesType${series} option[label="${type}"]`));
      await element.click();
    }
  }

  return new PointSeriesVis();
}
