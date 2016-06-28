
import {
  defaultFindTimeout
} from '../';

import PageObjects from './';

export default class DiscoverPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getQueryField() {
    return this.findTimeout
    .findByCssSelector('input[ng-model=\'state.query\']');
  }

  getQuerySearchButton() {
    return this.findTimeout
    .findByCssSelector('button[aria-label=\'Search\']');
  }

  getTimespanText() {
    return this.findTimeout
    .findByCssSelector('.kibana-nav-options .navbar-timepicker-time-desc pretty-duration')
    .getVisibleText();
  }

  getChartTimespan() {
    return this.findTimeout
    .findByCssSelector('center.small > span:nth-child(1)')
    .getVisibleText();
  }

  saveSearch(searchName) {
    return this.clickSaveSearchButton()
    .then(() => {
      PageObjects.common.debug('--saveSearch button clicked');
      return this.findTimeout.findDisplayedById('SaveSearch')
      .pressKeys(searchName);
    })
    .then(() => {
      PageObjects.common.debug('--find save button');
      return PageObjects.common.findTestSubject('discover-save-search-btn').click();
    });
  }

  loadSavedSearch(searchName) {
    return this.clickLoadSavedSearchButton()
    .then(() => {
      this.findTimeout.findByLinkText(searchName).click();
    });
  }

  clickNewSearchButton() {
    return this.findTimeout
    .findByCssSelector('button[aria-label="New Search"]')
    .click();
  }

  clickSaveSearchButton() {
    return this.findTimeout
    .findByCssSelector('button[aria-label="Save Search"]')
    .click();
  }

  clickLoadSavedSearchButton() {
    return this.findTimeout
    .findDisplayedByCssSelector('button[aria-label="Load Saved Search"]')
    .click();
  }

  getCurrentQueryName() {
    return this.findTimeout
      .findByCssSelector('span.kibana-nav-info-title span')
      .getVisibleText();
  }

  getBarChartData() {
    return this.findTimeout
    .findAllByCssSelector('rect[data-label="Count"]')
    .then(function (chartData) {

      function getChartData(chart) {
        return chart
        .getAttribute('height');
      }

      var getChartDataPromises = chartData.map(getChartData);
      return Promise.all(getChartDataPromises);
    })
    .then(function (bars) {
      return bars;
    });
  }

  getChartInterval() {
    return this.findTimeout
    .findByCssSelector('a[ng-click="toggleInterval()"]')
    .getVisibleText()
    .then(intervalText => {
      if (intervalText.length > 0) {
        return intervalText;
      } else {
        return this.findTimeout
        .findByCssSelector('select[ng-model="state.interval"]')
        .getProperty('value') // this gets 'string:d' for Daily
        .then(selectedValue => {
          return this.findTimeout
          .findByCssSelector('option[value="' + selectedValue + '"]')
          .getVisibleText();
        });
      }
    });
  }

  setChartInterval(interval) {
    return this.remote.setFindTimeout(5000)
    .findByCssSelector('a[ng-click="toggleInterval()"]')
    .click()
    .catch(() => {
      // in some cases we have the link above, but after we've made a
      // selection we just have a select list.
    })
    .then(() => {
      return this.findTimeout
      .findByCssSelector('option[label="' + interval + '"]')
      .click();
    });
  }

  getHitCount() {
    return this.findTimeout
    .findByCssSelector('strong.discover-info-hits')
    .getVisibleText();
  }

  query(queryString) {
    return this.findTimeout
    .findByCssSelector('input[aria-label="Search input"]')
    .clearValue()
    .type(queryString)
    .then(() => {
      return this.findTimeout
      .findByCssSelector('button[aria-label="Search"]')
      .click();
    });
  }

  getDocHeader() {
    return this.findTimeout
    .findByCssSelector('thead.ng-isolate-scope > tr:nth-child(1)')
    .getVisibleText();
  }

  getDocTableIndex(index) {
    return this.findTimeout
    .findByCssSelector('tr.discover-table-row:nth-child(' + (index) + ')')
    .getVisibleText();
  }

  clickDocSortDown() {
    return this.findTimeout
    .findByCssSelector('.fa-sort-down')
    .click();
  }

  clickDocSortUp() {
    return this.findTimeout
    .findByCssSelector('.fa-sort-up')
    .click();
  }

  getMarks() {
    return this.findTimeout
    .findAllByCssSelector('mark')
    .getVisibleText();
  }

  clickShare() {
    return this.findTimeout
    .findByCssSelector('button[aria-label="Share Search"]')
    .click();
  }

  clickShortenUrl() {
    return this.findTimeout
    .findByCssSelector('button.shorten-button')
    .click();
  }

  clickCopyToClipboard() {
    return this.findTimeout
    .findDisplayedByCssSelector('button.clipboard-button')
    .click();
  }

  getShareCaption() {
    return this.findTimeout
    .findByCssSelector('.vis-share label')
    .getVisibleText();
  }

  getSharedUrl() {
    return this.findTimeout
    .findByCssSelector('.url')
    .getProperty('value');
  }

  getShortenedUrl() {
    return this.findTimeout
    .findByCssSelector('.url')
    .getProperty('value');
  }

  toggleSidebarCollapse() {
    return this.findTimeout.findDisplayedByCssSelector('.sidebar-collapser .chevron-cont')
      .click();
  }

  getSidebarWidth() {
    return this.findTimeout
      .findByClassName('sidebar-list')
      .getProperty('clientWidth');
  }

  hasNoResults() {
    return PageObjects.common.findTestSubject('discoverNoResults')
      .then(() => true)
      .catch(() => false);
  }

  getNoResultsTimepicker() {
    return PageObjects.common.findTestSubject('discoverNoResultsTimefilter');
  }

  hasNoResultsTimepicker() {
    return this
      .getNoResultsTimepicker()
      .then(() => true)
      .catch(() => false);
  }

}
