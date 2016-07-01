
import expect from 'expect.js';

import {
  bdd,
  remote,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('creating and deleting default index', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickExistingData();
    });
  });

  bdd.describe('index pattern creation', function indexPatternCreation() {
    bdd.before(function () {
      return PageObjects.settings.createIndexPattern();
    });

    bdd.it('should have index pattern in page header', function pageHeader() {
      return PageObjects.settings.getIndexPageHeading().getVisibleText()
      .then(function (patternName) {
        PageObjects.common.saveScreenshot('Settings-indices-new-index-pattern');
        expect(patternName).to.be('logstash-*');
      });
    });

    bdd.it('should have index pattern in url', function url() {
      return PageObjects.common.try(function tryingForTime() {
        return remote.getCurrentUrl()
        .then(function (currentUrl) {
          expect(currentUrl).to.contain('logstash-*');
        });
      });
    });

    bdd.it('should have expected table headers', function checkingHeader() {
      return PageObjects.settings.getTableHeader()
      .then(function (headers) {
        PageObjects.common.debug('header.length = ' + headers.length);
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
      return PageObjects.settings.removeIndexPattern()
      .then(function (alertText) {
        PageObjects.common.saveScreenshot('Settings-indices-confirm-remove-index-pattern');
        expect(alertText).to.be(expectedAlertText);
      });
    });

    bdd.it('should return to index pattern creation page', function returnToPage() {
      return PageObjects.common.try(function tryingForTime() {
        return PageObjects.settings.getCreateButton();
      });
    });

    bdd.it('should remove index pattern from url', function indexNotInUrl() {
      // give the url time to settle
      return PageObjects.common.try(function tryingForTime() {
        return remote.getCurrentUrl()
        .then(function (currentUrl) {
          PageObjects.common.debug('currentUrl = ' + currentUrl);
          expect(currentUrl).to.not.contain('logstash-*');
        });
      });
    });
  });
});
