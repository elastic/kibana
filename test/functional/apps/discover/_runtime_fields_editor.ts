/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from './ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const fieldEditor = getService('fieldEditor');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:searchFieldsFromSource': false,
  };

  const createRuntimeField = async (fieldName: string) => {
    await PageObjects.discover.clickIndexPatternActions();
    await PageObjects.discover.clickAddNewField();
    await fieldEditor.setName(fieldName);
    await fieldEditor.enableValue();
    await fieldEditor.typeScript("emit('abc')");
    await fieldEditor.save();
  };

  // FLAKY: https://github.com/elastic/kibana/issues/97864
  describe.skip('discover integration with runtime fields editor', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ 'discover:searchFieldsFromSource': true });
    });

    it('allows adding custom label to existing fields', async function () {
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.editField('bytes');
      await fieldEditor.enableCustomLabel();
      await fieldEditor.setCustomLabel('megabytes');
      await fieldEditor.save();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.getDocHeader()).to.have.string('megabytes');
      expect((await PageObjects.discover.getAllFieldNames()).includes('megabytes')).to.be(true);
    });

    it('allows creation of a new field', async function () {
      await createRuntimeField('runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield')).to.be(true);
    });

    it('allows editing of a newly created field', async function () {
      await PageObjects.discover.editField('runtimefield');
      await fieldEditor.setName('runtimefield edited');
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield')).to.be(false);
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield edited')).to.be(
        true
      );
    });

    it('allows creation of a new field and use it in a saved search', async function () {
      await createRuntimeField('discover runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.clickFieldListItemAdd('discover runtimefield');
      expect(await PageObjects.discover.getDocHeader()).to.have.string('discover runtimefield');
      expect(await PageObjects.discover.saveSearch('Saved Search with runtimefield'));
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.loadSavedSearch('Saved Search with runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.getDocHeader()).to.have.string('discover runtimefield');
    });

    it('deletes a runtime field', async function () {
      await createRuntimeField('delete');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.removeField('delete');
      await fieldEditor.confirmDelete();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes('delete')).to.be(false);
    });

    it('doc view includes runtime fields', async function () {
      // navigate to doc view
      await dataGrid.clickRowToggle();

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[0].click();
      });

      const hasDocHit = await testSubjects.exists('doc-hit');
      expect(hasDocHit).to.be(true);
      const runtimeFieldsRow = await testSubjects.exists('tableDocViewRow-discover runtimefield');
      expect(runtimeFieldsRow).to.be(true);
    });
  });
}
