/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const FOOTER_SELECTOR = 'discoverTableFooter';
const LOAD_MORE_SELECTOR = 'dscGridSampleSizeFetchMoreLink';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');

  describe('discover data grid footer', function describeIndexTests() {
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
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
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
      await PageObjects.discover.waitUntilSearchingHasFinished();

      // more pages appeared and the footer is gone
      await retry.try(async function () {
        await testSubjects.missingOrFail(FOOTER_SELECTOR);
      });
      await testSubjects.exists('pagination-button-5');
    });

    it('should disable "Load more" button when refresh interval is on', async () => {
      // go to the last page
      await testSubjects.click('pagination-button-4');
      await retry.try(async function () {
        await testSubjects.existOrFail(FOOTER_SELECTOR);
      });

      expect(await testSubjects.isEnabled(LOAD_MORE_SELECTOR)).to.be(true);

      // enable the refresh interval
      await PageObjects.timePicker.startAutoRefresh(10);

      // the button is disabled now
      await retry.waitFor('disabled state', async function () {
        return (await testSubjects.isEnabled(LOAD_MORE_SELECTOR)) === false;
      });

      // disable the refresh interval
      await PageObjects.timePicker.pauseAutoRefresh();

      // the button is enabled again
      await retry.waitFor('enabled state', async function () {
        return (await testSubjects.isEnabled(LOAD_MORE_SELECTOR)) === true;
      });
    });
  });
}
