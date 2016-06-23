
import Common from './common.js';
import { defaultFindTimeout } from '../';

let thisTime;

export default class DiscoverPage extends Common {

  constructor() {
    super();
  }

  init(remote) {
    super.init(remote);
    thisTime = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getQueryField() {
    return thisTime
    .findByCssSelector('input[ng-model=\'state.query\']');
  }

  getQuerySearchButton() {
    return thisTime
    .findByCssSelector('button[aria-label=\'Search\']');
  }

  getTimespanText() {
    return thisTime
    .findByCssSelector('.kibana-nav-options .navbar-timepicker-time-desc pretty-duration')
    .getVisibleText();
  }

  getChartTimespan() {
    return thisTime
    .findByCssSelector('center.small > span:nth-child(1)')
    .getVisibleText();
  }

  saveSearch(searchName) {
    return this.clickSaveSearchButton()
    .then(() => {
      this.debug('--saveSearch button clicked');
      return thisTime.findDisplayedById('SaveSearch')
      .pressKeys(searchName);
    })
    .then(() => {
      this.debug('--find save button');
      return this.findTestSubject('discover-save-search-btn').click();
    });
  }

  loadSavedSearch(searchName) {
    var self = this;
    return self.clickLoadSavedSearchButton()
    .then(function () {
      thisTime.findByLinkText(searchName).click();
    });
  }

  clickNewSearchButton() {
    return thisTime
    .findByCssSelector('button[aria-label="New Search"]')
    .click();
  }

  clickSaveSearchButton() {
    return thisTime
    .findByCssSelector('button[aria-label="Save Search"]')
    .click();
  }

  clickLoadSavedSearchButton() {
    return thisTime
    .findDisplayedByCssSelector('button[aria-label="Load Saved Search"]')
    .click();
  }

  getCurrentQueryName() {
    return thisTime
      .findByCssSelector('span.kibana-nav-info-title span')
      .getVisibleText();
  }

  getBarChartData() {
    return thisTime
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
    return thisTime
    .findByCssSelector('a[ng-click="toggleInterval()"]')
    .getVisibleText()
    .then(function (intervalText) {
      if (intervalText.length > 0) {
        return intervalText;
      } else {
        return thisTime
        .findByCssSelector('select[ng-model="state.interval"]')
        .getProperty('value') // this gets 'string:d' for Daily
        .then(function (selectedValue) {
          return thisTime
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
    .catch(function () {
      // in some cases we have the link above, but after we've made a
      // selection we just have a select list.
    })
    .then(function () {
      return thisTime
      .findByCssSelector('option[label="' + interval + '"]')
      .click();
    });
  }

  getHitCount() {
    return thisTime
    .findByCssSelector('strong.discover-info-hits')
    .getVisibleText();
  }

  query(queryString) {
    return thisTime
    .findByCssSelector('input[aria-label="Search input"]')
    .clearValue()
    .type(queryString)
    .then(function () {
      return thisTime
      .findByCssSelector('button[aria-label="Search"]')
      .click();
    });
  }

  getDocHeader() {
    return thisTime
    .findByCssSelector('thead.ng-isolate-scope > tr:nth-child(1)')
    .getVisibleText();
  }

  getDocTableIndex(index) {
    return thisTime
    .findByCssSelector('tr.discover-table-row:nth-child(' + (index) + ')')
    .getVisibleText();
  }

  clickDocSortDown() {
    return thisTime
    .findByCssSelector('.fa-sort-down')
    .click();
  }

  clickDocSortUp() {
    return thisTime
    .findByCssSelector('.fa-sort-up')
    .click();
  }

  getMarks() {
    return thisTime
    .findAllByCssSelector('mark')
    .getVisibleText();
  }

  clickShare() {
    return thisTime
    .findByCssSelector('button[aria-label="Share Search"]')
    .click();
  }

  clickShortenUrl() {
    return thisTime
    .findByCssSelector('button.shorten-button')
    .click();
  }

  clickCopyToClipboard() {
    return thisTime
    .findDisplayedByCssSelector('button.clipboard-button')
    .click();
  }

  getShareCaption() {
    return thisTime
    .findByCssSelector('.vis-share label')
    .getVisibleText();
  }

  getSharedUrl() {
    return thisTime
    .findByCssSelector('.url')
    .getProperty('value');
  }

  getShortenedUrl() {
    return thisTime
    .findByCssSelector('.url')
    .getProperty('value');
  }

  toggleSidebarCollapse() {
    return thisTime.findDisplayedByCssSelector('.sidebar-collapser .chevron-cont')
      .click();
  }

  getSidebarWidth() {
    return thisTime
      .findByClassName('sidebar-list')
      .getProperty('clientWidth');
  }

  hasNoResults() {
    return this
      .findTestSubject('discoverNoResults')
      .then(() => true)
      .catch(() => false);
  }

  getNoResultsTimepicker() {
    return this.findTestSubject('discoverNoResultsTimefilter');
  }

  hasNoResultsTimepicker() {
    return this
      .getNoResultsTimepicker()
      .then(() => true)
      .catch(() => false);
  }

}
