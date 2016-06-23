import {
  bdd,
  common,
  defaultTimeout,
  settingsPage,
  scenarioManager,
  esClient
} from '../../../support';

var expect = require('expect.js');

bdd.describe('index result field sort', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc();
  });

  var columns = [{
    heading: 'name',
    first: '@message',
    last: 'xss.raw',
    selector: function () {
      return settingsPage.getTableRow(0, 0).getVisibleText();
    }
  }, {
    heading: 'type',
    first: '_source',
    last: 'string',
    selector: function () {
      return settingsPage.getTableRow(0, 1).getVisibleText();
    }
  }];

  columns.forEach(function (col) {
    bdd.describe('sort by heading - ' + col.heading, function indexPatternCreation() {
      bdd.before(function () {
        return settingsPage.navigateTo()
        .then(function () {
          return settingsPage.clickExistingData();
        });
      });

      bdd.beforeEach(function () {
        return settingsPage.createIndexPattern();
      });

      bdd.afterEach(function () {
        return settingsPage.removeIndexPattern();
      });

      bdd.it('should sort ascending', function pageHeader() {
        return settingsPage.sortBy(col.heading)
        .then(function getText() {
          return col.selector();
        })
        .then(function (rowText) {
          common.saveScreenshot(`Settings-indices-column-${col.heading}-sort-ascending`);
          expect(rowText).to.be(col.first);
        });
      });

      bdd.it('should sort descending', function pageHeader() {
        return settingsPage.sortBy(col.heading)
        .then(function sortAgain() {
          return settingsPage.sortBy(col.heading);
        })
        .then(function getText() {
          return col.selector();
        })
        .then(function (rowText) {
          common.saveScreenshot(`Settings-indices-column-${col.heading}-sort-descending`);
          expect(rowText).to.be(col.last);
        });
      });
    });
  });

  bdd.describe('field list pagination', function () {
    var expectedDefaultPageSize = 25;
    var expectedFieldCount = 85;
    var expectedLastPageCount = 10;
    var pages = [1, 2, 3, 4];

    bdd.before(function () {
      return settingsPage.navigateTo()
      .then(function () {
        return settingsPage.createIndexPattern();
      });
    });

    bdd.after(function () {
      return settingsPage.removeIndexPattern();
    });

    bdd.it('makelogs data should have expected number of fields', function () {
      return common.try(function () {
        return settingsPage.getFieldsTabCount()
        .then(function (tabCount) {
          expect(tabCount).to.be('' + expectedFieldCount);
        });
      });
    });

    bdd.it('should have correct default page size selected', function () {
      return settingsPage.getPageSize()
      .then(function (pageSize) {
        expect(pageSize).to.be('' + expectedDefaultPageSize);
      });
    });

    bdd.it('should have the correct number of rows per page', function () {
      var pageCount = Math.ceil(expectedFieldCount / expectedDefaultPageSize);
      var chain = pages.reduce(function (chain, val) {
        return chain.then(function () {
          return settingsPage.goToPage(val)
          .then(function () {
            return common.sleep(1000);
          })
          .then(function () {
            return settingsPage.getPageFieldCount();
          })
          .then(function (pageCount) {
            common.saveScreenshot('Settings-indices-paged');
            var expectedSize = (val < 4) ? expectedDefaultPageSize : expectedLastPageCount;
            expect(pageCount.length).to.be(expectedSize);
          });
        });
      }, Promise.resolve());

      return chain.catch(common.createErrorHandler(this));
    });
  }); // end describe pagination
}); // end index result field sort
