define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('creating and deleting default index', function describeIndexTests() {
      var common;
      var settingsPage;
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        remote = this.remote;

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return settingsPage.navigateTo();
        });
      });

      bdd.describe('index pattern creation', function indexPatternCreation() {
        bdd.before(function () {
          return settingsPage.createIndexPattern();
        });

        bdd.it('should have index pattern in page header', function pageHeader() {
          return settingsPage.getIndexPageHeading().getVisibleText()
          .then(function (patternName) {
            expect(patternName).to.be('logstash-*');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should have index pattern in url', function url() {
          return common.tryForTime(5000, function () {
            return remote.getCurrentUrl()
            .then(function (currentUrl) {
              expect(currentUrl).to.contain('logstash-*');
            });
          })
          .catch(common.handleError(this));
        });

        bdd.it('should have expected table headers', function checkingHeader() {
          return settingsPage.getTableHeader()
          .then(function (headers) {
            common.debug('header.length = ' + headers.length);
            var expectedHeaders = [
              'name',
              'type',
              'format',
              'analyzed',
              'indexed',
              'controls'
            ];

            // 6 name   type  format  analyzed  indexed   controls
            expect(headers.length).to.be(expectedHeaders.length);

            var comparedHeaders = headers.map(function compareHead(header, i) {
              return header.getVisibleText()
              .then(function (text) {
                expect(text).to.be(expectedHeaders[i]);
              });
            });

            return Promise.all(comparedHeaders);
          })
          .catch(common.handleError(this));
        });
      });

      bdd.describe('index pattern deletion', function indexDelete() {
        bdd.before(function () {
          var expectedAlertText = 'Are you sure you want to remove this index pattern?';
          return settingsPage.removeIndexPattern()
          .then(function (alertText) {
            expect(alertText).to.be(expectedAlertText);
          });
        });

        bdd.it('should return to index pattern creation page', function returnToPage() {
          return common.tryForTime(5000, function () {
            return settingsPage.getCreateButton();
          })
          .catch(common.handleError(this));
        });

        bdd.it('should remove index pattern from url', function indexNotInUrl() {
          // give the url time to settle
          return common.tryForTime(5000, function () {
            return remote.getCurrentUrl()
            .then(function (currentUrl) {
              common.debug('currentUrl = ' + currentUrl);
              expect(currentUrl).to.not.contain('logstash-*');
            });
          })
          .catch(common.handleError(this));
        });
      });
    });
  };
});
