
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
      return PageObjects.common.findTestSubject('discover-save-search-btn').click();
    });
  }

  loadSavedSearch(searchName) {
    return this.clickLoadSavedSearchButton()
    .then(() => {
      this.findTimeout.findByLinkText(searchName).click();
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  }

  clickNewSearchButton() {
    return PageObjects.common.findTestSubject('discoverNewButton')
    .click();
  }

  clickSaveSearchButton() {
    return PageObjects.common.findTestSubject('discoverSaveButton')
    .click();
  }

  clickLoadSavedSearchButton() {
    return PageObjects.common.findTestSubject('discoverOpenButton')
    .click();
  }

  getCurrentQueryName() {
    return PageObjects.common.findTestSubject('discoverCurrentQuery')
      .getVisibleText();
  }

  getBarChartData() {
    var self = this;
    var yAxisLabel = 0;
    var yAxisHeight;

    return PageObjects.header.isGlobalLoadingIndicatorHidden()
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
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function (bars) {
          return bars;
        });
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
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  }

  getHitCount() {
    return PageObjects.header.isGlobalLoadingIndicatorHidden()
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
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
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
    return PageObjects.common.findTestSubject('discoverShareButton')
    .click();
  }

  clickShortenUrl() {
    return PageObjects.common.findTestSubject('sharedSnapshotShortUrlButton')
    .click();
  }

  clickCopyToClipboard() {
    return PageObjects.common.findTestSubject('sharedSnapshotCopyButton')
    .click();
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
    return this.findTimeout
    .findByCssSelector('li[attr-field="' + field + '"]').click();
  }

  clickFieldListItemAdd(field) {
    return this.findTimeout
    .findByCssSelector('li[attr-field="' + field + '"] > div > button').click();
  }

  clickFieldListItemVisualize(field) {
    return this.findTimeout
    .findByCssSelector('li[attr-field="' + field + '"] > a').click();
  }

  clickFieldListPlusFilter(field, value) {
    // this method requires the field details to be open from clickFieldListItem()
    return PageObjects.common.findTestSubject('plus-' + field + '-' + value)
    .click();
  }

  clickFieldListMinusFilter(field, value) {
    // this method requires the field details to be open from clickFieldListItem()
    return PageObjects.common.findTestSubject('minus-' + field + '-' + value)
    .click();
  }

  // this doesn't work yet.  Seems like we have to mouse over first to get it to appear?
  removeFilter(field) {
    return PageObjects.common.findTestSubject('removeFilter-' + field)
    .click();
  }

  // this doesn't work yet.  Seems like we have to mouse over first to get it to appear?
  disableFilter(field) {
    return PageObjects.common.findTestSubject('disableFilter-' + field)
    .click();
  }

  removeAllFilters() {
    return this.findTimeout
    .findByCssSelector('a[ng-click="showFilterActions = !showFilterActions"]')
    .click()
    .then(() => {
      return this.findTimeout
      .findByCssSelector('a[ng-click="removeAll()"]')
      .click();
    });
  }


}
