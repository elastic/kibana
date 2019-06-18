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

import expect from '@kbn/expect';

export function DiscoverPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['header', 'common']);
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');

  class DiscoverPage {
    async getQueryField() {
      return await find.byCssSelector('input[ng-model=\'state.query\']');
    }

    async getQuerySearchButton() {
      return await find.byCssSelector('button[aria-label=\'Search\']');
    }

    async getChartTimespan() {
      const el = await find.byCssSelector('.small > label[for="dscResultsIntervalSelector"]');
      return await el.getVisibleText();
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

    async waitUntilSearchingHasFinished() {
      const spinner = await testSubjects.find('loadingSpinner');
      await find.waitForElementHidden(spinner, defaultFindTimeout * 10);
    }

    async getColumnHeaders() {
      const headerElements = await testSubjects.findAll('docTableHeaderField');
      return await Promise.all(headerElements.map(async (el) => await el.getVisibleText()));
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
      await flyout.ensureClosed('loadSearchForm');
    }

    async hasSavedSearch(searchName) {
      const searchLink = await find.byButtonText(searchName);
      return searchLink.isDisplayed();
    }

    async loadSavedSearch(searchName) {
      await this.openLoadSavedSearchPanel();
      const searchLink = await find.byButtonText(searchName);
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

    async clickHistogramBar(i) {
      const bars = await find.allByCssSelector(`.series.histogram rect`);
      await bars[i].click();
    }

    async brushHistogram(from, to) {
      const bars = await find.allByCssSelector('.series.histogram rect');
      await browser.dragAndDrop(
        { location: bars[from], offset: { x: 0, y: -5 } },
        { location: bars[to], offset: { x: 0, y: -5 } }
      );
    }

    async getCurrentQueryName() {
      return await globalNav.getLastBreadcrumb();
    }

    async getBarChartXTicks() {
      const xAxis = await find.byCssSelector('.x.axis.CategoryAxis-1');
      const $ = await xAxis.parseDomContent();
      return $('.tick > text').toArray().map(tick => $(tick).text().trim());
    }

    async getBarChartData() {
      let yAxisLabel = 0;

      await PageObjects.header.waitUntilLoadingHasFinished();
      const y = await find.byCssSelector('div.visAxis__splitAxes--y > div > svg > g > g:last-of-type');
      const yLabel = await y.getVisibleText();
      yAxisLabel = yLabel.replace(',', '');
      log.debug('yAxisLabel = ' + yAxisLabel);
      // #kibana-body > div.content > div > div > div > div.visEditor__canvas > visualize > div.visChart > div > div.visWrapper__column > div.visWrapper__chart > div > svg > g > g.series.\30 > rect:nth-child(1)
      const svg = await find.byCssSelector('div.chart > svg');
      const $ = await svg.parseDomContent();
      const yAxisHeight = $('rect.background').attr('height');
      log.debug('theHeight = ' + yAxisHeight);
      const bars = $('g > g.series > rect').toArray().map(chart => {
        const barHeight = $(chart).attr('height');
        return Math.round(barHeight / yAxisHeight * yAxisLabel);
      });

      return bars;
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

    async query(queryString) {
      await find.setValue('input[aria-label="Search input"]', queryString);
      await find.clickByCssSelector('button[aria-label="Search"]');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getDocHeader() {
      const header = await find.byCssSelector('thead > tr:nth-child(1)');
      return await header.getVisibleText();
    }

    async getDocTableIndex(index) {
      const row = await find.byCssSelector('tr.kbnDocTable__row:nth-child(' + (index) + ')');
      return await row.getVisibleText();
    }

    async clickDocSortDown() {
      await find.clickByCssSelector('.fa-sort-down');
    }

    async clickDocSortUp() {
      await find.clickByCssSelector('.fa-sort-up');
    }

    async getMarks() {
      const marks = await find.allByCssSelector('mark');
      return await Promise.all(marks.map((mark) => mark.getVisibleText()));
    }

    async toggleSidebarCollapse() {
      return await testSubjects.click('collapseSideBarButton');
    }

    async getAllFieldNames() {
      const items = await find.allByCssSelector('.sidebar-item');
      return await Promise.all(items.map((item) => item.getVisibleText()));
    }

    async getSidebarWidth() {
      const sidebar = await find.byCssSelector('.sidebar-list');
      return await sidebar.getProperty('clientWidth');
    }

    async hasNoResults() {
      return await testSubjects.exists('discoverNoResults');
    }

    async hasNoResultsTimepicker() {
      return await testSubjects.exists('discoverNoResultsTimefilter');
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

    async expectFieldListItemVisualize(field) {
      await testSubjects.existOrFail(`fieldVisualize-${field}`);
    }

    async expectMissingFieldListItemVisualize(field) {
      await testSubjects.missingOrFail(`fieldVisualize-${field}`);
    }

    async clickFieldListPlusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      await find.clickByCssSelector(`[data-test-subj="plus-${field}-${value}"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickFieldListMinusFilter(field, value) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      await find.clickByCssSelector('[data-test-subj="minus-' + field + '-' + value + '"]');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectIndexPattern(indexPattern) {
      await find.clickByCssSelector('.index-pattern-selection');
      await find.setValue('.ui-select-search', indexPattern + '\n');
      await PageObjects.header.waitUntilLoadingHasFinished();
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
