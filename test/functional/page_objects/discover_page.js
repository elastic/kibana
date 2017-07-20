export function DiscoverPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
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

    getTimespanText() {
      return testSubjects.find('globalTimepickerRange')
      .getVisibleText();
    }

    getChartTimespan() {
      return getRemote()
      .findByCssSelector('center.small > span:nth-child(1)')
      .getVisibleText();
    }

    saveSearch(searchName) {
      return this.clickSaveSearchButton()
      .then(() => {
        log.debug('--saveSearch button clicked');
        return getRemote().findDisplayedById('SaveSearch')
        .pressKeys(searchName);
      })
      .then(() => {
        log.debug('--find save button');
        return testSubjects.click('discoverSaveSearchButton');
      });
    }

    loadSavedSearch(searchName) {
      return this.clickLoadSavedSearchButton()
      .then(() => {
        getRemote().findByPartialLinkText(searchName).click();
      })
      .then(() => {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    clickNewSearchButton() {
      return testSubjects.click('discoverNewButton');
    }

    clickSaveSearchButton() {
      return testSubjects.click('discoverSaveButton');
    }

    clickLoadSavedSearchButton() {
      return testSubjects.click('discoverOpenButton');
    }

    getCurrentQueryName() {
      return testSubjects.find('discoverCurrentQuery')
        .getVisibleText();
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

    getChartInterval() {
      return testSubjects.find('discoverIntervalSelect')
      .getProperty('value')
      .then(selectedValue => {
        return getRemote()
        .findByCssSelector('option[value="' + selectedValue + '"]')
        .getVisibleText();
      });
    }

    setChartInterval(interval) {
      return getRemote()
      .setFindTimeout(5000)
      .findByCssSelector('option[label="' + interval + '"]')
      .click()
      .then(() => {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    getHitCount() {
      return PageObjects.header.waitUntilLoadingHasFinished()
      .then(() => {
        return testSubjects.find('discoverQueryHits')
        .getVisibleText();
      });
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
      .findByCssSelector('thead.ng-isolate-scope > tr:nth-child(1)')
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

    clickCopyToClipboard() {
      return testSubjects.click('sharedSnapshotCopyButton');
    }

    getShareCaption() {
      return testSubjects.find('shareUiTitle')
      .getVisibleText();
    }

    getSharedUrl() {
      return testSubjects.find('sharedSnapshotUrl')
      .getProperty('value');
    }

    toggleSidebarCollapse() {
      return testSubjects.find('collapseSideBarButton').click();
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

    hasNoResults() {
      return testSubjects.find('discoverNoResults')
      .then(() => true)
      .catch(() => false);
    }

    getNoResultsTimepicker() {
      return testSubjects.find('discoverNoResultsTimefilter');
    }

    hasNoResultsTimepicker() {
      return this
      .getNoResultsTimepicker()
      .then(() => true)
      .catch(() => false);
    }

    clickFieldListItem(field) {
      return testSubjects.click(`field-${field}`);
    }

    async clickFieldListItemAdd(field) {
      const listEntry = await testSubjects.find(`field-${field}`);
      await getRemote().moveMouseTo(listEntry);
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

    async removeAllFilters() {
      await testSubjects.click('showFilterActions');
      await testSubjects.click('removeAllFilters');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitUntilUrlIncludes('filters:!()');
    }
  }

  return new DiscoverPage();
}
