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
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('discover data grid pagination', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
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
      await testSubjects.missingOrFail('discoverTableFooter');
      // go to next page
      await testSubjects.click('pagination-button-next');
      // footer is not shown yet
      await retry.try(async function () {
        await testSubjects.missingOrFail('discoverTableFooter');
      });
      // go to the last page
      await testSubjects.click('pagination-button-4');
      // footer is shown now
      await retry.try(async function () {
        await testSubjects.existOrFail('discoverTableFooter');
        await testSubjects.existOrFail('discoverTableSampleSizeSettingsLink');
      });
    });
  });
}
