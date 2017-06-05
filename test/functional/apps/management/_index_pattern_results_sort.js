import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result field sort', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({});
    });

    const columns = [{
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
      describe('sort by heading - ' + col.heading, function indexPatternCreation() {
        before(function () {
          return PageObjects.settings.navigateTo()
          .then(function () {
            return PageObjects.settings.clickKibanaIndices();
          });
        });

        beforeEach(function () {
          return PageObjects.settings.createIndexPattern();
        });

        afterEach(function () {
          return PageObjects.settings.removeIndexPattern();
        });

        it('should sort ascending', function () {
          return PageObjects.settings.sortBy(col.heading)
          .then(function getText() {
            return col.selector();
          })
          .then(function (rowText) {
            screenshots.take(`Settings-indices-column-${col.heading}-sort-ascending`);
            expect(rowText).to.be(col.first);
          });
        });

        it('should sort descending', function () {
          return PageObjects.settings.sortBy(col.heading)
          .then(function sortAgain() {
            return PageObjects.settings.sortBy(col.heading);
          })
          .then(function getText() {
            return col.selector();
          })
          .then(function (rowText) {
            screenshots.take(`Settings-indices-column-${col.heading}-sort-descending`);
            expect(rowText).to.be(col.last);
          });
        });
      });
    });

    describe('field list pagination', function () {
      const EXPECTED_DEFAULT_PAGE_SIZE = 25;
      const EXPECTED_FIELD_COUNT = 85;
      const EXPECTED_LAST_PAGE_COUNT = 10;
      const LAST_PAGE_NUMBER = 4;

      before(function () {
        return PageObjects.settings.navigateTo()
        .then(function () {
          return PageObjects.settings.createIndexPattern();
        });
      });

      after(function () {
        return PageObjects.settings.removeIndexPattern();
      });

      it('makelogs data should have expected number of fields', function () {
        return retry.try(function () {
          return PageObjects.settings.getFieldsTabCount()
          .then(function (tabCount) {
            expect(tabCount).to.be('' + EXPECTED_FIELD_COUNT);
          });
        });
      });

      it('should have correct default page size selected', function () {
        return PageObjects.settings.getPageSize()
        .then(function (pageSize) {
          expect(pageSize).to.be('' + EXPECTED_DEFAULT_PAGE_SIZE);
        });
      });

      it('should have the correct number of rows per page', async function () {
        for (let pageNum = 1; pageNum <= LAST_PAGE_NUMBER; pageNum += 1) {
          await PageObjects.settings.goToPage(pageNum);
          const pageFieldNames = await retry.tryMethod(PageObjects.settings, 'getFieldNames');
          await screenshots.take(`Settings-indexed-fields-page-${pageNum}`);

          if (pageNum === LAST_PAGE_NUMBER) {
            expect(pageFieldNames).to.have.length(EXPECTED_LAST_PAGE_COUNT);
          } else {
            expect(pageFieldNames).to.have.length(EXPECTED_DEFAULT_PAGE_SIZE);
          }
        }
      });
    }); // end describe pagination
  }); // end index result field sort
}
