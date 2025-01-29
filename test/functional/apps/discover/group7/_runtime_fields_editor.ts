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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const fieldEditor = getService('fieldEditor');
  const security = getService('security');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  const createRuntimeField = async (fieldName: string) => {
    await dataViews.clickAddFieldFromSearchBar();
    await fieldEditor.setName(fieldName);
    await fieldEditor.enableValue();
    await fieldEditor.typeScript("emit('abc')");
    await fieldEditor.save();
    await fieldEditor.waitUntilClosed();
    await header.waitUntilLoadingHasFinished();
  };

  describe('discover integration with runtime fields editor', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('allows adding custom label to existing fields', async function () {
      const customLabel = 'megabytes';
      await discover.editField('bytes');
      await fieldEditor.enableCustomLabel();
      await fieldEditor.setCustomLabel(customLabel);
      await fieldEditor.save();
      await fieldEditor.waitUntilClosed();
      await header.waitUntilLoadingHasFinished();
      expect((await unifiedFieldList.getAllFieldNames()).includes(customLabel)).to.be(true);
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      expect(await discover.getDocHeader()).to.have.string(customLabel);
    });

    it('allows adding custom description to existing fields', async function () {
      const customDescription = 'custom agent description here';
      const customDescription2 = `${customDescription} updated`;
      // set a custom description
      await discover.editField('agent');
      await fieldEditor.enableCustomDescription();
      await fieldEditor.setCustomDescription(customDescription);
      await fieldEditor.save();
      await fieldEditor.waitUntilClosed();
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.clickFieldListItem('agent');
      await retry.waitFor('field popover text', async () => {
        return (await testSubjects.getVisibleText('fieldDescription-agent')) === customDescription;
      });
      await unifiedFieldList.clickFieldListItemToggle('agent');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      // edit the custom description again
      await discover.editField('agent');
      await fieldEditor.enableCustomDescription();
      await fieldEditor.setCustomDescription(customDescription2);
      await fieldEditor.save();
      await fieldEditor.waitUntilClosed();
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.clickFieldListItem('agent');
      await retry.waitFor('field popover text', async () => {
        return (await testSubjects.getVisibleText('fieldDescription-agent')) === customDescription2;
      });
      await unifiedFieldList.clickFieldListItemToggle('agent');

      // check it in the doc viewer too
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      await dataGrid.expandFieldNameCellInFlyout('agent');
      await retry.waitFor('doc viewer popover text', async () => {
        return (await testSubjects.getVisibleText('fieldDescription-agent')) === customDescription2;
      });

      await dataGrid.closeFlyout();
    });

    it('allows to replace ECS description with a custom field description', async function () {
      await unifiedFieldList.clickFieldListItem('@timestamp');
      await retry.waitFor('field popover text', async () => {
        return (await testSubjects.getVisibleText('fieldDescription-@timestamp')).startsWith(
          'Date'
        );
      });
      await unifiedFieldList.closeFieldPopover();
      // check it in the doc viewer too
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      await dataGrid.expandFieldNameCellInFlyout('@timestamp');
      await retry.waitFor('doc viewer popover text', async () => {
        return (await testSubjects.getVisibleText('fieldDescription-@timestamp')).startsWith(
          'Date'
        );
      });
      await dataGrid.closeFlyout();

      const customDescription = 'custom @timestamp description here';
      // set a custom description
      await discover.editField('@timestamp');
      await fieldEditor.enableCustomDescription();
      await fieldEditor.setCustomDescription(customDescription);
      await fieldEditor.save();
      await fieldEditor.waitUntilClosed();
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.clickFieldListItem('@timestamp');
      await retry.waitFor('field popover text', async () => {
        return (
          (await testSubjects.getVisibleText('fieldDescription-@timestamp')) === customDescription
        );
      });
      await unifiedFieldList.closeFieldPopover();
      // check it in the doc viewer too
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      await dataGrid.expandFieldNameCellInFlyout('@timestamp');
      await retry.waitFor('doc viewer popover text', async () => {
        return (
          (await testSubjects.getVisibleText('fieldDescription-@timestamp')) === customDescription
        );
      });

      await dataGrid.closeFlyout();
    });

    it('should show a validation error when adding a too long custom description to existing fields', async function () {
      const customDescription = 'custom bytes long description here'.repeat(10);
      // set a custom description
      await discover.editField('bytes');
      await fieldEditor.enableCustomDescription();
      await fieldEditor.setCustomDescription(customDescription);
      await fieldEditor.save();
      expect(await fieldEditor.getFormError()).to.contain(
        'The length of the description is too long. The maximum length is 300 characters.'
      );
      await fieldEditor.closeFlyoutAndDiscardChanges();
    });

    it('allows creation of a new field', async function () {
      const field = '_runtimefield';
      await createRuntimeField(field);

      await header.waitUntilLoadingHasFinished();
      await discover.waitForDocTableLoadingComplete();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await retry.waitFor('fieldNames to include runtimefield', async () => {
        const fieldNames = await unifiedFieldList.getAllFieldNames();
        return fieldNames.includes(field);
      });
    });

    it('allows editing of a newly created field', async function () {
      const field = '_runtimefield-before-edit';
      await createRuntimeField(field);
      const newFieldName = '_runtimefield-after-edit';
      await discover.editField(field);
      await fieldEditor.setName(newFieldName, true);
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await fieldEditor.waitUntilClosed();
      await header.waitUntilLoadingHasFinished();
      await discover.waitForDocTableLoadingComplete();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await retry.waitForWithTimeout('fieldNames to include edits', 5000, async () => {
        const fieldNames = await unifiedFieldList.getAllFieldNames();
        return fieldNames.includes(newFieldName);
      });
    });

    it('allows creation of a new field and use it in a saved search', async function () {
      const fieldName = '_runtimefield-saved-search';
      await createRuntimeField(fieldName);
      await unifiedFieldList.clickFieldListItemAdd(fieldName);
      expect(await discover.getDocHeader()).to.have.string(fieldName);
      expect(await discover.saveSearch('Saved Search with runtimefield'));
      await header.waitUntilLoadingHasFinished();

      await discover.clickNewSearchButton();
      await header.waitUntilLoadingHasFinished();

      await discover.loadSavedSearch('Saved Search with runtimefield');
      await header.waitUntilLoadingHasFinished();
      expect(await discover.getDocHeader()).to.have.string(fieldName);
    });

    it('deletes a runtime field', async function () {
      const fieldName = '_runtimefield-to-delete';
      await createRuntimeField(fieldName);
      await discover.removeField(fieldName);
      await header.waitUntilLoadingHasFinished();
      await retry.waitForWithTimeout('fieldNames to include edits', 5000, async () => {
        const fieldNames = await unifiedFieldList.getAllFieldNames();
        return !fieldNames.includes(fieldName);
      });
    });

    it('doc view includes runtime fields', async function () {
      // navigate to doc view
      const fieldName = '_runtimefield-doc-view';
      await createRuntimeField(fieldName);
      await dataGrid.clickRowToggle();

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        const idxToClick = 0;
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
