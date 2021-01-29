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
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context']);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  describe('doc link in discover', function contextSize() {
    beforeEach(async function () {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('discover');
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

      const hasDocHit = await testSubjects.exists('doc-hit');
      expect(hasDocHit).to.be(true);
    });

    // no longer relevant as null field won't be returned in the Fields API response
    xit('add filter should create an exists filter if value is null (#7189)', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // Filter special document
      await filterBar.addFilter('agent', 'is', 'Missing/Fields');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        // navigate to the doc view
        await docTable.clickRowToggle({ rowIndex: 0 });

        const details = await docTable.getDetailsRow();
        await docTable.addInclusiveFilter(details, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        const hasInclusiveFilter = await filterBar.hasFilter(
          'referer',
          'exists',
          true,
          false,
          true
        );
        expect(hasInclusiveFilter).to.be(true);

        await docTable.removeInclusiveFilter(details, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const hasExcludeFilter = await filterBar.hasFilter('referer', 'exists', true, false, false);
        expect(hasExcludeFilter).to.be(true);
      });
    });
  });
}
