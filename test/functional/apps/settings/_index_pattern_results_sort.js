define(function (require) {
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var expect = require('intern/dojo/node!expect.js');
  var Promise = require('bluebird');

  return function (bdd) {
    bdd.describe('index result field sort', function describeIndexTests() {
      var common;
      var settingsPage;
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        remote = this.remote;
      });

      bdd.beforeEach(function be() {
        return settingsPage.createIndexPattern();
      });

      bdd.afterEach(function ae() {
        return settingsPage.removeIndexPattern();
      });


      bdd.describe('sort by name', function indexPatternCreation() {

        bdd.it('should sort ascending', function pageHeader() {
          return settingsPage.sortBy('name')
          .then(function getText() {
            return settingsPage.getTableRow(0, 0).getVisibleText();
          })
          .then(function (rowText) {
            expect(rowText).to.be('@message');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should sort descending', function pageHeader() {
          return settingsPage.sortBy('name')
          .then(function sortAgain() {
            return settingsPage.sortBy('name');
          })
          .then(function getText() {
            return settingsPage.getTableRow(0, 0).getVisibleText();
          })
          .then(function (rowText) {
            expect(rowText).to.be('xss.raw');
          })
          .catch(common.handleError(this));
        });
      });

      bdd.describe('sort by type', function indexPatternCreation() {

        bdd.it('should sort ascending', function pageHeader() {
          return settingsPage.sortBy('type')
          .then(function getText() {
            return settingsPage.getTableRow(0, 1).getVisibleText();
          })
          .then(function (rowText) {
            expect(rowText).to.be('_source');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should sort descending', function pageHeader() {
          return settingsPage.sortBy('type')
          .then(function sortAgain() {
            return settingsPage.sortBy('type');
          })
          .then(function getText() {
            return settingsPage.getTableRow(0, 1).getVisibleText();
          })
          .then(function (rowText) {
            expect(rowText).to.be('string');
          })
          .catch(common.handleError(this));
        });
      });

      bdd.describe('pagination', function () {
        var expectedDefaultPageSize = 25;
        var expectedFieldCount = 85;
        var expectedLastPageCount = 10;
        var pages = [1, 2, 3, 4];

        bdd.it('makelogs data should have expected number of fields', function () {
          return common.sleep(1000)
          .then(function () {
            return common.tryForTime(5000, function () {
              return settingsPage.getFieldsTabCount()
              .then(function (tabCount) {
                expect(tabCount).to.be('' + expectedFieldCount);
              });
            });
          })
          .catch(common.handleError(this));
        });

        bdd.it('should have correct default page size selected', function () {
          return settingsPage.getPageSize()
          .then(function (pageSize) {
            expect(pageSize).to.be('' + expectedDefaultPageSize);
          })
          .catch(common.handleError(this));
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
                var expectedSize = (val < 4) ? expectedDefaultPageSize : expectedLastPageCount;
                expect(pageCount.length).to.be(expectedSize);
              });
            });
          }, Promise.resolve());

          return chain.catch(common.handleError(this));
        });

      }); // end describe pagination

    }); // end index result field sort
  };
});
