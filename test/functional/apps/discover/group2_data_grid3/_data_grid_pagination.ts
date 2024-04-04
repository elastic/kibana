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
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:rowHeightOption': 0, // single line
  };
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');

  describe('discover data grid pagination', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await browser.setWindowSize(1200, 2000);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.clean({ types: ['search'] });
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should show pagination', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
      // pagination is present
      await testSubjects.existOrFail('pagination-button-0'); // first page
      await testSubjects.existOrFail('pagination-button-4'); // last page
      await testSubjects.missingOrFail('pagination-button-5');
    });

    it('should show footer only for the last page', async () => {
      // footer is not shown
      await testSubjects.missingOrFail('unifiedDataTableFooter');
      // go to next page
      await testSubjects.click('pagination-button-next');
      // footer is not shown yet
      await retry.try(async function () {
        await testSubjects.missingOrFail('unifiedDataTableFooter');
      });
      // go to the last page
      await testSubjects.click('pagination-button-4');
      // footer is shown now
      await retry.try(async function () {
        await testSubjects.existOrFail('unifiedDataTableFooter');
      });
    });

    it('should update pagination when rows per page is changed', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
      await testSubjects.existOrFail('pagination-button-0'); // first page
      await testSubjects.existOrFail('pagination-button-4'); // last page
      await testSubjects.click('tablePaginationPopoverButton');
      await retry.try(async function () {
        return testSubjects.exists('tablePagination-500-rows');
      });
      await testSubjects.click('tablePagination-500-rows');
      await retry.try(async function () {
        return !testSubjects.exists('pagination-button-1'); // only page 0 is left
      });
      await testSubjects.existOrFail('unifiedDataTableFooter');
    });

    it('should render exact number of rows which where configured in the saved search or in settings', async () => {
      await kibanaServer.uiSettings.update({
        ...defaultSettings,
        'discover:sampleSize': 12,
        'discover:sampleRowsPerPage': 6,
        hideAnnouncements: true,
      });

      // first render is based on settings value
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(6);
      await dataGrid.checkCurrentRowsPerPageToBe(6);

      // now we change it via popover
      await dataGrid.changeRowsPerPageTo(10);

      // save as a new search
      const savedSearchTitle = 'search with saved rowsPerPage';
      await PageObjects.discover.saveSearch(savedSearchTitle);

      // start a new search session
      await testSubjects.click('discoverNewButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(6); // as in settings
      await dataGrid.checkCurrentRowsPerPageToBe(6);

      // open the saved search
      await PageObjects.discover.loadSavedSearch(savedSearchTitle);
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(10); // as in the saved search
      await dataGrid.checkCurrentRowsPerPageToBe(10);
    });
  });
}
