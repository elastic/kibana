import {
  bdd,
  common,
  remote,
  scenarioManager,
  settingsPage,
  esClient
} from '../../../support';

var expect = require('expect.js');

bdd.describe('creating and deleting default index', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return settingsPage.navigateTo();
    })
    .then(function () {
      return settingsPage.clickExistingData();
    });
  });

  bdd.describe('index pattern creation', function indexPatternCreation() {
    bdd.before(function () {
      return settingsPage.createIndexPattern();
    });

    bdd.it('should have index pattern in page header', function pageHeader() {
      return settingsPage.getIndexPageHeading().getVisibleText()
      .then(function (patternName) {
        common.saveScreenshot('Settings-indices-new-index-pattern');
        expect(patternName).to.be('logstash-*');
      });
    });

    bdd.it('should have index pattern in url', function url() {
      return common.try(function tryingForTime() {
        return remote.getCurrentUrl()
        .then(function (currentUrl) {
          expect(currentUrl).to.contain('logstash-*');
        });
      });
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
      });
    });
  });

  bdd.describe('index pattern deletion', function indexDelete() {
    bdd.before(function () {
      var expectedAlertText = 'Are you sure you want to remove this index pattern?';
      return settingsPage.removeIndexPattern()
      .then(function (alertText) {
        common.saveScreenshot('Settings-indices-confirm-remove-index-pattern');
        expect(alertText).to.be(expectedAlertText);
      });
    });

    bdd.it('should return to index pattern creation page', function returnToPage() {
      return common.try(function tryingForTime() {
        return settingsPage.getCreateButton();
      });
    });

    bdd.it('should remove index pattern from url', function indexNotInUrl() {
      // give the url time to settle
      return common.try(function tryingForTime() {
        return remote.getCurrentUrl()
        .then(function (currentUrl) {
          common.debug('currentUrl = ' + currentUrl);
          expect(currentUrl).to.not.contain('logstash-*');
        });
      });
    });
  });
});
