/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const FOOTER_SELECTOR = 'unifiedDataTableFooter';
const LOAD_MORE_SELECTOR = 'dscGridSampleSizeFetchMoreLink';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const { common, discover, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');

  describe('discover data grid footer', function () {
    describe('time field with date type', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      });

      after(async () => {
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
        await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.uiSettings.replace({});
      });

      beforeEach(async function () {
        await timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await common.navigateToApp('discover');
        await discover.waitUntilSearchingHasFinished();
      });

      it('should show footer only for the last page and allow to load more', async () => {
        // footer is not shown
        await testSubjects.missingOrFail(FOOTER_SELECTOR);

        // go to next page
        await testSubjects.click('pagination-button-next');
        // footer is not shown yet
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        // go to the last page
        await testSubjects.click('pagination-button-4');
        // footer is shown now
        await retry.try(async function () {
          await testSubjects.existOrFail(FOOTER_SELECTOR);
        });
        expect(await testSubjects.getVisibleText(FOOTER_SELECTOR)).to.be(
          'Search results are limited to 500 documents.\nLoad more'
        );

        // there is no other pages to see
        await testSubjects.missingOrFail('pagination-button-5');

        // press "Load more"
        await testSubjects.click(LOAD_MORE_SELECTOR);
        await discover.waitUntilSearchingHasFinished();

        // more pages appeared and the footer is gone
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        // go to the last page
        await testSubjects.click('pagination-button-9');
        expect(await testSubjects.getVisibleText(FOOTER_SELECTOR)).to.be(
          'Search results are limited to 1,000 documents.\nLoad more'
        );

        // press "Load more"
        await testSubjects.click(LOAD_MORE_SELECTOR);
        await discover.waitUntilSearchingHasFinished();

        // more pages appeared and the footer is gone
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        // go to the last page
        await testSubjects.click('pagination-button-14');
        expect(await testSubjects.getVisibleText(FOOTER_SELECTOR)).to.be(
          'Search results are limited to 1,500 documents.\nLoad more'
        );
      });

      it('should disable "Load more" button when refresh interval is on', async () => {
        // go to the last page
        await testSubjects.click('pagination-button-4');
        await retry.try(async function () {
          await testSubjects.existOrFail(FOOTER_SELECTOR);
        });

        expect(await testSubjects.isEnabled(LOAD_MORE_SELECTOR)).to.be(true);

        // enable the refresh interval
        await timePicker.startAutoRefresh(10);

        // the button is disabled now
        await retry.waitFor('disabled state', async function () {
          return (await testSubjects.isEnabled(LOAD_MORE_SELECTOR)) === false;
        });

        // disable the refresh interval
        await timePicker.pauseAutoRefresh();

        // the button is enabled again
        await retry.waitFor('enabled state', async function () {
          return (await testSubjects.isEnabled(LOAD_MORE_SELECTOR)) === true;
        });
      });
    });

    describe('time field with date nano type', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'kibana_date_nanos']);
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/date_nanos');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/date_nanos');
      });

      after(async () => {
        await esArchiver.unload('test/functional/fixtures/es_archiver/date_nanos');
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/date_nanos');
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.uiSettings.replace({});
      });

      beforeEach(async function () {
        await common.setTime({
          from: 'Sep 10, 2015 @ 00:00:00.000',
          to: 'Sep 30, 2019 @ 00:00:00.000',
        });
        await kibanaServer.uiSettings.update({
          defaultIndex: 'date-nanos',
          'discover:sampleSize': 4,
          'discover:sampleRowsPerPage': 2,
        });
        await common.navigateToApp('discover');
        await discover.waitUntilSearchingHasFinished();
      });

      it('should work for date nanos too', async () => {
        await unifiedFieldList.clickFieldListItemAdd('_id');
        await discover.waitUntilSearchingHasFinished();

        expect(await dataGrid.getRowsText()).to.eql([
          'Sep 22, 2019 @ 23:50:13.253123345AU_x3-TaGFA8no6QjiSJ',
          'Sep 18, 2019 @ 06:50:13.000000104AU_x3-TaGFA8no6Qjis104Z',
        ]);

        // footer is not shown
        await testSubjects.missingOrFail(FOOTER_SELECTOR);

        // go to the last page
        await testSubjects.click('pagination-button-1');
        await retry.try(async function () {
          await testSubjects.existOrFail(FOOTER_SELECTOR);
        });
        expect(await testSubjects.getVisibleText(FOOTER_SELECTOR)).to.be(
          'Search results are limited to 4 documents.\nLoad more'
        );
        expect(await dataGrid.getRowsText()).to.eql([
          'Sep 18, 2019 @ 06:50:13.000000103BU_x3-TaGFA8no6Qjis103Z',
          'Sep 18, 2019 @ 06:50:13.000000102AU_x3-TaGFA8no6Qji102Z',
        ]);

        // there is no other pages to see yet
        await testSubjects.missingOrFail('pagination-button-2');

        // press "Load more"
        await testSubjects.click(LOAD_MORE_SELECTOR);
        await discover.waitUntilSearchingHasFinished();

        // more pages appeared and the footer is gone
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        // go to the last page
        await testSubjects.click('pagination-button-3');
        expect(await testSubjects.getVisibleText(FOOTER_SELECTOR)).to.be(
          'Search results are limited to 8 documents.\nLoad more'
        );

        expect(await dataGrid.getRowsText()).to.eql([
          'Sep 18, 2019 @ 06:50:13.000000000CU_x3-TaGFA8no6QjiSX000Z',
          'Sep 18, 2019 @ 06:50:12.999999999AU_x3-TaGFA8no6Qj999Z',
        ]);

        // press "Load more"
        await testSubjects.click(LOAD_MORE_SELECTOR);
        await discover.waitUntilSearchingHasFinished();

        // more pages appeared and the footer is gone
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        // go to the last page
        await testSubjects.click('pagination-button-4');
        await retry.try(async function () {
          await testSubjects.missingOrFail(FOOTER_SELECTOR);
        });

        expect(await dataGrid.getRowsText()).to.eql([
          'Sep 19, 2015 @ 06:50:13.000100001AU_x3-TaGFA8no000100001Z',
        ]);
      });
    });
  });
}
