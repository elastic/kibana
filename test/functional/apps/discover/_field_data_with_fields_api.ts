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
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const queryBar = getService('queryBar');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'visualize', 'timePicker']);
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  describe('discover tab with new fields API', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'discover:searchFieldsFromSource': false,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });
    describe('field data', function () {
      it('search php should show the correct hit count', async function () {
        const expectedHitCount = '445';
        await retry.try(async function () {
          await queryBar.setQuery('php');
          await queryBar.submitQuery();
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
        });
      });

      it('the search term should be highlighted in the field data', async function () {
        // marks is the style that highlights the text in yellow
        await PageObjects.discover.clickFieldListItemAdd('extension');
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be.greaterThan(0);
        expect(marks.indexOf('php')).to.be(0);
        await PageObjects.discover.clickFieldListItemRemove('extension');
      });

      it('search type:apache should show the correct hit count', async function () {
        const expectedHitCount = '11,156';
        await queryBar.setQuery('type:apache');
        await queryBar.submitQuery();
        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
        });
      });

      it('doc view should show @timestamp and Document columns', async function () {
        const Docheader = await PageObjects.discover.getDocHeader();
        expect(Docheader).to.contain('@timestamp');
        expect(Docheader).to.contain('Document');
      });

      it('a bad syntax query should show an error message', async function () {
        const expectedError =
          'Expected ":", "<", "<=", ">", ">=", AND, OR, end of input, ' +
          'whitespace but "(" found.';
        await queryBar.setQuery('xxx(yyy))');
        await queryBar.submitQuery();
        const { message } = await toasts.getErrorToast();
        expect(message).to.contain(expectedError);
        await toasts.dismissToast();
      });

      it('shows top-level object keys', async function () {
        await queryBar.setQuery('election');
        await queryBar.submitQuery();
        const currentUrl = await browser.getCurrentUrl();
        const [, hash] = currentUrl.split('#/');
        await PageObjects.common.navigateToUrl(
          'discover',
          hash.replace('columns:!()', 'columns:!(relatedContent)'),
          { useActualUrl: true }
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function tryingForTime() {
          expect(await PageObjects.discover.getDocHeader()).to.contain('relatedContent');

          const field = await PageObjects.discover.getDocTableIndex(1);
          expect(field).to.contain('relatedContent.url');
        });

        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be.above(0);
        expect(marks).to.contain('election');
      });

      describe('legacy table tests', async function () {
        before(async function () {
          await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
          await PageObjects.common.navigateToApp('discover');
        });

        after(async function () {
          await kibanaServer.uiSettings.replace({});
        });

        it('doc view should sort ascending', async function () {
          const expectedTimeStamp = 'Sep 20, 2015 @ 00:00:00.000';
          await testSubjects.click('docTableHeaderFieldSort_@timestamp');

          // we don't technically need this sleep here because the tryForTime will retry and the
          // results will match on the 2nd or 3rd attempt, but that debug output is huge in this
          // case and it can be avoided with just a few seconds sleep.
          await PageObjects.common.sleep(2000);
          await retry.try(async function tryingForTime() {
            const row = await find.byCssSelector(`tr.kbnDocTable__row:nth-child(1)`);
            const rowData = await row.getVisibleText();

            expect(rowData.startsWith(expectedTimeStamp)).to.be.ok();
          });
        });
      });
    });
  });
}
