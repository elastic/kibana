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

import expect from 'expect.js';
import { By } from 'selenium-webdriver';

export function DiscoverPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const remote = getService('remote');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['header', 'common']);

  class DiscoverPage {
    async getQueryField() {
      return await remote.findElement(By.css('input[ng-model=\'state.query\']'));
    }

    async getQuerySearchButton() {
      return await remote.findElement(By.css('button[aria-label=\'Search\']'));
    }

    async getChartTimespan() {
      const chartTimespan = await remote.findElement(By.css('.small > span:nth-child(1)'));
      return chartTimespan.getText();
    }

    async saveSearch(searchName) {
      log.debug('saveSearch');
      await this.clickSaveSearchButton();
      await testSubjects.setValue('savedObjectTitle', searchName);
      await testSubjects.click('confirmSaveSavedObjectButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // LeeDr - this additional checking for the saved search name was an attempt
      // to cause this method to wait for the reloading of the page to complete so
      // that the next action wouldn't have to retry.  But it doesn't really solve
      // that issue.  But it does typically take about 3 retries to
      // complete with the expected searchName.
      await retry.try(async () => {
        const name = await this.getCurrentQueryName();
        expect(name).to.be(searchName);
      });
    }

    async getColumnHeaders() {
      const headerElements = await testSubjects.findAll('docTableHeaderField');
      return await Promise.all(headerElements.map(el => el.getText()));
    }

    async openLoadSavedSearchPanel() {
      const isOpen = await testSubjects.exists('loadSearchForm');
      if (isOpen) {
        return;
      }

      // We need this try loop here because previous actions in Discover like
      // saving a search cause reloading of the page and the "Open" menu item goes stale.
      await retry.try(async () => {
        await this.clickLoadSavedSearchButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const isOpen = await testSubjects.exists('loadSearchForm');
        expect(isOpen).to.be(true);
      });
    }

    async closeLoadSaveSearchPanel() {
      const isOpen = await testSubjects.exists('loadSearchForm');
      if (!isOpen) {
        return;
      }

      await flyout.close('loadSearchForm');
    }

    async hasSavedSearch(searchName) {
      const searchLink = await find.byPartialLinkText(searchName);
      return searchLink.isDisplayed();
    }

    async loadSavedSearch(searchName) {
      await this.openLoadSavedSearchPanel();
      const searchLink = await find.byPartialLinkText(searchName);
      await searchLink.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickNewSearchButton() {
      await testSubjects.click('discoverNewButton');
    }

    async clickSaveSearchButton() {
      await testSubjects.click('discoverSaveButton');
    }

    async clickLoadSavedSearchButton() {
      await testSubjects.click('discoverOpenButton');
    }

    async getCurrentQueryName() {
      return await testSubjects.getVisibleText('discoverCurrentQuery');
    }

<<<<<<< HEAD
    async getBarChartData() {

      await PageObjects.header.waitUntilLoadingHasFinished();
      const y = await remote.findElement(By.css('div.y-axis-div-wrapper > div > svg > g > g:last-of-type'));
      const yLabel = await y.getText();
      const yAxisLabel = yLabel.replace(',', '');
      log.debug('yAxisLabel = ' + yAxisLabel);

      const chartAreaObj = await remote.findElement(By.css('rect.background'));
      const theHeight = await chartAreaObj.getAttribute('height');
      const yAxisHeight = theHeight;
      log.debug('theHeight = ' + theHeight);

      const chartTypes = await remote.findElements(By.css('svg > g > g.series > rect'));

      async function getChartType(chart) {
        return await chart
          .getAttribute('height')
          .then(function (barHeight) {
            return Math.round(barHeight / yAxisHeight * yAxisLabel);
          });
      }

      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
=======
    async getBarChartXTicks() {
      return getRemote()
        .findAllByCssSelector('.x.axis.CategoryAxis-1 > .tick > text')
        .getVisibleText();
    }

    getBarChartData() {
      let yAxisLabel = 0;
      let yAxisHeight;

      return PageObjects.header.waitUntilLoadingHasFinished()
        .then(() => {
          return getRemote()
            .findByCssSelector('div.visAxis__splitAxes--y > div > svg > g > g:last-of-type');
        })
        .then(function setYAxisLabel(y) {
          return y
            .getVisibleText()
            .then(function (yLabel) {
              yAxisLabel = yLabel.replace(',', '');
              log.debug('yAxisLabel = ' + yAxisLabel);
              return yLabel;
            });
        })
      // 2). find and save the y-axis pixel size (the chart height)
        .then(function getRect() {
          return getRemote()
            .findByCssSelector('rect.background')
            .then(function getRectHeight(chartAreaObj) {
              return chartAreaObj
                .getAttribute('height')
                .then(function (theHeight) {
                  yAxisHeight = theHeight; // - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
                  log.debug('theHeight = ' + theHeight);
                  return theHeight;
                });
            });
        })
      // 3). get the visWrapper__chart elements
        .then(function () {
          return getRemote()
          // #kibana-body > div.content > div > div > div > div.visEditor__canvas > visualize > div.visChart > div > div.visWrapper__column > div.visWrapper__chart > div > svg > g > g.series.\30 > rect:nth-child(1)
            .findAllByCssSelector('svg > g > g.series > rect') // rect
            .then(function (chartTypes) {
              function getChartType(chart) {
                return chart
                  .getAttribute('height')
                  .then(function (barHeight) {
                    return Math.round(barHeight / yAxisHeight * yAxisLabel);
                  });
              }
              const getChartTypesPromises = chartTypes.map(getChartType);
              return Promise.all(getChartTypesPromises);
            })
            .then(function (bars) {
              return bars;
            });
        });
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }

    async getChartInterval() {
      const selectedValue = await testSubjects.getProperty('discoverIntervalSelect', 'value');
      const selectedOption = await remote.findElement(By.css('option[value="' + selectedValue + '"]'));
      return selectedOption.getText();
    }

    async setChartInterval(interval) {
      const optionElement = await remote.findElement(By.css('option[label="' + interval + '"]'), 5000);
      await optionElement.click();
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getHitCount() {
      await PageObjects.header.waitUntilLoadingHasFinished();
      return await testSubjects.getVisibleText('discoverQueryHits');
    }

    async query(queryString) {
      const searchInput = await remote.findElement(By.css('input[aria-label="Search input"]'));
      await searchInput.clear();
      await remote.type(searchInput, queryString);
      const searchButton = await remote.findElement(By.css('button[aria-label="Search"]'));
      await searchButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getDocHeader() {
      const docHeader = await remote.findElement(By.css('thead > tr:nth-child(1)'));
      return await docHeader.getText();
    }

    async getDocTableIndex(index) {
      const docTableIndex = await remote.findElement(By.css(`tr.discover-table-row:nth-child(${index})`));
      return await docTableIndex.getText();
    }

    async clickDocSortDown() {
      const docSortDown = await remote.findElement(By.css('.fa-sort-down'));
      await docSortDown.click();
    }

    async clickDocSortUp() {
      const docSortUp = await remote.findElement(By.css('.fa-sort-up'));
      await docSortUp.click();
    }

    async getMarks() {
      return await remote.findElements(By.css('mark'));
    }

    async toggleSidebarCollapse() {
      return await testSubjects.click('collapseSideBarButton');
    }

    async getAllFieldNames() {
      const items = await remote.findElements(By.className('sidebar-item'));
      return Promise.all(items.map((item) => item.getText()));
    }

    async getSidebarWidth() {
      const sidebar = await remote.findElement(By.className('sidebar-list'));
      return await sidebar.getAttribute('clientWidth');
    }

    async hasNoResults() {
      return await remote.isElementVisible(By.css('div[data-test-subj="discoverNoResults"]'));
    }

    async getNoResultsTimepicker() {
      return await testSubjects.find('discoverNoResultsTimefilter');
    }

    hasNoResultsTimepicker() {
      return this
        .getNoResultsTimepicker()
        .then(() => true)
        .catch(() => false);
    }

    async clickFieldListItem(field) {
      return await testSubjects.click(`field-${field}`);
    }

    async clickFieldListItemAdd(field) {
      await testSubjects.moveMouseTo(`field-${field}`);
      await testSubjects.click(`fieldToggle-${field}`);
    }

    async clickFieldListItemVisualize(field) {
      return await retry.try(async () => {
        await testSubjects.click(`fieldVisualize-${field}`);
      });
    }

    async clickFieldListPlusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
<<<<<<< HEAD
      const fieldListPlusFilter = await remote.findElement(By.css(`[data-test-subj="plus-${field}-${value}"]`));
      await fieldListPlusFilter.click();
=======
      await getRemote()
        .findByCssSelector(`[data-test-subj="plus-${field}-${value}"]`)
        .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }

    async clickFieldListMinusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
<<<<<<< HEAD
      const fieldListMinusFilter = await remote.findElement(By.css('[data-test-subj="minus-' + field + '-' + value + '"]'));
      await fieldListMinusFilter.click();
    }

    async selectIndexPattern(indexPattern) {
      const indexPatternSelection = await remote.findElement(By.css('index-pattern-selection'));
      await indexPatternSelection.click();

      await remote.type(By.css('ui-select-search'), indexPattern + '\n');
=======
      await getRemote()
        .findByCssSelector('[data-test-subj="minus-' + field + '-' + value + '"]')
        .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectIndexPattern(indexPattern) {
      await getRemote().findByClassName('index-pattern-selection').click();
      await getRemote().findByClassName('ui-select-search').type(indexPattern + '\n');
      await PageObjects.header.waitUntilLoadingHasFinished();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }

    async removeAllFilters() {
      await testSubjects.click('showFilterActions');
      await testSubjects.click('removeAllFilters');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitUntilUrlIncludes('filters:!()');
    }

    async removeHeaderColumn(name) {
      await testSubjects.moveMouseTo(`docTableHeader-${name}`);
      await testSubjects.click(`docTableRemoveHeader-${name}`);
    }

    async openSidebarFieldFilter() {
      const isFilterExpanded = await remote.isElementVisible(By.css('div[data-test-subj="discoverFieldFilter"]'));
      if (!isFilterExpanded) {
        await testSubjects.click('toggleFieldFilterButton');
        await remote.waitForElementPresent(By.css('div[data-test-subj="discoverFieldFilter"]'));
      }
    }

    async closeSidebarFieldFilter() {
      const isFilterExpanded = await remote.isElementVisible(By.css('div[data-test-subj="discoverFieldFilter"]'));
      if (!isFilterExpanded) {
        await testSubjects.click('toggleFieldFilterButton');
        await remote.waitForElementNotPresent(By.css('div[data-test-subj="discoverFieldFilter"]'));
      }
    }

  }

  return new DiscoverPage();
}
