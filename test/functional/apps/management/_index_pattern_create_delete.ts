/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);

  describe('creating and deleting default index', function describeIndexTests() {
    before(async function () {
      await esArchiver.emptyKibanaIndex();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    describe('can open and close editor', function () {
      it('without creating index pattern', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await testSubjects.click('closeFlyoutButton');
        await testSubjects.find('createIndexPatternButton');
      });
    });

    describe('validation', function () {
      it('can display errors', async function () {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.settings.setIndexPatternField('log-fake*');
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        await find.byClassName('euiFormErrorText');
      });

      it('can resolve errors and submit', async function () {
        await PageObjects.settings.setIndexPatternField('log*');
        await (await PageObjects.settings.getSaveDataViewButtonActive()).click();
        await PageObjects.settings.removeIndexPattern();
      });
    });

    describe('special character handling', () => {
      it('should handle special charaters in template input', async () => {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.setIndexPatternField('❤️');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('createIndexPatternStatusMessage')).to.contain(
            `The index pattern you entered doesn\'t match any data streams, indices, or index aliases.`
          );
        });
      });

      after(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
      });
    });

    describe('index pattern creation', function indexPatternCreation() {
      let indexPatternId: string;

      before(function () {
        return PageObjects.settings
          .createIndexPattern('logstash-*')
          .then((id) => (indexPatternId = id));
      });

      it('should have index pattern in page header', async function () {
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('logstash-*');
      });

      it('should have index pattern in url', function url() {
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            expect(currentUrl).to.contain(indexPatternId);
          });
        });
      });

      it('should have expected table headers', function checkingHeader() {
        return PageObjects.settings.getTableHeader().then(function (headers) {
          log.debug('header.length = ' + headers.length);
          const expectedHeaders = [
            'Name',
            'Type',
            'Format',
            'Searchable',
            'Aggregatable',
            'Excluded',
          ];

          expect(headers.length).to.be(expectedHeaders.length);

          const comparedHeaders = headers.map(function compareHead(header, i) {
            return header.getVisibleText().then(function (text) {
              expect(text).to.be(expectedHeaders[i]);
            });
          });

          return Promise.all(comparedHeaders);
        });
      });
    });

    describe('index pattern deletion', function indexDelete() {
      before(function () {
        const expectedAlertText = 'Delete data view';
        return PageObjects.settings.removeIndexPattern().then(function (alertText) {
          expect(alertText).to.be(expectedAlertText);
        });
      });

      it('should return to index pattern list', function indexNotInUrl() {
        // give the url time to settle
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            log.debug('currentUrl = ' + currentUrl);
            expect(currentUrl).to.contain('management/kibana/dataViews');
          });
        });
      });
    });
  });
}
