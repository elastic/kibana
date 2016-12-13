
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
    const EXPECTED_DEFAULT_PAGE_SIZE = 25;
    const EXPECTED_FIELD_COUNT = 85;
    const EXPECTED_LAST_PAGE_COUNT = 10;
    const LAST_PAGE_NUMBER = 4;

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
          expect(tabCount).to.be('' + EXPECTED_FIELD_COUNT);
        });
      });
    });

    bdd.it('should have correct default page size selected', function () {
      return PageObjects.settings.getPageSize()
      .then(function (pageSize) {
        expect(pageSize).to.be('' + EXPECTED_DEFAULT_PAGE_SIZE);
      });
    });

    bdd.it('should have the correct number of rows per page', async function () {
      for (let pageNum = 1; pageNum <= LAST_PAGE_NUMBER; pageNum += 1) {
        await PageObjects.settings.goToPage(pageNum);
        const pageFieldNames = await PageObjects.common.tryMethod(PageObjects.settings, 'getFieldNames');
        await PageObjects.common.saveScreenshot(`Settings-indexed-fields-page-${pageNum}`);

        if (pageNum === LAST_PAGE_NUMBER) {
          expect(pageFieldNames).to.have.length(EXPECTED_LAST_PAGE_COUNT);
        } else {
          expect(pageFieldNames).to.have.length(EXPECTED_DEFAULT_PAGE_SIZE);
        }
      }
    });
  }); // end describe pagination
}); // end index result field sort
