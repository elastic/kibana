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
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const fieldEditor = getService('fieldEditor');
  const security = getService('security');
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
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  // FLAKY: https://github.com/elastic/kibana/issues/123372
  describe.skip('discover integration with runtime fields editor', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.clean({ types: ['saved-search'] });
    });

    it('allows adding custom label to existing fields', async function () {
      const customLabel = 'megabytes';
      await PageObjects.discover.editField('bytes');
      await fieldEditor.enableCustomLabel();
      await fieldEditor.setCustomLabel(customLabel);
      await fieldEditor.save();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes(customLabel)).to.be(true);
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      expect(await PageObjects.discover.getDocHeader()).to.have.string(customLabel);
    });

    it('allows creation of a new field', async function () {
      const field = '_runtimefield';
      await createRuntimeField(field);
      await retry.waitForWithTimeout('fieldNames to include runtimefield', 5000, async () => {
        const fieldNames = await PageObjects.discover.getAllFieldNames();
        return fieldNames.includes(field);
      });
    });

    it('allows editing of a newly created field', async function () {
      const field = '_runtimefield-before-edit';
      await createRuntimeField(field);
      const newFieldName = '_runtimefield-after-edit';
      await PageObjects.discover.editField(field);
      await fieldEditor.setName(newFieldName, true);
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitForWithTimeout('fieldNames to include edits', 5000, async () => {
        const fieldNames = await PageObjects.discover.getAllFieldNames();
        return fieldNames.includes(newFieldName);
      });
    });

    it('allows creation of a new field and use it in a saved search', async function () {
      const fieldName = '_runtimefield-saved-search';
      await createRuntimeField(fieldName);
      await PageObjects.discover.clickFieldListItemAdd(fieldName);
      expect(await PageObjects.discover.getDocHeader()).to.have.string(fieldName);
      expect(await PageObjects.discover.saveSearch('Saved Search with runtimefield'));
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.loadSavedSearch('Saved Search with runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.getDocHeader()).to.have.string(fieldName);
    });

    it('deletes a runtime field', async function () {
      const fieldName = '_runtimefield-to-delete';
      await createRuntimeField(fieldName);
      await PageObjects.discover.removeField(fieldName);
      await fieldEditor.confirmDelete();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitForWithTimeout('fieldNames to include edits', 5000, async () => {
        const fieldNames = await PageObjects.discover.getAllFieldNames();
        return !fieldNames.includes(fieldName);
      });
    });

    it('doc view includes runtime fields', async function () {
      // navigate to doc view
      const fieldName = '_runtimefield-doc-view';
      await createRuntimeField(fieldName);
      const table = await PageObjects.discover.getDocTable();
      const useLegacyTable = await PageObjects.discover.useLegacyTable();
      await table.clickRowToggle();

      // click the open action
      await retry.try(async () => {
        const rowActions = await table.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        const idxToClick = useLegacyTable ? 1 : 0;
        await rowActions[idxToClick].click();
      });

      await retry.waitForWithTimeout(
        'doc viewer is displayed with runtime field',
        5000,
        async () => {
          const hasDocHit = await testSubjects.exists('doc-hit');
          if (!hasDocHit) {
            // Maybe loading has not completed
            throw new Error('test subject doc-hit is not yet displayed');
          }
          const runtimeFieldsRow = await testSubjects.exists(`tableDocViewRow-${fieldName}-value`);
          return hasDocHit && runtimeFieldsRow;
        }
      );
    });
  });
}
