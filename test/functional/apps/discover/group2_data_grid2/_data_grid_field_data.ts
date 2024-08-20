/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'discover',
    'visualize',
    'timePicker',
    'unifiedFieldList',
  ]);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const dataGrid = getService('dataGrid');
  const security = getService('security');

  describe('discover data grid field data tests', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
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
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be.greaterThan(0);
        expect(marks.indexOf('php')).to.be(0);
        await PageObjects.unifiedFieldList.clickFieldListItemRemove('extension');
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

      it('doc view should show @timestamp and _source columns', async function () {
        const expectedHeader = '@timestamp Document';
        const DocHeader = await dataGrid.getHeaderFields();
        expect(DocHeader.join(' ')).to.be(expectedHeader);
      });

      it('doc view should sort ascending', async function () {
        const expectedTimeStamp = 'Sep 20, 2015 @ 00:00:00.000';
        await dataGrid.clickDocSortAsc();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.waitFor('first cell contains expected timestamp', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const text = await cell.getVisibleText();
          return text === expectedTimeStamp;
        });
      });

      it('a bad syntax query should show an error message', async function () {
        const expectedError =
          'Expected ":", "<", "<=", ">", ">=", AND, OR, end of input, ' +
          'whitespace but "(" found.';
        await queryBar.setQuery('xxx(yyy))');
        await queryBar.submitQuery();
        await PageObjects.discover.showsErrorCallout();
        const message = await PageObjects.discover.getDiscoverErrorMessage();
        expect(message).to.contain(expectedError);
      });
    });
  });
}
