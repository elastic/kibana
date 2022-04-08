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
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context']);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  describe('classic table doc link', function contextSize() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
        'doc_table:legacy': true,
        'discover:searchFieldsFromSource': true,
      });
    });
    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitForDocTableLoadingComplete();
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitForDocTableLoadingComplete();
    });

    it('should open the doc view of the selected document', async function () {
      // navigate to the doc view
      await docTable.clickRowToggle({ rowIndex: 0 });

      // click the open action
      await retry.try(async () => {
        const rowActions = await docTable.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[1].click();
      });

      await retry.waitFor('hit loaded', async () => {
        const hasDocHit = await testSubjects.exists('doc-hit');
        return !!hasDocHit;
      });
    });

    it('should create an exists filter from the doc view of the selected document', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await docTable.clickRowToggle({ rowIndex: 0 });

      await testSubjects.click('addExistsFilterButton-@timestamp');

      const hasExistsFilter = await filterBar.hasFilter('@timestamp', 'exists', true, false, false);
      expect(hasExistsFilter).to.be(true);
    });
  });
}
