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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const { common, discover, timePicker, header, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');
  const browser = getService('browser');

  describe('discover doc viewer', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await browser.setWindowSize(1600, 1200);
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        hideAnnouncements: true,
      });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('search', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();
      });

      it('should be able to search by string', async function () {
        await discover.findFieldByNameOrValueInDocViewer('geo');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await discover.findFieldByNameOrValueInDocViewer('.sr');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search by wildcard', async function () {
        await discover.findFieldByNameOrValueInDocViewer('relatedContent*image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search with spaces as wildcard', async function () {
        await discover.findFieldByNameOrValueInDocViewer('relatedContent image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });
      });

      it('should be able to search with fuzzy search (1 typo)', async function () {
        await discover.findFieldByNameOrValueInDocViewer('rel4tedContent.art');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 3;
        });
      });

      it('should ignore empty search', async function () {
        await discover.findFieldByNameOrValueInDocViewer('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await retry.waitFor('all items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      it('should be able to search by field value', async function () {
        await discover.findFieldByNameOrValueInDocViewer('time');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 5;
        });
      });

      it('should be able to search by field raw value', async function () {
        await discover.findFieldByNameOrValueInDocViewer('2015-09-22T23:50:13.253Z');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 3;
        });
      });
    });

    describe('filter by field type', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await discover.openFilterByFieldTypeInDocViewer();
        expect(await find.allByCssSelector('[data-test-subj*="typeFilter"]')).to.have.length(6);
        await discover.closeFilterByFieldTypeInDocViewer();
      });

      it('should filter by field type', async function () {
        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;

        await discover.openFilterByFieldTypeInDocViewer();

        await testSubjects.click('typeFilter-date');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await testSubjects.click('typeFilter-number');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 7;
        });

        await testSubjects.click('unifiedDocViewerFieldsTableFieldTypeFilterClearAll');

        await retry.waitFor('reset', async () => {
          return (
            (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === initialFieldsCount
          );
        });
      });

      it('should show filters by type in ES|QL view', async function () {
        await discover.selectTextBaseLang();

        const testQuery = `from logstash-* | limit 10000`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });

        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;
        const numberFieldsCount = 6;

        expect(initialFieldsCount).to.above(numberFieldsCount);

        const pinnedFieldsCount = 1;
        await dataGrid.togglePinActionInFlyout('agent');

        await discover.openFilterByFieldTypeInDocViewer();
        expect(await find.allByCssSelector('[data-test-subj*="typeFilter"]')).to.have.length(6);

        await testSubjects.click('typeFilter-number');

        await retry.waitFor('updates', async () => {
          return (
            (await find.allByCssSelector('.kbnDocViewer__fieldName')).length ===
            numberFieldsCount + pinnedFieldsCount
          );
        });
      });
    });

    describe('hide null values switch - ES|QL mode', function () {
      beforeEach(async () => {
        await discover.selectTextBaseLang();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | sort @timestamp | limit 10000';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click(); // clear search
        const hideNullValuesSwitch = await testSubjects.find(
          'unifiedDocViewerHideNullValuesSwitch'
        );
        await hideNullValuesSwitch.click(); // make sure the switch is off
      });

      it('should hide fields with null values ', async function () {
        await discover.findFieldByNameOrValueInDocViewer('machine');
        const results = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;
        const hideNullValuesSwitch = await testSubjects.find(
          'unifiedDocViewerHideNullValuesSwitch'
        );
        await hideNullValuesSwitch.click();

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length < results;
        });
      });
    });

    describe('show only selected fields in ES|QL mode', function () {
      beforeEach(async () => {
        await discover.selectTextBaseLang();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
      });

      it('should disable the switch when no fields are selected', async function () {
        const testQuery = 'from logstash-* | sort @timestamp | limit 10';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be('true');

        const fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        const fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(
          fieldNames.join(',').startsWith('@message,@tags,@timestamp,agent,bytes,clientip')
        ).to.be(true);
      });

      it('should allow toggling the switch', async function () {
        const testQuery = 'from logstash-* | sort @timestamp | limit 10';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItemAdd('agent.raw');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('agent');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be(null);

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(
          fieldNames.join(',').startsWith('@message,@tags,@timestamp,agent,bytes,clientip')
        ).to.be(true);

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching to show only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'agent.raw,agent';
        });

        await dataGrid.togglePinActionInFlyout('agent');

        await retry.waitFor('updates after pinning the last field', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'agent,agent.raw';
        });

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching from showing only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',').startsWith('agent,@message,@tags');
        });
      });
    });

    describe('show only selected fields in data view mode', function () {
      it('should disable the switch when no fields are selected', async function () {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be('true');

        const fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        const fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);
      });

      it('should allow toggling the switch', async function () {
        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('@tags');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be(null);

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching to show only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === '@timestamp,bytes,@tags';
        });

        await dataGrid.togglePinActionInFlyout('bytes');

        await retry.waitFor('updates after pinning the last field', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'bytes,@timestamp,@tags';
        });

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching from showing only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',').startsWith('bytes,_id,_ignored,_index,_score,@message');
        });
      });
    });

    describe('pinning fields', function () {
      it('should be able to pin and unpin fields', async function () {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(false);

        await dataGrid.togglePinActionInFlyout('agent');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(true);

        await dataGrid.togglePinActionInFlyout('@message');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('@message,agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('@message')).to.be(true);

        await dataGrid.togglePinActionInFlyout('@message');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('@message')).to.be(false);
      });
    });
  });
}
