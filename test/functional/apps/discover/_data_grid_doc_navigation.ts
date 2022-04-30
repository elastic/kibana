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
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context']);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const defaultSettings = { defaultIndex: 'logstash-*', 'doc_table:legacy': false };

  describe('discover data grid doc link', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });

    it('should open the doc view of the selected document', async function () {
      // navigate to the doc view
      await dataGrid.clickRowToggle({ rowIndex: 0 });

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[0].click();
      });

      await retry.waitFor('hit loaded', async () => {
        const hasDocHit = await testSubjects.exists('doc-hit');
        return !!hasDocHit;
      });
    });

    // no longer relevant as null field won't be returned in the Fields API response
    xit('add filter should create an exists filter if value is null (#7189)', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // Filter special document
      await filterBar.addFilter('agent', 'is', 'Missing/Fields');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        // navigate to the doc view
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        const details = await dataGrid.getDetailsRow();
        await dataGrid.addInclusiveFilter(details, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        const hasInclusiveFilter = await filterBar.hasFilter(
          'referer',
          'exists',
          true,
          false,
          true
        );
        expect(hasInclusiveFilter).to.be(true);

        await dataGrid.clickRowToggle({ rowIndex: 0 });
        const detailsExcluding = await dataGrid.getDetailsRow();
        await dataGrid.removeInclusiveFilter(detailsExcluding, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const hasExcludeFilter = await filterBar.hasFilter('referer', 'exists', true, false, false);
        expect(hasExcludeFilter).to.be(true);
      });
    });
  });
}
