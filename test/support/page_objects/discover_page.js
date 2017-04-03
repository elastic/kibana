
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
    return PageObjects.common.findTestSubject('globalTimepickerRange')
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
      return PageObjects.common.clickTestSubject('discover-save-search-btn');
    });
  }

  loadSavedSearch(searchName) {
    return this.clickLoadSavedSearchButton()
    .then(() => {
      this.findTimeout.findByPartialLinkText(searchName).click();
    })
    .then(() => {
      return PageObjects.header.waitUntilLoadingHasFinished();
    });
  }

  clickNewSearchButton() {
    return PageObjects.common.clickTestSubject('discoverNewButton');
  }

  clickSaveSearchButton() {
    return PageObjects.common.clickTestSubject('discoverSaveButton');
  }

  clickLoadSavedSearchButton() {
    return PageObjects.common.clickTestSubject('discoverOpenButton');
  }

  getCurrentQueryName() {
    return PageObjects.common.findTestSubject('discoverCurrentQuery')
      .getVisibleText();
  }

  getBarChartData() {
    const self = this;
    let yAxisLabel = 0;
    let yAxisHeight;

    return PageObjects.header.waitUntilLoadingHasFinished()
    .then(() => {
      return this.findTimeout
        .findByCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type');
    })
    .then(function setYAxisLabel(y) {
      return y
        .getVisibleText()
        .then(function (yLabel) {
          yAxisLabel = yLabel.replace(',', '');
          PageObjects.common.debug('yAxisLabel = ' + yAxisLabel);
          return yLabel;
        });
    })
    // 2). find and save the y-axis pixel size (the chart height)
    .then(function getRect() {
      return self
        .findTimeout
        .findByCssSelector('rect.background')
        .then(function getRectHeight(chartAreaObj) {
          return chartAreaObj
            .getAttribute('height')
            .then(function (theHeight) {
              yAxisHeight = theHeight; // - 5; // MAGIC NUMBER - clipPath extends a bit above the top of the y-axis and below x-axis
              PageObjects.common.debug('theHeight = ' + theHeight);
              return theHeight;
            });
        });
    })
    // 3). get the chart-wrapper elements
    .then(function () {
      return self
        .findTimeout
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

  getChartInterval() {
    return PageObjects.common.findTestSubject('discoverIntervalSelect')
    .getProperty('value')
    .then(selectedValue => {
      return this.findTimeout
      .findByCssSelector('option[value="' + selectedValue + '"]')
      .getVisibleText();
    });
  }

  setChartInterval(interval) {
    return this.remote.setFindTimeout(5000)
    .findByCssSelector('option[label="' + interval + '"]')
    .click()
    .then(() => {
      return PageObjects.header.waitUntilLoadingHasFinished();
    });
  }

  getHitCount() {
    return PageObjects.header.waitUntilLoadingHasFinished()
    .then(() => {
      return PageObjects.common.findTestSubject('discoverQueryHits')
      .getVisibleText();
    });
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
    })
    .then(() => {
      return PageObjects.header.waitUntilLoadingHasFinished();
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
    return PageObjects.common.clickTestSubject('discoverShareButton');
  }

  clickShortenUrl() {
    return PageObjects.common.clickTestSubject('sharedSnapshotShortUrlButton');
  }

  clickCopyToClipboard() {
    return PageObjects.common.clickTestSubject('sharedSnapshotCopyButton');
  }

  getShareCaption() {
    return PageObjects.common.findTestSubject('shareUiTitle')
    .getVisibleText();
  }

  getSharedUrl() {
    return PageObjects.common.findTestSubject('sharedSnapshotUrl')
    .getProperty('value');
  }

  toggleSidebarCollapse() {
    return this.findTimeout.findDisplayedByCssSelector('.sidebar-collapser .chevron-cont')
      .click();
  }

  getAllFieldNames() {
    return this.findTimeout
    .findAllByClassName('sidebar-item')
    .then((items) => {
      return Promise.all(items.map((item) => item.getVisibleText()));
    });
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

  clickFieldListItem(field) {
    return PageObjects.common.clickTestSubject(`field-${field}`);
  }

  async clickFieldListItemAdd(field) {
    const listEntry = await PageObjects.common.findTestSubject(`field-${field}`);
    await this.remote.moveMouseTo(listEntry);
    await PageObjects.common.clickTestSubject(`fieldToggle-${field}`);
  }

  async clickFieldListItemVisualize(field) {
    return await PageObjects.common.try(async () => {
      await PageObjects.common.clickTestSubject('fieldVisualize-' + field);
    });
  }

  clickFieldListPlusFilter(field, value) {
    // this method requires the field details to be open from clickFieldListItem()
    // findTestSubject doesn't handle spaces in the data-test-subj value
    return this.findTimeout
    .findByCssSelector('i[data-test-subj="plus-' + field + '-' + value + '"]')
    .click();
  }

  clickFieldListMinusFilter(field, value) {
    // this method requires the field details to be open from clickFieldListItem()
    // findTestSubject doesn't handle spaces in the data-test-subj value
    return this.findTimeout
    .findByCssSelector('i[data-test-subj="minus-' + field + '-' + value + '"]')
    .click();
  }

  async removeAllFilters() {
    await PageObjects.common.clickTestSubject('showFilterActions');
    await PageObjects.common.clickTestSubject('removeAllFilters');
    await PageObjects.header.waitUntilLoadingHasFinished();
  }


}
