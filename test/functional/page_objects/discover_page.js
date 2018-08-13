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

export function DiscoverPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['header', 'common']);

  const getRemote = () => (
    getService('remote')
      .setFindTimeout(config.get('timeouts.find'))
  );

  class DiscoverPage {
    getQueryField() {
      return getRemote()
        .findByCssSelector('input[ng-model=\'state.query\']');
    }

    getQuerySearchButton() {
      return getRemote()
        .findByCssSelector('button[aria-label=\'Search\']');
    }

    getChartTimespan() {
      return getRemote()
        .findByCssSelector('.small > span:nth-child(1)')
        .getVisibleText();
    }

    async saveSearch(searchName) {
      log.debug('saveSearch');
      await this.clickSaveSearchButton();
      await getRemote().findDisplayedById('SaveSearch').pressKeys(searchName);
      await testSubjects.click('discoverSaveSearchButton');
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
      return await Promise.all(headerElements.map(el => el.getVisibleText()));
    }

    async openSavedSearch() {
      // We need this try loop here because previous actions in Discover like
      // saving a search cause reloading of the page and the "Open" menu item goes stale.
      await retry.try(async () => {
        await this.clickLoadSavedSearchButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const loadIsOpen = await testSubjects.exists('loadSearchForm');
        expect(loadIsOpen).to.be(true);
      });
    }

    async hasSavedSearch(searchName) {
      const searchLink = await find.byPartialLinkText(searchName);
      return searchLink.isDisplayed();
    }

    async loadSavedSearch(searchName) {
      await this.clickLoadSavedSearchButton();
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

    getBarChartData() {
      let yAxisLabel = 0;
      let yAxisHeight;

      return PageObjects.header.waitUntilLoadingHasFinished()
        .then(() => {
          return getRemote()
            .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type');
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
      // 3). get the chart-wrapper elements
        .then(function () {
          return getRemote()
          // #kibana-body > div.content > div > div > div > div.vis-editor-canvas > visualize > div.visualize-chart > div > div.vis-col-wrapper > div.chart-wrapper > div > svg > g > g.series.\30 > rect:nth-child(1)
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
    }

    async getChartInterval() {
      const selectedValue = await testSubjects.getProperty('discoverIntervalSelect', 'value');
      const selectedOption = await find.byCssSelector('option[value="' + selectedValue + '"]');
      return selectedOption.getVisibleText();
    }

    async setChartInterval(interval) {
      const optionElement = await find.byCssSelector('option[label="' + interval + '"]', 5000);
      await optionElement.click();
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getHitCount() {
      await PageObjects.header.waitUntilLoadingHasFinished();
      return await testSubjects.getVisibleText('discoverQueryHits');
    }

    query(queryString) {
      return getRemote()
        .findByCssSelector('input[aria-label="Search input"]')
        .clearValue()
        .type(queryString)
        .then(() => {
          return getRemote()
            .findByCssSelector('button[aria-label="Search"]')
            .click();
        })
        .then(() => {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    }

    getDocHeader() {
      return getRemote()
        .findByCssSelector('thead > tr:nth-child(1)')
        .getVisibleText();
    }

    getDocTableIndex(index) {
      return getRemote()
        .findByCssSelector('tr.discover-table-row:nth-child(' + (index) + ')')
        .getVisibleText();
    }

    clickDocSortDown() {
      return getRemote()
        .findByCssSelector('.fa-sort-down')
        .click();
    }

    clickDocSortUp() {
      return getRemote()
        .findByCssSelector('.fa-sort-up')
        .click();
    }

    getMarks() {
      return getRemote()
        .findAllByCssSelector('mark')
        .getVisibleText();
    }

    clickShare() {
      return testSubjects.click('discoverShareButton');
    }

    clickShortenUrl() {
      return testSubjects.click('sharedSnapshotShortUrlButton');
    }

    async clickCopyToClipboard() {
      await testSubjects.click('sharedSnapshotCopyButton');

      // Confirm that the content was copied to the clipboard.
      return await testSubjects.exists('shareCopyToClipboardSuccess');
    }

    async getShareCaption() {
      return await testSubjects.getVisibleText('shareUiTitle');
    }

    async getSharedUrl() {
      return await testSubjects.getProperty('sharedSnapshotUrl', 'value');
    }

    async toggleSidebarCollapse() {
      return await testSubjects.click('collapseSideBarButton');
    }

    getAllFieldNames() {
      return getRemote()
        .findAllByClassName('sidebar-item')
        .then((items) => {
          return Promise.all(items.map((item) => item.getVisibleText()));
        });
    }

    getSidebarWidth() {
      return getRemote()
        .findByClassName('sidebar-list')
        .getProperty('clientWidth');
    }

    async hasNoResults() {
      return await testSubjects.exists('discoverNoResults');
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

    clickFieldListPlusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      return getRemote()
        .findByCssSelector(`[data-test-subj="plus-${field}-${value}"]`)
        .click();
    }

    clickFieldListMinusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      return getRemote()
        .findByCssSelector('[data-test-subj="minus-' + field + '-' + value + '"]')
        .click();
    }

    async selectIndexPattern(indexPattern) {
      await getRemote().findByClassName('index-pattern-selection').click();
      await getRemote().findByClassName('ui-select-search').type(indexPattern + '\n');
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
      const fieldFilterFormExists = await testSubjects.exists('discoverFieldFilter');
      if (!fieldFilterFormExists) {
        await testSubjects.click('toggleFieldFilterButton');
        await testSubjects.existOrFail('discoverFieldFilter');
      }
    }

    async closeSidebarFieldFilter() {
      const fieldFilterFormExists = await testSubjects.exists('discoverFieldFilter');
      if (fieldFilterFormExists) {
        await testSubjects.click('toggleFieldFilterButton');
        await testSubjects.missingOrFail('discoverFieldFilter');
      }
    }

  }

  return new DiscoverPage();
}
