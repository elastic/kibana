
import expect from 'expect.js';

import {
  bdd,
  defaultTimeout,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('index result field sort', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc();
  });

  let columns = [{
    heading: 'name',
    first: '@message',
    last: 'xss.raw',
    selector: function () {
      return PageObjects.settings.getTableRow(0, 0).getVisibleText();
    }
  }, {
    heading: 'type',
    first: '_source',
    last: 'string',
    selector: function () {
      return PageObjects.settings.getTableRow(0, 1).getVisibleText();
    }
  }];

  columns.forEach(function (col) {
    bdd.describe('sort by heading - ' + col.heading, function indexPatternCreation() {
      bdd.before(function () {
        return PageObjects.settings.navigateTo()
        .then(function () {
          return PageObjects.settings.clickKibanaIndicies();
        });
      });

      bdd.beforeEach(function () {
        return PageObjects.settings.createIndexPattern();
      });

      bdd.afterEach(function () {
        return PageObjects.settings.removeIndexPattern();
      });

      bdd.it('should sort ascending', function () {
        return PageObjects.settings.sortBy(col.heading)
        .then(function getText() {
          return col.selector();
        })
        .then(function (rowText) {
          PageObjects.common.saveScreenshot(`Settings-indices-column-${col.heading}-sort-ascending`);
          expect(rowText).to.be(col.first);
        });
      });

      bdd.it('should sort descending', function () {
        return PageObjects.settings.sortBy(col.heading)
        .then(function sortAgain() {
          return PageObjects.settings.sortBy(col.heading);
        })
        .then(function getText() {
          return col.selector();
        })
        .then(function (rowText) {
          PageObjects.common.saveScreenshot(`Settings-indices-column-${col.heading}-sort-descending`);
          expect(rowText).to.be(col.last);
        });
      });
    });
  });

  bdd.describe('field list pagination', function () {
    let expectedDefaultPageSize = 25;
    let expectedFieldCount = 85;
    let expectedLastPageCount = 10;
    let pages = [1, 2, 3, 4];

    bdd.before(function () {
      return PageObjects.settings.navigateTo()
      .then(function () {
        return PageObjects.settings.createIndexPattern();
      });
    });

    bdd.after(function () {
      return PageObjects.settings.removeIndexPattern();
    });

    bdd.it('makelogs data should have expected number of fields', function () {
      return PageObjects.common.try(function () {
        return PageObjects.settings.getFieldsTabCount()
        .then(function (tabCount) {
          expect(tabCount).to.be('' + expectedFieldCount);
        });
      });
    });

    bdd.it('should have correct default page size selected', function () {
      return PageObjects.settings.getPageSize()
      .then(function (pageSize) {
        expect(pageSize).to.be('' + expectedDefaultPageSize);
      });
    });

    bdd.it('should have the correct number of rows per page', function () {
      let pageCount = Math.ceil(expectedFieldCount / expectedDefaultPageSize);
      let chain = pages.reduce(function (chain, val) {
        return chain.then(function () {
          return PageObjects.settings.goToPage(val)
          .then(function () {
            return PageObjects.common.sleep(1000);
          })
          .then(function () {
            return PageObjects.settings.getPageFieldCount();
          })
          .then(function (pageCount) {
            PageObjects.common.saveScreenshot('Settings-indices-paged');
            let expectedSize = (val < 4) ? expectedDefaultPageSize : expectedLastPageCount;
            expect(pageCount.length).to.be(expectedSize);
          });
        });
      }, Promise.resolve());

      return chain.catch(PageObjects.common.createErrorHandler(this));
    });
  }); // end describe pagination
}); // end index result field sort
