import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result field sort', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({});
    });

    const columns = [{
      heading: 'Name',
      first: '@message',
      last: 'xss.raw',
      selector: function () {
        return PageObjects.settings.getTableRow(0, 0).getVisibleText();
      }
    }, {
      heading: 'Type',
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
              expect(rowText).to.be(col.last);
            });
        });
      });
    });

    describe('field list pagination', function () {
      const EXPECTED_FIELD_COUNT = 86;

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
    }); // end describe pagination
  }); // end index result field sort
}
