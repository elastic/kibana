/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'visualize', 'timePicker']);
  const defaultSettings = { defaultIndex: 'logstash-*', 'doc_table:legacy': false };
  const dataGrid = getService('dataGrid');

  describe('discover data grid field data tests', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async function () {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
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
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be(50);
        expect(marks.indexOf('php')).to.be(0);
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

      it('doc view should show Time and _source columns', async function () {
        const expectedHeader = 'Time (@timestamp) _source';
        const DocHeader = await dataGrid.getHeaderFields();
        expect(DocHeader.join(' ')).to.be(expectedHeader);
      });

      it('doc view should sort ascending', async function () {
        const expectedTimeStamp = 'Sep 20, 2015 @ 00:00:00.000';
        await dataGrid.clickDocSortAsc();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.try(async function tryingForTime() {
          const rowData = await dataGrid.getFields();
          expect(rowData[0][0].startsWith(expectedTimeStamp)).to.be.ok();
        });
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
    });
  });
}
