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
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'header']);

  describe('index pattern with unmapped fields', () => {
    const unmappedFieldsSwitchSelector = 'unmappedFieldsSwitch';

    before(async () => {
      await esArchiver.loadIfNeeded('unmapped_fields');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'test-index-unmapped-fields',
        'discover:searchFieldsFromSource': false,
      });
      log.debug('discover');
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
      const fromTime = 'Jan 20, 2021 @ 00:00:00.000';
      const toTime = 'Jan 25, 2021 @ 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async () => {
      await esArchiver.unload('unmapped_fields');
    });

    it('unmapped fields exist on a new saved search', async () => {
      const expectedHitCount = '4';
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
      const allFields = await PageObjects.discover.getAllFieldNames();
      // message is a mapped field
      expect(allFields.includes('message')).to.be(true);
      // sender is not a mapped field

      expect(allFields.includes('sender')).to.be(true);

      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.existOrFail('filterSelectionPanel');
      await testSubjects.existOrFail('unmappedFieldsSwitch');
      await PageObjects.discover.closeSidebarFieldFilter();
    });

    it('unmapped fields display in field list from an existing saved search', async () => {
      await PageObjects.discover.loadSavedSearch('Existing Saved Search');
      const expectedHitCount = '4';
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
      const allFields = await PageObjects.discover.getAllFieldNames();
      expect(allFields.includes('message')).to.be(true);
      expect(allFields.includes('sender')).to.be(true);
      expect(allFields.includes('receiver')).to.be(true);
    });

    it('unmapped fields toggle exists on an existing saved search', async () => {
      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.existOrFail('filterSelectionPanel');
      await testSubjects.existOrFail(unmappedFieldsSwitchSelector);
      expect(await testSubjects.isEuiSwitchChecked(unmappedFieldsSwitchSelector)).to.be(true);
      await PageObjects.discover.closeSidebarFieldFilter();
    });

    it('switching unmapped fields toggle off hides unmapped fields', async () => {
      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.setEuiSwitch(unmappedFieldsSwitchSelector, 'uncheck');
      await PageObjects.discover.closeSidebarFieldFilter();
      const allFields = await PageObjects.discover.getAllFieldNames();
      expect(allFields.includes('message')).to.be(true);
      expect(allFields.includes('sender')).to.be(false);
      expect(allFields.includes('receiver')).to.be(false);
    });

    it('switching unmapped fields toggle off updates the summary rows', async () => {
      await retry.waitFor('doc table to contain the right search result', async () => {
        const rowData = await PageObjects.discover.getDocTableField(1, 1);
        log.debug(`The row value: ${rowData}`);
        return rowData.includes('receiver');
      });

      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.setEuiSwitch(unmappedFieldsSwitchSelector, 'uncheck');
      await PageObjects.discover.closeSidebarFieldFilter();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('doc table to contain the right search result', async () => {
        const rowData = await PageObjects.discover.getDocTableField(1, 1);
        log.debug(`The row value: ${rowData}`);
        return !rowData.includes('receiver');
      });
    });

    it('persists the unmapped state after save', async () => {
      await PageObjects.discover.loadSavedSearch('Existing Saved Search');

      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.setEuiSwitch(unmappedFieldsSwitchSelector, 'uncheck');
      await PageObjects.discover.closeSidebarFieldFilter();

      await PageObjects.discover.saveSearch('Existing Saved Search');

      await PageObjects.common.navigateToApp('home');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.discover.loadSavedSearch('Existing Saved Search');

      await PageObjects.discover.openSidebarFieldFilter();
      expect(await testSubjects.isEuiSwitchChecked(unmappedFieldsSwitchSelector)).to.be(false);
    });

    // This must be the last test in the file because it changes the configuration
    it('unmapped fields toggle does not exist on search with _source', async () => {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'test-index-unmapped-fields',
        'discover:searchFieldsFromSource': true,
      });
      const fromTime = 'Jan 20, 2021 @ 00:00:00.000';
      const toTime = 'Jan 25, 2021 @ 00:00:00.000';
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.openSidebarFieldFilter();
      await testSubjects.existOrFail('filterSelectionPanel');
      await testSubjects.missingOrFail('unmappedFieldsSwitch');
    });
  });
}
