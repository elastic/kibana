
import expect from 'expect.js';

import {
  bdd,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('creating and deleting default index', function describeIndexTests() {
  bdd.before(function () {
    PageObjects.remote.setWindowSize(1200,800);
  });

  bdd.describe('index pattern creation', function indexPatternCreation() {
    bdd.before(async function () {
      await PageObjects.common.tryForTime(120000, async function () {
        await PageObjects.common.navigateToApp('settings', 'power', 'changeme');
        PageObjects.common.debug('create Index Pattern');
        await PageObjects.settings.createIndexPattern();
      });
    });

    bdd.it('should have index pattern in page header', function pageHeader() {
      return PageObjects.settings.getIndexPageHeading().getVisibleText()
      .then(function (patternName) {
        expect(patternName).to.be('logstash-*');
      });
    });

    bdd.it('should have expected table headers', function checkingHeader() {
      return PageObjects.settings.getTableHeader()
      .then(function (headers) {
        PageObjects.common.debug('header.length = ' + headers.length);
        const expectedHeaders = [
          'Name',
          'Type',
          'Format',
          'Searchable',
          'Aggregatable',
          'Excluded',
          ''
        ];

        expect(headers.length).to.be(expectedHeaders.length);

        const comparedHeaders = headers.map(function compareHead(header, i) {
          return header.getVisibleText()
          .then(function (text) {
            expect(text).to.be(expectedHeaders[i]);
          });
        });
        return Promise.all(comparedHeaders);
      });
    });
    //changed file
    bdd.it('create makelogs工程 index pattern', function pageHeader() {
      PageObjects.common.debug('create makelogs工程 index pattern');
      return PageObjects.settings.createIndexPattern('makelogs工程-*');
      return PageObjects.settings.getIndexPageHeading().getVisibleText()
      .then(function (patternName) {
        expect(patternName).to.be('makelogs-');
      });
    });

  });
});
